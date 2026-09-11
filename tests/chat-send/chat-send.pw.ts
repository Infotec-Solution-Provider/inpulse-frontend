import { expect, test, type Page } from "@playwright/test";
import type {} from "./harness";

async function sendDraft(page: Page, text = "First message") {
  await page.getByLabel("Message draft").fill(text);
  await page.getByLabel("Message draft").press("Enter");
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
}

async function installPausedClock(page: Page) {
  const time = new Date("2026-09-11T12:00:00.000Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" && url.port === "4181" && !url.pathname.startsWith("/api/")
      ? route.continue()
      : route.abort();
  });
  await page.goto("/tests/chat-send/index.html");
  await expect(page.getByLabel("Message draft")).toBeVisible();
});

test("clears immediately while sending and preserves a draft typed before the response", async ({ page }) => {
  await sendDraft(page);
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeEnabled();
  await expect(page.getByTestId("pending-status")).toHaveText("sending");
  await expect(page.getByTestId("pending-text")).toHaveText("First message");
  await page.getByLabel("Message draft").fill("Next message being composed");
  await page.evaluate(() => window.chatSendHarness.resolveSend());
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await expect(page.getByLabel("Message draft")).toHaveValue("Next message being composed");
});

test("same-turn double submission and repeated Enter without another draft create one attempt", async ({ page }) => {
  await page.getByLabel("Message draft").fill("One message only");
  await page.getByRole("button", { name: "Dispatch twice" }).click();
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.getByLabel("Message draft").press("Enter");
  await page.getByLabel("Message draft").press("Enter");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  await expect(page.getByTestId("pending-send")).toHaveCount(1);
});

test("accepts three fast messages immediately and dispatches each in FIFO order", async ({ page }) => {
  const draft = page.getByLabel("Message draft");
  await sendDraft(page, "First fast message");
  await draft.fill("Second fast message");
  await draft.press("Enter");
  await expect(draft).toHaveValue("");
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeEnabled();
  await draft.fill("Third fast message");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(draft).toHaveValue("");
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued", "queued"]);
  await expect(page.getByTestId("pending-text")).toHaveText([
    "First fast message", "Second fast message", "Third fast message",
  ]);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  const acceptedKeys = await page.getByTestId("pending-send").evaluateAll((items) =>
    items.map((item) => item.getAttribute("data-id")),
  );
  expect(new Set(acceptedKeys).size).toBe(3);
  for (const key of acceptedKeys) expect(key).toMatch(/^[0-9a-f-]{36}$/);
  await draft.fill("Fourth message being composed");
  await page.evaluate(() => window.chatSendHarness.resolveSend());
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued"]);
  await expect(draft).toHaveValue("Fourth message being composed");
  await page.evaluate(() => window.chatSendHarness.resolveSend(1));
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(3);
  const sent = await page.evaluate(() => window.chatSendHarness.state.sends.map(({ data }) => ({
    text: data.text, key: data.idempotencyKey,
  })));
  expect(sent).toEqual([
    { text: "First fast message", key: acceptedKeys[0] },
    { text: "Second fast message", key: acceptedKeys[1] },
    { text: "Third fast message", key: acceptedKeys[2] },
  ]);
  await page.evaluate(() => window.chatSendHarness.resolveSend(2));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(draft).toHaveValue("Fourth message being composed");
});

test("typing the same text again creates a new intentional message with a different key", async ({ page }) => {
  await sendDraft(page, "Repeated intentionally");
  await page.getByLabel("Message draft").fill("Repeated intentionally");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued"]);
  await page.evaluate(() => window.chatSendHarness.resolveSend());
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  const sends = await page.evaluate(() => window.chatSendHarness.state.sends.map(({ data }) => ({
    text: data.text, key: data.idempotencyKey,
  })));
  expect(sends.map(({ text }) => text)).toEqual(["Repeated intentionally", "Repeated intentionally"]);
  expect(sends[1].key).not.toBe(sends[0].key);
});

test("a queued attachment keeps its quote, mentions, channel and destination after navigating away", async ({ page }) => {
  await sendDraft(page, "Message before attachment");
  await page.getByLabel("Message draft").fill("Document with context");
  await page.getByRole("button", { name: "Attach", exact: true }).click();
  await page.getByRole("button", { name: "Quote", exact: true }).click();
  await page.getByRole("button", { name: "Mention", exact: true }).click();
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await expect(page.getByTestId("file")).toHaveText("none");
  await expect(page.getByTestId("quoted-message")).toHaveText("none");
  await expect(page.getByTestId("mentions")).toHaveText("[]");
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued"]);
  await page.getByLabel("Message draft").fill("Third message without attachment");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.evaluate(() => {
    window.chatSendHarness.switchChannel(99);
    window.chatSendHarness.switchChat(2);
  });
  await expect(page.getByTestId("chat-id")).toHaveText("2");
  await page.getByLabel("Message draft").fill("Draft in another conversation");
  await page.evaluate(() => window.chatSendHarness.resolveSend());
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  const sent = await page.evaluate(async () => {
    const { to, data } = window.chatSendHarness.state.sends[1];
    return { ...data, to, file: { name: data.file!.name, content: await data.file!.text() } };
  });
  expect(sent).toMatchObject({
    text: "Document with context",
    to: "551190000001",
    chatId: 1,
    contactId: 101,
    clientId: 23,
    quotedId: 77,
    sendAsDocument: true,
    mentions: [{ userId: 9, name: "Operator", phone: "5511999999999" }],
    file: { name: "example.pdf", content: "attachment content" },
  });
  expect(sent.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  await page.evaluate(() => window.chatSendHarness.resolveSend(1));
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(3);
  const next = await page.evaluate(() => window.chatSendHarness.state.sends[2].data);
  expect(next).toMatchObject({ text: "Third message without attachment", clientId: 23, chatId: 1, contactId: 101 });
  expect(next.file).toBeUndefined();
  expect(next.quotedId).toBeUndefined();
  expect(next.mentions ?? []).toEqual([]);
  await expect(page.getByLabel("Message draft")).toHaveValue("Draft in another conversation");
});

test("an uncertain send stays separate and manual confirmation only looks up the original attempt", async ({ page }) => {
  await sendDraft(page, "Possibly delivered");
  const key = await page.evaluate(() => window.chatSendHarness.state.sends[0].data.idempotencyKey);
  await page.evaluate(() => window.chatSendHarness.rejectSend("unknown"));
  await expect(page.getByTestId("pending-status")).toHaveText("unconfirmed");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.getByLabel("Message draft").fill("Possibly delivered");
  await page.getByLabel("Message draft").press("Enter");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  await expect(page.getByLabel("Message draft")).toHaveValue("Possibly delivered");
  await page.getByLabel("Message draft").fill("");
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.evaluate(() => window.chatSendHarness.switchChannel(99));
  await page.getByRole("button", { name: "Verificar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  const lookupArgs = await page.evaluate(() => window.chatSendHarness.state.lookups[0].args);
  expect(lookupArgs).toContain(key);
  expect(lookupArgs).toContain(23);
  await expect(page.getByRole("button", { name: "Verificando envio…", exact: true })).toBeDisabled();
  await page.evaluate(() => window.chatSendHarness.resolveLookup(false));
  await expect(page.getByTestId("pending-status")).toHaveText("unconfirmed");
  await page.getByRole("button", { name: "Verificar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(2);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true, 1));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
});

test("a timed-out message is never retried while the next accepted message proceeds", async ({ page }) => {
  await sendDraft(page, "Delivery outcome unknown");
  const firstKey = await page.evaluate(() => window.chatSendHarness.state.sends[0].data.idempotencyKey);
  await page.getByLabel("Message draft").fill("Next independent message");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.evaluate(() => window.chatSendHarness.rejectSend("unknown"));
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  await expect(page.getByTestId("pending-status")).toHaveText(["unconfirmed", "sending"]);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends[1].data.text)).toBe("Next independent message");
  await page.getByLabel("Message draft").fill("Delivery outcome unknown");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByLabel("Message draft")).toHaveValue("Delivery outcome unknown");
  await page.getByRole("button", { name: "Verificar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups[0].args)).toContain(firstKey);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await page.evaluate(() => window.chatSendHarness.resolveSend(1));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  const keys = await page.evaluate(() => window.chatSendHarness.state.sends.map(({ data }) => data.idempotencyKey));
  expect(keys.filter((key) => key === firstKey)).toHaveLength(1);
  expect(keys).toHaveLength(2);
});

test("a definitive failure can be restored after clearing a new draft without overwriting it", async ({ page }) => {
  await page.getByRole("button", { name: "Attach", exact: true }).click();
  await page.getByRole("button", { name: "Quote", exact: true }).click();
  await sendDraft(page, "Failed message to recover");
  await page.getByLabel("Message draft").fill("Do not overwrite this draft");
  await page.evaluate(() => window.chatSendHarness.rejectSend("definitive"));
  await expect(page.getByTestId("pending-status")).toHaveText("failed");
  await page.getByRole("button", { name: "Recuperar mensagem", exact: true }).click();
  await expect(page.getByLabel("Message draft")).toHaveValue("Do not overwrite this draft");
  await expect(page.getByTestId("pending-send")).toHaveCount(1);
  await page.getByLabel("Message draft").fill("");
  await page.getByRole("button", { name: "Recuperar mensagem", exact: true }).click();
  await expect(page.getByLabel("Message draft")).toHaveValue("Failed message to recover");
  await expect(page.getByTestId("file")).toHaveText("example.pdf");
  await expect(page.getByTestId("quoted-message")).toHaveText("77");
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
});

test("a definitive rejection preserves the failed message and continues the following message", async ({ page }) => {
  await sendDraft(page, "Rejected first message");
  await page.getByLabel("Message draft").fill("Send this second message");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.getByLabel("Message draft").fill("Third draft stays here");
  await page.evaluate(() => window.chatSendHarness.rejectSend("definitive"));
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  await expect(page.getByTestId("pending-status")).toHaveText(["failed", "sending"]);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends[1].data.text)).toBe("Send this second message");
  await page.evaluate(() => window.chatSendHarness.resolveSend(1));
  await expect(page.getByTestId("pending-status")).toHaveText("failed");
  await expect(page.getByTestId("pending-text")).toHaveText("Rejected first message");
  await expect(page.getByLabel("Message draft")).toHaveValue("Third draft stays here");
  await page.getByRole("button", { name: "Recuperar mensagem", exact: true }).click();
  await expect(page.getByLabel("Message draft")).toHaveValue("Third draft stays here");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
});

test("switching chats hides the old attempt and its late response preserves the new draft", async ({ page }) => {
  await sendDraft(page, "Chat A message");
  await page.evaluate(() => window.chatSendHarness.switchChat(2));
  await expect(page.getByTestId("chat-id")).toHaveText("2");
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await page.getByLabel("Message draft").fill("Draft for chat B");
  await page.evaluate(() => window.chatSendHarness.resolveSend());
  await expect(page.getByLabel("Message draft")).toHaveValue("Draft for chat B");
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
});

test("two conversations send independently while preserving the queue in each conversation", async ({ page }) => {
  await sendDraft(page, "Chat A first");
  await page.getByLabel("Message draft").fill("Chat A second");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued"]);
  await page.evaluate(() => window.chatSendHarness.switchChat(2));
  await expect(page.getByTestId("chat-id")).toHaveText("2");
  await page.getByLabel("Message draft").fill("Chat B first");
  await page.getByLabel("Message draft").press("Enter");
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  await page.getByLabel("Message draft").fill("Chat B second");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued"]);
  await page.evaluate(() => window.chatSendHarness.resolveSend(1));
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(3);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends[2].data)).toMatchObject({
    text: "Chat B second", chatId: 2,
  });
  await page.evaluate(() => window.chatSendHarness.resolveSend(0));
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(4);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends[3].data)).toMatchObject({
    text: "Chat A second", chatId: 1,
  });
  await expect(page.getByTestId("pending-text")).toHaveText("Chat B second");
  await page.evaluate(() => window.chatSendHarness.resolveSend(2));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await page.evaluate(() => window.chatSendHarness.switchChat(1));
  await expect(page.getByTestId("pending-text")).toHaveText("Chat A second");
  await page.evaluate(() => window.chatSendHarness.resolveSend(3));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
});

test("switching tenants never exposes an old pending draft or lets its response alter the new tenant", async ({ page }) => {
  await sendDraft(page, "Tenant A private draft");
  await page.getByLabel("Message draft").fill("Tenant A queued message");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued"]);
  await page.evaluate(() => window.chatSendHarness.switchTenant("tenant-b"));
  await expect(page.getByTestId("tenant")).toHaveText("tenant-b");
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.getByLabel("Message draft").fill("Tenant B draft");
  await page.evaluate(() => window.chatSendHarness.rejectSend("definitive"));
  await expect(page.getByLabel("Message draft")).toHaveValue("Tenant B draft");
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  await page.evaluate(() => window.chatSendHarness.switchTenant("tenant-a"));
  await expect(page.getByTestId("pending-status")).toHaveText(["failed", "failed"]);
  await expect(page.getByTestId("pending-text")).toHaveText(["Tenant A private draft", "Tenant A queued message"]);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
});

test("a token refresh preserves the active attempt, its identifier and the next draft", async ({ page }) => {
  await sendDraft(page);
  const id = await page.getByTestId("pending-send").getAttribute("data-id");
  await page.getByLabel("Message draft").fill("Draft during renewal");
  await page.evaluate(() => window.chatSendHarness.refreshToken());
  await expect(page.getByTestId("token")).toHaveText("refreshed-token");
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-id", id!);
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await expect(page.getByLabel("Message draft")).toHaveValue("Draft during renewal");
  await page.evaluate(() => window.chatSendHarness.resolveSend());
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("Draft during renewal");
});

test("internal sends also accept the next message immediately and preserve a third draft", async ({ page }) => {
  await page.evaluate(() => window.chatSendHarness.switchChat(3, "internal"));
  await expect(page.getByTestId("chat-id")).toHaveText("3");
  await sendDraft(page, "Internal message");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends[0].kind)).toBe("internal");
  await page.getByLabel("Message draft").fill("Second internal message");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued"]);
  await page.getByLabel("Message draft").fill("Third internal draft");
  await page.evaluate(() => window.chatSendHarness.resolveSend());
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  const secondSend = await page.evaluate(() => window.chatSendHarness.state.sends[1]);
  expect(secondSend.kind).toBe("internal");
  expect(secondSend.data).toMatchObject({ text: "Second internal message", chatId: 3 });
  await page.evaluate(() => window.chatSendHarness.resolveSend(1));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("Third internal draft");
});

test("reload preserves an interrupted attempt for lookup and blocks resending its unchanged text", async ({ page }) => {
  await sendDraft(page, "Message before reload");
  const key = await page.evaluate(() => window.chatSendHarness.state.sends[0].data.idempotencyKey);
  await expect(page.getByTestId("pending-status")).toHaveText("sending");
  await page.reload();
  await expect(page.getByTestId("pending-status")).toHaveText("unconfirmed");
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-id", key!);
  await expect(page.getByTestId("pending-text")).toHaveText("Message before reload");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(0);
  await page.getByLabel("Message draft").fill("Message before reload");
  await page.getByLabel("Message draft").press("Enter");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(0);
  await page.getByRole("button", { name: "Verificar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups[0].args)).toContain(key);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("Message before reload");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(0);
});

test("a PENDING receipt accepts the next message and dispatches it automatically after confirmation", async ({ page }) => {
  await installPausedClock(page);
  await sendDraft(page, "Accepted by server queue");
  const key = await page.evaluate(() => window.chatSendHarness.state.sends[0].data.idempotencyKey);
  await page.evaluate(() => window.chatSendHarness.resolveSend(0, "PENDING"));
  await expect(page.getByTestId("pending-send")).toHaveCount(1);
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-id", key!);
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.getByLabel("Message draft").fill("Next queued draft");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued"]);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  await page.getByLabel("Message draft").fill("Third unsent draft");
  await page.clock.runFor(5_000);
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups[0].args)).toContain(key);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends[1].data.text)).toBe("Next queued draft");
  await expect(page.getByLabel("Message draft")).toHaveValue("Third unsent draft");
  await page.evaluate(() => window.chatSendHarness.resolveSend(1));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await expect(page.getByLabel("Message draft")).toHaveValue("Third unsent draft");
});

test("confirmation polling keeps draining a conversation after switching to another chat", async ({ page }) => {
  await installPausedClock(page);
  await sendDraft(page, "Chat A waiting for provider");
  await page.getByLabel("Message draft").fill("Chat A queued in background");
  await page.getByLabel("Message draft").press("Enter");
  await page.evaluate(() => window.chatSendHarness.resolveSend(0, "PENDING"));
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued"]);
  await page.evaluate(() => window.chatSendHarness.switchChat(2));
  await expect(page.getByTestId("chat-id")).toHaveText("2");
  await page.getByLabel("Message draft").fill("Chat B untouched draft");
  await page.clock.runFor(5_000);
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends[1].data)).toMatchObject({
    text: "Chat A queued in background", chatId: 1, clientId: 23,
  });
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("Chat B untouched draft");
});

test("continuous submissions do not postpone the five-second confirmation lookup", async ({ page }) => {
  await installPausedClock(page);
  await sendDraft(page, "First message awaiting confirmation");
  const firstKey = await page.evaluate(() => window.chatSendHarness.state.sends[0].data.idempotencyKey);
  await page.evaluate(() => window.chatSendHarness.resolveSend(0, "PENDING"));
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-message-id", "800");
  await page.clock.runFor(2_000);
  await page.getByLabel("Message draft").fill("Second message after two seconds");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.clock.runFor(2_000);
  await page.getByLabel("Message draft").fill("Third message after four seconds");
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued", "queued"]);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(0);
  await page.clock.runFor(1_000);
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups[0].args)).toContain(firstKey);
  await page.getByLabel("Message draft").fill("Fourth draft remains in progress");
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends[1].data.text)).toBe("Second message after two seconds");
  await page.evaluate(() => window.chatSendHarness.resolveSend(1));
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(3);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends[2].data.text)).toBe("Third message after four seconds");
  await expect(page.getByLabel("Message draft")).toHaveValue("Fourth draft remains in progress");
});

test("an internal HTTP 400 may follow delivery and cannot restore or resend the uncertain draft", async ({ page }) => {
  await page.evaluate(() => window.chatSendHarness.switchChat(3, "internal"));
  await expect(page.getByTestId("chat-id")).toHaveText("3");
  await sendDraft(page, "Internal possibly delivered");
  await page.evaluate(() => window.chatSendHarness.rejectSend("http400"));
  await expect(page.getByTestId("pending-status")).toHaveText("unconfirmed");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.getByLabel("Message draft").fill("Internal possibly delivered");
  await page.getByLabel("Message draft").press("Enter");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  await expect(page.getByTestId("pending-status")).toHaveText("unconfirmed");
  await expect(page.getByRole("button", { name: "Recuperar mensagem", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Verificar envio", exact: true })).toHaveCount(0);
  await page.getByLabel("Message draft").fill("New draft after checking conversation");
  await page.getByRole("button", { name: "Já conferi na conversa", exact: true }).click();
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("New draft after checking conversation");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
});

test("reload preserves a PENDING receipt and queued content without automatically posting restored messages", async ({ page }) => {
  await installPausedClock(page);
  await sendDraft(page, "Known queued message");
  const key = await page.evaluate(() => window.chatSendHarness.state.sends[0].data.idempotencyKey);
  await page.evaluate(() => window.chatSendHarness.resolveSend(0, "PENDING"));
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-message-id", "800");
  await page.getByRole("button", { name: "Verificar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(false));
  await expect(page.getByRole("button", { name: "Verificar envio", exact: true })).toBeEnabled();
  await expect(page.getByTestId("pending-status")).toHaveText("sending");
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await page.getByLabel("Message draft").fill("Queued before reload");
  await page.getByRole("button", { name: "Attach", exact: true }).click();
  await page.getByLabel("Message draft").press("Enter");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "queued"]);
  const queuedKey = await page.getByTestId("pending-send").nth(1).getAttribute("data-id");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  await page.reload();
  await expect(page.getByTestId("pending-send").nth(0)).toHaveAttribute("data-id", key!);
  await expect(page.getByTestId("pending-send").nth(0)).toHaveAttribute("data-message-id", "800");
  await expect(page.getByTestId("pending-send").nth(1)).toHaveAttribute("data-id", queuedKey!);
  await expect(page.getByTestId("pending-status")).toHaveText(["sending", "unconfirmed"]);
  await expect(page.getByTestId("pending-text")).toHaveText(["Known queued message", "Queued before reload"]);
  await expect(page.getByText("example.pdf", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Recuperar mensagem", exact: true })).toHaveCount(0);
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await page.getByLabel("Message draft").fill("New draft after reload");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(0);
  await page.getByRole("button", { name: "Verificar envio", exact: true }).nth(0).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups[0].args)).toContain(key);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await expect(page.getByTestId("pending-send")).toHaveCount(1);
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-id", queuedKey!);
  await expect(page.getByTestId("pending-status")).toHaveText("unconfirmed");
  await page.getByRole("button", { name: "Verificar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(2);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups[1].args)).toContain(queuedKey);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(false, 1));
  await expect(page.getByTestId("pending-status")).toHaveText("unconfirmed");
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await expect(page.getByLabel("Message draft")).toHaveValue("New draft after reload");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(0);
});

test("an unconfirmed send without a receipt is checked automatically with no overlapping lookup or resend", async ({ page }) => {
  await installPausedClock(page);
  await sendDraft(page, "Please confirm our appointment");
  const key = await page.evaluate(() => window.chatSendHarness.state.sends[0].data.idempotencyKey);
  await page.evaluate(() => window.chatSendHarness.rejectSend("unknown"));
  await expect(page.getByTestId("pending-status")).toHaveText("unconfirmed");
  await expect(page.getByTestId("pending-send")).not.toHaveAttribute("data-message-id");
  await expect(page.getByTestId("pending-check")).toHaveText("automatic");
  await page.getByLabel("Message draft").fill("Next draft stays intact");
  await page.clock.runFor(4_999);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(0);
  await page.clock.runFor(1);
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups[0].args)).toContain(key);
  await expect(page.getByRole("button", { name: "Verificando envio…", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.clock.runFor(40_000);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("Next draft stays intact");
  expect(await page.evaluate(() => window.chatSendHarness.state.toasts)).toEqual([]);
});

test("automatic verification stops after six checks and the icon still allows manual confirmation", async ({ page }) => {
  await installPausedClock(page);
  await sendDraft(page, "A message awaiting confirmation");
  await page.evaluate(() => window.chatSendHarness.rejectSend("unknown"));
  await expect(page.getByTestId("pending-check")).toHaveText("automatic");
  for (const [index, delay] of [5_000, 10_000, 15_000, 20_000, 30_000, 30_000].entries()) {
    await page.clock.runFor(delay);
    await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(index + 1);
    await page.evaluate((lookupIndex) => window.chatSendHarness.resolveLookup(false, lookupIndex), index);
    await expect(page.getByTestId("pending-check")).toHaveText(index === 5 ? "paused" : "automatic");
  }
  await page.clock.runFor(180_000);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(6);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  await expect(page.getByRole("button", { name: "Recuperar mensagem", exact: true })).toHaveCount(0);
  const verify = page.getByRole("button", { name: "Verificar envio", exact: true });
  await expect(verify).toBeEnabled();
  await expect(verify).toHaveText("");
  await verify.click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(7);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true, 6));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
});

test("reload retains the spent automatic verification budget and never posts the restored message", async ({ page }) => {
  await installPausedClock(page);
  await sendDraft(page, "Still awaiting a reply from the server");
  const key = await page.evaluate(() => window.chatSendHarness.state.sends[0].data.idempotencyKey);
  await page.evaluate(() => window.chatSendHarness.rejectSend("unknown"));
  await expect(page.getByTestId("pending-check")).toHaveText("automatic");
  for (const [index, delay] of [5_000, 10_000, 15_000].entries()) {
    await page.clock.runFor(delay);
    await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(index + 1);
    await page.evaluate((lookupIndex) => window.chatSendHarness.resolveLookup(false, lookupIndex), index);
    await expect(page.getByTestId("pending-check")).toHaveText("automatic");
  }
  await page.reload();
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-id", key!);
  await expect(page.getByTestId("pending-check")).toHaveText("automatic");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(0);
  await page.clock.runFor(19_000);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(0);
  for (const [index, delay] of [1_000, 30_000, 30_000].entries()) {
    await page.clock.runFor(delay);
    await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(index + 1);
    await page.evaluate((lookupIndex) => window.chatSendHarness.resolveLookup(false, lookupIndex), index);
    await expect(page.getByTestId("pending-check")).toHaveText(index === 2 ? "paused" : "automatic");
  }
  await page.reload();
  await expect(page.getByTestId("pending-check")).toHaveText("paused");
  await page.clock.runFor(180_000);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(0);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(0);
  await page.getByRole("button", { name: "Verificar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups[0].args)).toContain(key);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
});

test("a visible receipt takes over the pending bubble and keeps its verification icon", async ({ page }) => {
  await installPausedClock(page);
  await sendDraft(page, "A single message bubble");
  await page.evaluate(() => window.chatSendHarness.resolveSend(0, "PENDING"));
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-message-id", "800");
  await expect(page.getByTestId("pending-ui").getByText("A single message bubble", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Show server receipt", exact: true }).click();
  await expect(page.getByTestId("server-receipt")).toBeVisible();
  await expect(page.locator("[data-pending-send-id]")).toHaveCount(0);
  await expect(page.getByTestId("pending-ui").getByText("A single message bubble", { exact: true })).toHaveCount(1);
  await page.getByTestId("server-receipt").getByRole("button", { name: "Verificar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  await expect(page.getByTestId("server-receipt").getByRole("button", { name: "Verificando envio…", exact: true })).toBeDisabled();
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByTestId("server-receipt")).toHaveText("A single message bubble");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
});

test("message status stays compact, exposes keyboard tooltips and offers recovery only for failed sends", async ({ page }, testInfo) => {
  await installPausedClock(page);
  await sendDraft(page, "Olá! Podemos confirmar o horário?");
  await page.evaluate(() => window.chatSendHarness.rejectSend("unknown"));
  await expect(page.getByTestId("pending-check")).toHaveText("automatic");
  await page.getByLabel("Message draft").fill("Segue o documento atualizado.");
  await page.getByRole("button", { name: "Attach", exact: true }).click();
  await page.getByLabel("Message draft").press("Enter");
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  await page.evaluate(() => window.chatSendHarness.rejectSend("definitive", 1));
  await expect(page.getByTestId("pending-status")).toHaveText(["unconfirmed", "failed"]);
  const preview = page.getByTestId("pending-ui");
  await expect(preview.locator("p")).toHaveText([
    "Olá! Podemos confirmar o horário?", "Segue o documento atualizado.", "example.pdf",
  ]);
  const recover = preview.getByRole("button", { name: "Recuperar mensagem", exact: true });
  await expect(recover).toHaveText("");
  await recover.focus();
  await page.clock.runFor(200);
  await expect(page.getByRole("tooltip")).toHaveText("Editar e tentar novamente");
  await page.getByLabel("Message draft").focus();
  await page.mouse.move(0, 0);
  await page.keyboard.press("Escape");
  await page.clock.runFor(1_000);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  for (const [name, width, dark] of [["desktop", 1000, false], ["mobile", 390, false], ["dark", 1000, true]] as const) {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate((useDark) => document.documentElement.classList.toggle("dark", useDark), dark);
    const screenshotPath = testInfo.outputPath(`pending-send-${name}.png`);
    await preview.screenshot({ path: screenshotPath, animations: "disabled" });
    await testInfo.attach(`pending-send-${name}`, { path: screenshotPath, contentType: "image/png" });
    const size = await preview.boundingBox();
    expect(size!.x + size!.width).toBeLessThanOrEqual(width);
    expect(await preview.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(Math.ceil(size!.width));
  }
  await preview.getByRole("button", { name: "Descartar mensagem", exact: true }).click();
  await expect(page.getByTestId("pending-status")).toHaveText("unconfirmed");
  await expect(page.getByRole("button", { name: "Recuperar mensagem", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
});
