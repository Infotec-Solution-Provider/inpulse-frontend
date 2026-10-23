import { expect, test } from "@playwright/test";
import type { Route } from "@playwright/test";

const message = { id: 10, chatId: 1, contactId: 10, from: "customer", to: "me:7", type: "text", body: "Mensagem recuperada", status: "RECEIVED", timestamp: "1000" };
const chat = { id: 1, contactId: 10, userId: 2, isUnread: true, lastMessage: message };
const empty = { chats: [], messages: [], removedChatIds: [], removedMessageIds: [] };

for (const width of [1440, 390]) {
  test(`connection indicator, websocket timestamp and manual incremental refresh at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 });
    await page.clock.install({ time: new Date("2026-10-23T12:15:00Z") });
    let pulls = 0, snapshots = 0;
    await page.route("**/api/whatsapp/session/chats?**", (route) => {
      snapshots++;
      return route.fulfill({ json: { data: { chats: [chat], messages: [], syncCursor: "initial" } } });
    });
    await page.route("**/api/whatsapp/session/changes?**", (route) => {
      pulls++;
      return route.fulfill({ json: { data: { resetRequired: false, hasMore: false, nextCursor: `cursor-${pulls}`, changes: { ...empty, chats: [chat], messages: [message] } } } });
    });
    await page.goto("/tests/session-changes/index.html");
    await expect.poll(() => pulls).toBe(1);
    const panel = page.locator('section[aria-label="Atualização das conversas"]');
    await expect(panel.getByRole("status")).toHaveText("Conectado");
    await expect(panel.getByText("Aguardando", { exact: true })).toBeVisible();
    await expect(panel).not.toContainText(/websocket/i);
    await panel.getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect.poll(() => pulls).toBe(2);
    expect(snapshots).toBe(1);
    await expect(panel.getByText("Aguardando", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Evento WebSocket" }).click();
    await expect(panel.locator("time").first()).toHaveText(/^23\/10\/2026, 09:15:\d{2}$/);
    const receivedAt = await panel.locator("time").first().textContent();
    await page.getByRole("button", { name: "Interromper conexão" }).click();
    await expect(panel.getByRole("status")).toHaveText("Desconectado");
    await panel.getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect.poll(() => pulls).toBe(3);
    await expect(panel.locator("time").first()).toHaveText(receivedAt!);
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await panel.screenshot({ path: info.outputPath(`connection-${width}.png`) });
  });
}

test("recovers a missed socket delivery using only the incremental cursor", async ({ page }) => {
  await page.clock.install();
  let snapshots = 0, pulls = 0, available = false;
  const cursors: string[] = [];
  await page.route("**/api/whatsapp/session/chats?**", (route) => {
    snapshots++;
    return route.fulfill({ json: { data: { chats: [chat], messages: [], syncCursor: "initial" } } });
  });
  await page.route("**/api/whatsapp/session/changes?**", (route) => {
    cursors.push(new URL(route.request().url()).searchParams.get("cursor")!);
    pulls++;
    return route.fulfill({ json: { data: { resetRequired: false, hasMore: false,
      nextCursor: `cursor-${pulls}`, changes: available ? { ...empty, chats: [chat], messages: [message] } : empty } } });
  });
  await page.goto("/tests/session-changes/index.html");
  await expect(page.getByTestId("chat-count")).toHaveText("1");
  await expect.poll(() => pulls).toBe(1);
  expect(cursors[0]).toBe("initial");
  available = true;
  await page.clock.runFor(121000);
  await expect(page.getByTestId("message-10")).toHaveText("Mensagem recuperada");
  expect(snapshots).toBe(1);
  expect(cursors[1]).toBe("cursor-1");
  await page.getByRole("button", { name: "Reconectar" }).click();
  await expect.poll(() => pulls).toBe(3);
  await expect(page.getByTestId("message-10")).toHaveCount(1);
});

test("waits for Retry-After despite focus, reconnection and manual refresh with the real SDK error wrapper", async ({ page }) => {
  await page.clock.install();
  let pulls = 0, snapshots = 0;
  await page.route("**/api/whatsapp/session/chats?**", (route) => {
    snapshots++;
    return route.fulfill({ json: { data: { chats: [], messages: [], syncCursor: "initial" } } });
  });
  await page.route("**/api/whatsapp/session/changes?**", (route) => {
    pulls++;
    if (pulls === 1) return route.fulfill({ status: 429, headers: { "Retry-After": "90" },
      json: { code: "READ_REQUEST_LIMIT", message: "Aguarde", retryAfterSeconds: 90 } });
    return route.fulfill({ json: { data: { resetRequired: false, hasMore: false, nextCursor: "next", changes: empty } } });
  });
  await page.goto("/tests/session-changes/index.html");
  const panel = page.locator('section[aria-label="Atualização das conversas"]');
  await expect(panel.getByRole("alert")).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.getByRole("button", { name: "Reconectar", exact: true }).click();
    await panel.getByRole("button", { name: "Atualizar", exact: true }).click();
    await page.clock.runFor(15000);
  }
  expect(pulls).toBe(1);
  await page.clock.runFor(20000);
  await expect.poll(() => pulls).toBe(2);
  await expect(panel.getByRole("alert")).toHaveCount(0);
  expect(snapshots).toBe(1);
});

test("recovers immediately when returning to the tab without reloading history", async ({ page }) => {
  await page.clock.install();
  let pulls = 0, snapshots = 0;
  await page.route("**/api/whatsapp/session/chats?**", (route) => {
    snapshots++;
    return route.fulfill({ json: { data: { chats: [], messages: [], syncCursor: "initial" } } });
  });
  await page.route("**/api/whatsapp/session/changes?**", (route) => {
    pulls++;
    return route.fulfill({ json: { data: { resetRequired: false, hasMore: false, nextCursor: "next", changes: empty } } });
  });
  await page.goto("/tests/session-changes/index.html");
  await expect.poll(() => pulls).toBe(1);
  await page.evaluate(() => Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" }));
  await page.clock.runFor(240000);
  expect(pulls).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => pulls).toBe(2);
  expect(snapshots).toBe(1);
});

test("recovers the contacts directory after the reported two-second limit using real SDK errors", async ({ page }) => {
  await page.clock.install();
  let contacts = 0;
  await page.route("**/api/whatsapp/session/chats?**", (route) => route.fulfill({
    json: { data: { chats: [], messages: [], syncCursor: "initial" } },
  }));
  await page.route("**/api/whatsapp/session/changes?**", (route) => route.fulfill({
    json: { data: { resetRequired: false, hasMore: false, nextCursor: "next", changes: empty } },
  }));
  await page.route("**/api/whatsapp/contacts", (route) => {
    contacts++;
    if (contacts === 1) return route.fulfill({ status: 429,
      json: { code: "READ_REQUEST_LIMIT", retryAfterSeconds: 2,
        message: "Muitos carregamentos seguidos. Aguarde 2 segundos antes de tentar novamente." } });
    return route.fulfill({ json: { data: [{ id: 10 }] } });
  });
  await page.goto("/tests/session-changes/index.html?directory=1");
  await expect.poll(() => contacts).toBe(1);
  await expect(page.getByTestId("directory")).toHaveText("Carregando");
  await page.clock.runFor(1000);
  expect(contacts).toBe(1);
  await page.clock.runFor(1100);
  await expect(page.getByTestId("directory")).toHaveText("Contatos: 1");
  expect(contacts).toBe(2);
});

test("discards an old session response even if it arrives after a new login", async ({ page }) => {
  let delayed: Route | undefined;
  let pulls = 0;
  await page.route("**/api/whatsapp/session/chats?**", (route) => route.fulfill({
    json: { data: { chats: [], messages: [], syncCursor: route.request().headers()["x-test-scope"] } },
  }));
  await page.route("**/api/whatsapp/session/changes?**", (route) => {
    pulls++;
    if (route.request().headers()["x-test-scope"] === "alpha:2") { delayed = route; return; }
    return route.fulfill({ json: { data: { resetRequired: false, hasMore: false, nextCursor: "new-session", changes: empty } } });
  });
  await page.goto("/tests/session-changes/index.html");
  await expect.poll(() => !!delayed).toBe(true);
  await page.getByRole("button", { name: "Trocar sessão" }).click();
  await expect(page.getByTestId("scope")).toHaveText("alpha:3");
  await expect.poll(() => pulls).toBe(2);
  await delayed!.fulfill({ json: { data: { resetRequired: false, hasMore: false, nextCursor: "old-session", changes: { ...empty, chats: [chat], messages: [message] } } } }).catch(() => {});
  await expect(page.getByTestId("message-10")).toHaveCount(0);
});
