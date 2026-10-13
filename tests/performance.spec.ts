import { expect, Page, test, WebSocketRoute } from "@playwright/test";

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

const chats = Array.from({ length: 500 }, (_, index) => {
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
  const socket: { route?: WebSocketRoute } = {};
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
      return route.fulfill({ json: { parameters: {} } });
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
  await page.addInitScript(() => localStorage.setItem("@inpulse/test/token", "test-token"));
});

test("virtualiza 500 conversas e preserva o comportamento do Carregar mais", async ({ page }) => {
  await mockApis(page);
  await page.goto("/test");
  const items = page.getByTestId("chat-menu-item");
  await expect(items.first()).toBeVisible({ timeout: 15_000 });

  expect(await items.count()).toBeLessThanOrEqual(60);

  await items.first().click();
  await expect(page.getByText("Mensagem 100")).toBeVisible();

  const messageScroller = page.locator(".scrollbar-whatsapp").last();
  const loadMore = page.getByRole("button", { name: "Carregar mais" });
  await loadMore.click();
  await loadMore.click();
  await expect(page.getByText("Mensagem 1")).toBeVisible();
  expect(await messageScroller.evaluate((element) => element.scrollTop)).toBe(0);
});

test("mantém evento-render p95 abaixo de 200 ms sob CPU 4x", async ({ page }) => {
  const socket = await mockApis(page);
  await page.addInitScript(() => {
    const metrics = window as typeof window & {
      __longTasks?: number[];
      __longTaskStarts?: number[];
    };
    metrics.__longTasks = [];
    metrics.__longTaskStarts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        metrics.__longTasks?.push(entry.duration);
        metrics.__longTaskStarts?.push(entry.startTime);
      }
    }).observe({ type: "longtask", buffered: true });
  });
  await page.goto("/test");
  const items = page.getByTestId("chat-menu-item");
  await expect(items.first()).toBeVisible({ timeout: 15_000 });
  await items.first().click();
  await expect(page.getByText("Mensagem 100")).toBeVisible();
  await expect.poll(() => !!socket.route).toBe(true);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    const metrics = window as typeof window & {
      __longTasks?: number[];
      __longTaskStarts?: number[];
    };
    metrics.__longTasks = [];
    metrics.__longTaskStarts = [];
  });
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
            chatId: 500,
            contactId: 500,
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

  durations.sort((left, right) => left - right);
  const p95 = durations[Math.ceil(durations.length * 0.95) - 1] ?? Number.POSITIVE_INFINITY;
  const longTasks = await page.evaluate((startedAt) => {
    const metrics = window as typeof window & {
      __longTasks?: number[];
      __longTaskStarts?: number[];
    };
    return (metrics.__longTasks ?? []).filter(
      (_, index) => (metrics.__longTaskStarts?.[index] ?? 0) >= startedAt,
    );
  }, burstStartedAt);

  expect(p95).toBeLessThan(200);
  expect(Math.max(0, ...longTasks)).toBeLessThanOrEqual(100);
});
