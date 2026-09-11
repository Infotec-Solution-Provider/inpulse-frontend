import { expect, test, type Page } from "@playwright/test";
import type {} from "./harness";

async function sendDraft(page: Page, text = "First message") {
  await page.getByLabel("Message draft").fill(text);
  await page.getByLabel("Message draft").press("Enter");
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
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
  await expect(page.getByTestId("is-sending")).toHaveText("true");
  await expect(page.getByTestId("pending-status")).toHaveText("sending");
  await expect(page.getByTestId("pending-text")).toHaveText("First message");
  await page.getByLabel("Message draft").fill("Next message being composed");
  await page.evaluate(() => window.chatSendHarness.resolveSend());
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await expect(page.getByLabel("Message draft")).toHaveValue("Next message being composed");
});

test("same-turn double submission and another Enter during dispatch call the provider once", async ({ page }) => {
  await page.getByLabel("Message draft").fill("One message only");
  await page.getByRole("button", { name: "Dispatch twice" }).click();
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.getByLabel("Message draft").fill("Next draft");
  await page.getByLabel("Message draft").press("Enter");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  await expect(page.getByLabel("Message draft")).toHaveValue("Next draft");
  await page.evaluate(() => window.chatSendHarness.resolveSend());
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await page.getByLabel("Message draft").press("Enter");
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
  const keys = await page.evaluate(() => window.chatSendHarness.state.sends.map((send) => send.data.idempotencyKey));
  expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
  expect(keys[1]).not.toBe(keys[0]);
});

test("captures attachments, quotes, mentions and destination before clearing the composer", async ({ page }) => {
  await page.getByLabel("Message draft").fill("Document with context");
  await page.getByRole("button", { name: "Attach", exact: true }).click();
  await page.getByRole("button", { name: "Quote", exact: true }).click();
  await page.getByRole("button", { name: "Mention", exact: true }).click();
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const sent = await page.evaluate(async () => {
    const { to, data } = window.chatSendHarness.state.sends[0];
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
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await expect(page.getByTestId("file")).toHaveText("none");
  await expect(page.getByTestId("quoted-message")).toHaveText("none");
  await expect(page.getByTestId("mentions")).toHaveText("[]");
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
  await page.getByRole("button", { name: "Consultar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  const lookupArgs = await page.evaluate(() => window.chatSendHarness.state.lookups[0].args);
  expect(lookupArgs).toContain(key);
  expect(lookupArgs).toContain(23);
  await expect(page.getByRole("button", { name: "Consultando…", exact: true })).toBeDisabled();
  await page.evaluate(() => window.chatSendHarness.resolveLookup(false));
  await expect(page.getByTestId("pending-status")).toHaveText("unconfirmed");
  await page.getByRole("button", { name: "Consultar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(2);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true, 1));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
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

test("switching tenants never exposes an old pending draft or lets its response alter the new tenant", async ({ page }) => {
  await sendDraft(page, "Tenant A private draft");
  await page.evaluate(() => window.chatSendHarness.switchTenant("tenant-b"));
  await expect(page.getByTestId("tenant")).toHaveText("tenant-b");
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.getByLabel("Message draft").fill("Tenant B draft");
  await page.evaluate(() => window.chatSendHarness.rejectSend("definitive"));
  await expect(page.getByLabel("Message draft")).toHaveValue("Tenant B draft");
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
});

test("a token refresh preserves the active attempt, its identifier and the next draft", async ({ page }) => {
  await sendDraft(page);
  const id = await page.getByTestId("pending-send").getAttribute("data-id");
  await page.getByLabel("Message draft").fill("Draft during renewal");
  await page.evaluate(() => window.chatSendHarness.refreshToken());
  await expect(page.getByTestId("token")).toHaveText("refreshed-token");
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-id", id!);
  await expect(page.getByTestId("is-sending")).toHaveText("true");
  await expect(page.getByLabel("Message draft")).toHaveValue("Draft during renewal");
  await page.evaluate(() => window.chatSendHarness.resolveSend());
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("Draft during renewal");
});

test("internal sends also clear immediately and preserve the next draft", async ({ page }) => {
  await page.evaluate(() => window.chatSendHarness.switchChat(3, "internal"));
  await expect(page.getByTestId("chat-id")).toHaveText("3");
  await sendDraft(page, "Internal message");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends[0].kind)).toBe("internal");
  await page.getByLabel("Message draft").fill("Next internal draft");
  await page.evaluate(() => window.chatSendHarness.resolveSend());
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("Next internal draft");
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
  await page.getByRole("button", { name: "Consultar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups[0].args)).toContain(key);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("Message before reload");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(0);
});

test("a PENDING receipt keeps the next send blocked until lookup confirms SENT", async ({ page }) => {
  await page.clock.install();
  await sendDraft(page, "Accepted by server queue");
  const key = await page.evaluate(() => window.chatSendHarness.state.sends[0].data.idempotencyKey);
  await page.evaluate(() => window.chatSendHarness.resolveSend(0, "PENDING"));
  await expect(page.getByTestId("pending-send")).toHaveCount(1);
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-id", key!);
  await expect(page.getByTestId("is-sending")).toHaveText("true");
  await expect(page.getByLabel("Message draft")).toHaveValue("");
  await page.getByLabel("Message draft").fill("Next queued draft");
  await page.getByLabel("Message draft").press("Enter");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  await page.clock.runFor(5_000);
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups[0].args)).toContain(key);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await expect(page.getByLabel("Message draft")).toHaveValue("Next queued draft");
  await page.getByLabel("Message draft").press("Enter");
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(2);
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
  await expect(page.getByRole("button", { name: "Consultar envio", exact: true })).toHaveCount(0);
  await page.getByLabel("Message draft").fill("New draft after checking conversation");
  await page.getByRole("button", { name: "Já conferi na conversa", exact: true }).click();
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByLabel("Message draft")).toHaveValue("New draft after checking conversation");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
});

test("a missing lookup and reload preserve the known PENDING receipt until SENT is confirmed", async ({ page }) => {
  await page.clock.install();
  await sendDraft(page, "Known queued message");
  const key = await page.evaluate(() => window.chatSendHarness.state.sends[0].data.idempotencyKey);
  await page.evaluate(() => window.chatSendHarness.resolveSend(0, "PENDING"));
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-message-id", "800");
  await page.getByRole("button", { name: "Consultar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(false));
  await expect(page.getByRole("button", { name: "Consultar envio", exact: true })).toBeEnabled();
  await expect(page.getByTestId("pending-status")).toHaveText("sending");
  await expect(page.getByTestId("is-sending")).toHaveText("true");
  await page.getByLabel("Message draft").fill("Do not send while the queue result is unknown");
  await page.getByLabel("Message draft").press("Enter");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(1);
  await page.reload();
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-id", key!);
  await expect(page.getByTestId("pending-send")).toHaveAttribute("data-message-id", "800");
  await expect(page.getByTestId("pending-status")).toHaveText("sending");
  await expect(page.getByTestId("is-sending")).toHaveText("true");
  await page.getByLabel("Message draft").fill("New draft after reload");
  await page.getByLabel("Message draft").press("Enter");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(0);
  await page.getByRole("button", { name: "Consultar envio", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.chatSendHarness.state.lookups.length)).toBe(1);
  expect(await page.evaluate(() => window.chatSendHarness.state.lookups[0].args)).toContain(key);
  await page.evaluate(() => window.chatSendHarness.resolveLookup(true));
  await expect(page.getByTestId("pending-send")).toHaveCount(0);
  await expect(page.getByTestId("is-sending")).toHaveText("false");
  await expect(page.getByLabel("Message draft")).toHaveValue("New draft after reload");
  expect(await page.evaluate(() => window.chatSendHarness.state.sends.length)).toBe(0);
});
