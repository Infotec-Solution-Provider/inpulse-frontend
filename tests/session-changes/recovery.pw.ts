import { expect, test } from "@playwright/test";
import type { Route } from "@playwright/test";

const message = { id: 10, chatId: 1, contactId: 10, from: "customer", to: "me:7", type: "text", body: "Mensagem recuperada", status: "RECEIVED", timestamp: "1000" };
const chat = { id: 1, contactId: 10, userId: 2, isUnread: true, lastMessage: message };
const empty = { chats: [], messages: [], removedChatIds: [], removedMessageIds: [] };

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
  await page.clock.runFor(19000);
  await expect(page.getByTestId("message-10")).toHaveText("Mensagem recuperada");
  expect(snapshots).toBe(1);
  expect(cursors[1]).toBe("cursor-1");
  await page.getByRole("button", { name: "Reconectar" }).click();
  await expect.poll(() => pulls).toBe(3);
  await expect(page.getByTestId("message-10")).toHaveCount(1);
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
  await page.clock.runFor(60000);
  expect(pulls).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => pulls).toBe(2);
  expect(snapshots).toBe(1);
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
