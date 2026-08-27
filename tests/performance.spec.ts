import { expect, Page, test, WebSocketRoute } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const user = {
  CODIGO: 1,
  ATIVO: "SIM",
  NOME: "Operador de teste",
  LOGIN: "operador",
  WHATSAPP: "5551999999999",
  NIVEL: "ADMIN",
  SETOR: 1,
  SETOR_NOME: "Atendimento",
  NOME_EXIBICAO: "Operador",
  AVATAR_ID: null,
};

const chatCount = Number(process.env.PERF_CHAT_COUNT || "500");
const cpuRate = Number(process.env.PERF_CPU_RATE || "4");
const telemetryEnabled = process.env.PERF_TELEMETRY_ENABLED !== "false";
const performanceArtifactKey = `chats-${chatCount}-cpu-${cpuRate}-telemetry-${telemetryEnabled ? "on" : "off"}`;

const chats = Array.from({ length: chatCount }, (_, index) => {
  const id = index + 1;
  return {
    id,
    instance: "test",
    contactId: id,
    userId: 1,
    sectorId: 1,
    isFinished: false,
    startedAt: new Date(2026, 0, 1).toISOString(),
    contact: {
      id,
      name: `Contato ${id}`,
      phone: `555199${String(id).padStart(7, "0")}`,
      instance: "test",
      isBlocked: false,
      isOnlyAdmin: false,
    },
    customer: null,
    schedule: null,
    lastMessage: {
      id,
      chatId: id,
      contactId: id,
      body: `Resumo ${id}`,
      type: "chat",
      from: "contact:test",
      to: "me:test",
      status: "READ",
      timestamp: String(1_800_000_000_000 + id),
    },
    isUnread: false,
  };
});

function messages(chatId: number, start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, offset) => {
    const id = start + offset;
    return {
      id,
      chatId,
      contactId: chatId,
      body: `Mensagem ${id}`,
      type: "chat",
      from: "contact:test",
      to: "me:test",
      status: "READ",
      timestamp: String(1_800_000_000_000 + id),
      quotedId: null,
    };
  });
}

async function mockApis(page: Page) {
  const socket: { route?: WebSocketRoute; telemetryBatches: string[] } = {
    telemetryBatches: [],
  };
  await page.routeWebSocket(/localhost:8004/, (webSocket) => {
    socket.route = webSocket;
    webSocket.send(
      `0${JSON.stringify({ sid: "performance-test", upgrades: [], pingInterval: 20_000, pingTimeout: 20_000, maxPayload: 1_000_000 })}`,
    );
    webSocket.onMessage((message) => {
      const frame = String(message);
      if (frame === "2") webSocket.send("3");
      if (frame.startsWith("40")) webSocket.send('40{"sid":"performance-socket"}');
    });
  });

  await page.route("http://localhost:8001/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/session") {
      return route.fulfill({
        json: { data: { userId: 1, instance: "test", role: "ADMIN", sectorId: 1 } },
      });
    }
    if (path === "/api/users/1") return route.fulfill({ json: { data: user } });
    if (path === "/api/users/1/notification-preferences") {
      return route.fulfill({ status: 404, json: { message: "not configured" } });
    }
    if (path === "/api/users") {
      return route.fulfill({ json: { data: [user], page: { totalRows: 1 } } });
    }
    return route.fulfill({ json: { data: [] } });
  });

  await page.route("http://localhost:8002/**", (route) =>
    route.fulfill({ json: { data: [], page: { totalRows: 0 } } }),
  );

  await page.route("http://localhost:8005/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/api/whatsapp/frontend-performance/batches") {
      socket.telemetryBatches.push(route.request().postData() ?? "");
      return route.fulfill({ status: 202, json: { accepted: 1, duplicate: false } });
    }
    if (path === "/api/whatsapp/sectors") {
      return route.fulfill({
        json: { data: [{ id: 1, name: "Atendimento", defaultClientId: 1 }] },
      });
    }
    if (path === "/api/whatsapp/session/chats") {
      return route.fulfill({ json: { data: { chats, messages: [] } } });
    }
    if (path === "/api/whatsapp/sector/1/clients") {
      return route.fulfill({ json: { data: [{ id: 1, name: "Canal", type: "WWEBJS" }] } });
    }
    if (path === "/api/whatsapp/session/parameters") {
      return route.fulfill({
        json: {
          parameters: {
            feature_frontend_performance_telemetry_enabled: String(telemetryEnabled),
            feature_perf_paginated_chat_history_enabled: "true",
            feature_perf_stable_socket_listeners_enabled: "true",
            feature_perf_virtualized_chat_list_enabled: "true",
          },
        },
      });
    }
    if (path === "/api/whatsapp/contacts") return route.fulfill({ json: { data: [] } });
    if (path === "/api/internal/session/chats") {
      return route.fulfill({ json: { data: { chats: [], messages: [] } } });
    }
    if (/^\/api\/whatsapp\/chats\/\d+\/messages$/.test(path)) {
      const chatId = Number(path.split("/")[4]);
      const beforeId = Number(url.searchParams.get("beforeId"));
      const pageMessages = beforeId ? messages(chatId, 1, 50) : messages(chatId, 51, 100);
      return route.fulfill({
        json: {
          data: {
            messages: pageMessages,
            quotedMessages: [],
            nextCursor: beforeId ? null : 51,
          },
        },
      });
    }
    if (path === "/api/whatsapp/notifications") {
      return route.fulfill({ json: { data: [], totalCount: 0 } });
    }
    return route.fulfill({ json: { data: [] } });
  });

  return socket;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("@inpulse/test/token", "test-token");
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, get: () => 4 });
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, get: () => 4 });
  });
});

test(`virtualiza ${chatCount} conversas e preserva o comportamento do Carregar mais`, async ({
  page,
}) => {
  await mockApis(page);
  await page.goto("/test");
  const items = page.getByTestId("chat-menu-item");
  await expect(items.first()).toBeVisible({ timeout: 15_000 });

  expect(await items.count()).toBeLessThanOrEqual(80);

  await items.first().click();
  await expect(page.getByText("Mensagem 100")).toBeVisible();

  const messageScroller = page.locator(".scrollbar-whatsapp").last();
  const loadMore = page.getByRole("button", { name: "Carregar mais" });
  await loadMore.click();
  await loadMore.click();
  await expect(page.getByText("Mensagem 1", { exact: true })).toBeVisible();
  expect(await messageScroller.evaluate((element) => element.scrollHeight)).toBeGreaterThan(0);
});

test(`mantém evento-render p95 abaixo de 200 ms sob CPU ${cpuRate}x com telemetria ${telemetryEnabled ? "on" : "off"}`, async ({
  page,
}) => {
  const socket = await mockApis(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 100,
    downloadThroughput: (1_600_000 / 8) * 0.9,
    uploadThroughput: (750_000 / 8) * 0.9,
    connectionType: "cellular3g",
  });
  await page.addInitScript(() => {
    const metrics = window as typeof window & {
      __longTasks?: number[];
      __longTaskStarts?: number[];
      __longTaskObserver?: PerformanceObserver;
    };
    metrics.__longTasks = [];
    metrics.__longTaskStarts = [];
    try {
      metrics.__longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          metrics.__longTasks?.push(entry.duration);
          metrics.__longTaskStarts?.push(entry.startTime);
        }
      });
      metrics.__longTaskObserver.observe({ type: "longtask" });
    } catch {
      // Long tasks are not available in every Chromium build.
    }
  });
  await page.goto("/test");
  const items = page.getByTestId("chat-menu-item");
  await expect(items.first()).toBeVisible({ timeout: 15_000 });
  const startupDuration = await page.evaluate(() => performance.now());
  await items.first().click();
  await expect(page.getByText("Mensagem 100")).toBeVisible();
  await expect.poll(() => !!socket.route).toBe(true);

  const burstStartedAt = await page.evaluate(() => performance.now());

  const durations: number[] = [];
  for (let index = 1; index <= 50; index += 1) {
    const startedAt = performance.now();
    socket.route!.send(
      `42${JSON.stringify([
        "wpp_message",
        {
          message: {
            id: 10_000 + index,
            chatId: chatCount,
            contactId: chatCount,
            body: `Rajada ${index}`,
            type: "chat",
            from: "contact:test",
            to: "me:test",
            status: "READ",
            timestamp: String(1_900_000_000_000 + index),
          },
        },
      ])}`,
    );
    await expect(
      page.locator(`[id="${10_000 + index}"]`).getByText(`Rajada ${index}`, { exact: true }),
    ).toBeVisible();
    durations.push(performance.now() - startedAt);
  }

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

  // Exercise the real pagehide flush path without waiting 30 seconds. The
  // long-task observer below therefore includes serialization and dispatch.
  const batchesBeforeFlush = socket.telemetryBatches.length;
  const flushStartedAt = performance.now();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  if (telemetryEnabled) {
    await expect.poll(() => socket.telemetryBatches.length).toBeGreaterThan(batchesBeforeFlush);
    const flushedBatches = socket.telemetryBatches.slice(batchesBeforeFlush);
    for (const rawBatch of flushedBatches) {
      expect(Buffer.byteLength(rawBatch, "utf8")).toBeLessThanOrEqual(64 * 1024);
      const payload = JSON.parse(rawBatch) as {
        schemaVersion: number;
        metrics: Array<{ route: string }>;
      };
      expect(payload.schemaVersion).toBe(1);
      expect(payload.metrics.length).toBeGreaterThan(0);
      expect(payload.metrics.length).toBeLessThanOrEqual(50);
      for (const metric of payload.metrics) {
        expect(metric.route).not.toContain("/test");
        expect(metric.route).not.toMatch(/[?#]/);
      }
      expect(rawBatch).not.toContain("test-token");
      expect(rawBatch).not.toContain("Contato ");
      expect(rawBatch).not.toContain("Mensagem ");
      expect(rawBatch).not.toContain("Rajada ");
    }
  }
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const flushRoundTripDuration = performance.now() - flushStartedAt;

  durations.sort((left, right) => left - right);
  const p75 = durations[Math.ceil(durations.length * 0.75) - 1] ?? Number.POSITIVE_INFINITY;
  const p95 = durations[Math.ceil(durations.length * 0.95) - 1] ?? Number.POSITIVE_INFINITY;
  const longTaskMetrics = await page.evaluate((startedAt) => {
    const metrics = window as typeof window & {
      __longTasks?: number[];
      __longTaskStarts?: number[];
      __longTaskObserver?: PerformanceObserver;
    };
    for (const entry of metrics.__longTaskObserver?.takeRecords() ?? []) {
      metrics.__longTasks?.push(entry.duration);
      metrics.__longTaskStarts?.push(entry.startTime);
    }
    const all = metrics.__longTasks ?? [];
    const burst = all.filter(
      (_, index) => (metrics.__longTaskStarts?.[index] ?? 0) >= startedAt,
    );
    return { all, burst };
  }, burstStartedAt);

  const maximumLongTask = Math.max(0, ...longTaskMetrics.burst);
  const totalLongTaskTime = longTaskMetrics.all.reduce((total, duration) => total + duration, 0);
  const performanceMetrics = {
    chatCount,
    cpuRate,
    telemetryEnabled,
    startupDuration,
    flushRoundTripDuration,
    telemetryBatchCount: socket.telemetryBatches.length,
    p75,
    p95,
    maximumLongTask,
    totalLongTaskTime,
    longTaskCount: longTaskMetrics.all.length,
    burstLongTaskTime: longTaskMetrics.burst.reduce((total, duration) => total + duration, 0),
  };
  const metricsDirectory = path.join(
    process.cwd(),
    ".performance-artifacts",
    "metrics",
    performanceArtifactKey,
  );
  await mkdir(metricsDirectory, { recursive: true });
  await writeFile(
    path.join(metricsDirectory, "performance-metrics.json"),
    JSON.stringify(performanceMetrics, null, 2),
    "utf8",
  );
  await test.info().attach("performance-metrics.json", {
    body: Buffer.from(JSON.stringify(performanceMetrics, null, 2)),
    contentType: "application/json",
  });

  expect(p95).toBeLessThan(200);
  expect(maximumLongTask).toBeLessThanOrEqual(150);
});

test(`coalesce uma rajada real de 50 eventos sob CPU ${cpuRate}x com telemetria ${telemetryEnabled ? "on" : "off"}`, async ({
  page,
}) => {
  const socket = await mockApis(page);
  await page.goto("/test");
  const items = page.getByTestId("chat-menu-item");
  await expect(items.first()).toBeVisible({ timeout: 15_000 });
  await items.first().click();
  await expect(page.getByText("Mensagem 100")).toBeVisible();
  await expect.poll(() => !!socket.route).toBe(true);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
  await page.evaluate(() => {
    const metrics = window as typeof window & { __burstLongTasks?: number[] };
    metrics.__burstLongTasks = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) metrics.__burstLongTasks?.push(entry.duration);
      }).observe({ type: "longtask" });
    } catch {
      // Long tasks are not available in every Chromium build.
    }
  });

  const startedAt = performance.now();
  for (let index = 1; index <= 50; index += 1) {
    socket.route!.send(
      `42${JSON.stringify([
        "wpp_message",
        {
          message: {
            id: 20_000 + index,
            chatId: chatCount,
            contactId: chatCount,
            body: `Rajada real ${index}`,
            type: "chat",
            from: "contact:test",
            to: "me:test",
            status: "READ",
            timestamp: String(1_910_000_000_000 + index),
          },
        },
      ])}`,
    );
  }

  await expect(
    page.locator('[id="20050"]').getByText("Rajada real 50", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const burstDuration = performance.now() - startedAt;
  const longTasks = await page.evaluate(
    () => (window as typeof window & { __burstLongTasks?: number[] }).__burstLongTasks ?? [],
  );
  const maximumLongTask = Math.max(0, ...longTasks);

  await test.info().attach("socket-burst-metrics.json", {
    body: Buffer.from(
      JSON.stringify(
        { chatCount, cpuRate, telemetryEnabled, burstDuration, maximumLongTask },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });

  expect(burstDuration).toBeLessThan(2_000);
  expect(maximumLongTask).toBeLessThanOrEqual(150);
});
