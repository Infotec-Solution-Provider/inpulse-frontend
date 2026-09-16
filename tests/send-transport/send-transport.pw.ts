import { expect, test, type Page } from "@playwright/test";

type Send = { clientId: string; key: string; fields: Record<string, FormDataEntryValue> };
async function setup(page: Page, options: { postStatus?: number; refreshStatus?: number; fileStatus?: number; loseResponse?: boolean; rejectFirstAuth?: boolean; missingReceipt?: boolean; holdFirst?: boolean; rejectReplayStatus?: number } = {}) {
  const sends: Send[] = [];
  let refreshes = 0;
  let lookups = 0;
  let persisted = 0;
  let firstFinished = false;
  const receipts = new Map<string, object>();
  let releaseFirst!: () => void;
  const firstResponse = new Promise<void>((resolve) => { releaseFirst = resolve; });
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.hostname !== "127.0.0.1" || url.port !== "4182") return route.abort();
    const reply = (data: unknown, status = 200) => route.fulfill({ status, json: data });
    if (url.pathname === "/test-api/refresh") { refreshes++; return reply({ token: "renewed-token", message: "Refresh unavailable" }, options.refreshStatus ?? 200); }
    const match = url.pathname.match(/^\/api\/whatsapp\/(\d+)\/messages$/);
    if (match && req.method() === "POST") {
      const form = await new Response(req.postDataBuffer(), { headers: { "Content-Type": req.headers()["content-type"] } }).formData();
      const fields = Object.fromEntries(form.entries());
      sends.push({ clientId: match[1], key: req.headers()["idempotency-key"], fields });
      const sequence = sends.length;
      if (options.holdFirst && sequence === 1) await firstResponse;
      if (options.rejectFirstAuth && sequence === 1) return reply({ message: "Unauthorized!" }, 401);
      if (options.rejectReplayStatus && sequence > 1) return reply({ message: "Rejected replay" }, options.rejectReplayStatus);
      if (options.postStatus) return reply({ message: "Mensagem citada ainda não possui confirmação do provedor." }, options.postStatus);
      const key = req.headers()["idempotency-key"];
      const existing = receipts.get(key);
      const message = existing ?? { id: 500 + sequence, status: "SENT", body: `*Operator*: ${fields.text}`, contactId: Number(fields.contactId), chatId: Number(fields.chatId), clientId: Number(match[1]) };
      if (!options.missingReceipt && !existing) { receipts.set(key, message); persisted++; }
      if (sequence === 1) firstFinished = true;
      if (options.loseResponse) return route.abort("connectionreset");
      return reply({ data: message }).catch(() => undefined); // reload may close the first response
    }
    if (url.pathname.includes("/message-attempts/")) { lookups++; const receipt = receipts.get(url.pathname.split("/").at(-1)!); return reply({ data: receipt, message: receipt ? "Send attempt retrieved." : "Send attempt not found." }, receipt ? 200 : 404); }
    if (url.pathname === "/api/files/exists") return reply({ data: { file: { id: 22, size: 9 } }, message: "File service unavailable" }, options.fileStatus ?? 200);
    if (url.pathname.endsWith("/clients")) return reply({ data: [{ id: 23, name: "Official", type: "GUPSHUP" }] });
    if (url.pathname.endsWith("/sectors")) return reply({ data: [{ id: 1, defaultClientId: 23 }] });
    if (url.pathname.endsWith("/parameters")) return reply({ parameters: {} });
    if (url.pathname.includes("/session/chats")) return reply({ data: { chats: [], messages: [] } });
    if (url.pathname.startsWith("/api/")) return reply({ data: { notifications: [], totalCount: 0 } });
    return route.continue();
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tests/send-transport/index.html");
  await expect(page.getByTestId("ready")).toHaveText("true");
  return { sends, errors, releaseFirst, persisted: () => persisted, firstFinished: () => firstFinished, refreshes: () => refreshes, lookups: () => lookups };
}
async function send(page: Page, text = "Hello") {
  await page.getByLabel("Message draft").fill(text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
}

test("real provider and SDK send text after switching chats without losing destination", async ({ page }) => {
  const state = await setup(page);
  await send(page, "First");
  await page.getByRole("button", { name: "Chat two" }).click();
  await send(page, "Second");
  await expect.poll(() => state.sends.length).toBe(2);
  expect(state.sends.map((send) => [send.clientId, send.fields.chatId, send.fields.text])).toEqual([["23", "1", "First"], ["23", "2", "Second"]]);
  await expect(page.getByTestId("pending")).toHaveText("[]");
  expect(state.errors).toEqual([]);
});

test("expired-token refresh failure blocks the POST before whatsapp-service", async ({ page }) => {
  const state = await setup(page, { refreshStatus: 503 });
  await page.getByRole("button", { name: "Expire token", exact: true }).click();
  await send(page);
  await expect(page.getByTestId("pending")).toContainText("authentication");
  expect(state.sends).toHaveLength(0);
  expect(state.refreshes()).toBeGreaterThan(0);
  await expect(page.getByTestId("pending")).toContainText('"status":"failed"');
  await expect(page.getByRole("button", { name: "Recuperar mensagem", exact: true })).toBeVisible();
  expect(state.lookups()).toBe(0);
});

test("twenty messages accepted in one event survive a chat change with real HTTP FIFO", async ({ page }) => {
  const state = await setup(page, { holdFirst: true });
  await page.getByRole("button", { name: "Burst", exact: true }).click();
  await expect.poll(() => state.sends.length).toBe(1);
  await page.getByRole("button", { name: "Chat two", exact: true }).click();
  await send(page, "Other conversation");
  await expect.poll(() => state.sends.length).toBe(2);
  state.releaseFirst();
  await expect.poll(() => state.sends.length).toBe(21);
  expect(state.sends.filter((send) => send.fields.chatId === "1").map((send) => send.fields.text))
    .toEqual(Array.from({ length: 20 }, (_, index) => `Burst ${index}`));
  expect(new Set(state.sends.map((send) => send.key)).size).toBe(21);
  expect(state.errors).toEqual([]);
});

test("lost response plus missing receipt stays uncertain and cannot offer recovery", async ({ page }) => {
  const state = await setup(page, { loseResponse: true, missingReceipt: true });
  await send(page);
  await expect(page.getByTestId("pending")).toContainText('"status":"unconfirmed"');
  await expect(page.getByRole("button", { name: "Recuperar mensagem", exact: true })).toHaveCount(0);
  expect(state.sends).toHaveLength(1);
  expect(state.lookups()).toBe(1);
});

test("an existing attachment is submitted once using its file ID", async ({ page }) => {
  const state = await setup(page);
  await page.getByRole("button", { name: "Attach", exact: true }).click();
  await send(page);
  await expect.poll(() => state.sends.length).toBe(1);
  expect(state.sends[0].fields.fileId).toBe("22");
  expect(state.sends[0].fields.file).toBeUndefined();
  await expect(page.getByTestId("pending")).toHaveText("[]");
});

test("near-expiry background refresh failure does not block a valid token", async ({ page }) => {
  const state = await setup(page, { refreshStatus: 503 });
  await page.getByRole("button", { name: "Nearly expired token" }).click();
  await send(page);
  await expect.poll(() => state.sends.length).toBe(1);
  await expect(page.getByTestId("pending")).toHaveText("[]");
});

test("failed renewal after an explicit 401 keeps the unsent draft recoverable", async ({ page }) => {
  const state = await setup(page, { rejectFirstAuth: true, refreshStatus: 503 });
  await send(page);
  await expect(page.getByTestId("pending")).toContainText('"status":"failed"');
  await expect(page.getByTestId("pending")).toContainText("authentication");
  expect(state.sends).toHaveLength(1);
  expect(state.refreshes()).toBe(1);
  expect(state.lookups()).toBe(0);
});

test("an auth rejection retries the same multipart key only after renewal", async ({ page }) => {
  const state = await setup(page, { rejectFirstAuth: true });
  await send(page);
  await expect.poll(() => state.sends.length).toBe(2);
  expect(state.sends[0]).toEqual(state.sends[1]);
  expect(state.refreshes()).toBe(1);
  await expect(page.getByTestId("pending")).toHaveText("[]");
});

test("file preparation failure leaves a recoverable bubble without posting the message", async ({ page }) => {
  const state = await setup(page, { fileStatus: 503 });
  await page.getByRole("button", { name: "Attach", exact: true }).click();
  await send(page);
  await expect(page.getByTestId("pending")).toContainText('"status":"failed"');
  await expect(page.getByTestId("pending")).toContainText("file-lookup");
  expect(state.sends).toHaveLength(0);
});

test("a quoted-message validation rejection produces a local failed bubble", async ({ page }) => {
  const state = await setup(page, { postStatus: 400 });
  await page.getByRole("button", { name: "Quote", exact: true }).click();
  await send(page);
  await expect(page.getByTestId("pending")).toContainText('"status":"failed"');
  expect(state.sends).toHaveLength(1);
  expect(state.sends[0].fields.quotedId).toBe("77");
  expect(state.lookups()).toBe(0);
});

test("a lost response recovers the persisted message with no second POST", async ({ page }) => {
  const state = await setup(page, { loseResponse: true });
  await send(page);
  await expect.poll(() => state.lookups()).toBe(1);
  await expect(page.getByTestId("pending")).toHaveText("[]");
  expect(state.sends).toHaveLength(1);
});

test("reload before a queued POST allows explicit same-key continuation after lookup 404", async ({ page }) => {
  const state = await setup(page, { holdFirst: true });
  await send(page, "First blocked request");
  await expect.poll(() => state.sends.length).toBe(1);
  await send(page, "Still queued locally");
  const queued = JSON.parse(await page.getByTestId("pending").innerText())[1];
  await page.reload();
  await expect(page.getByTestId("ready")).toHaveText("true");
  expect(state.sends).toHaveLength(1);
  const bubble = page.locator(`[data-pending-send-id="${queued.id}"]`);
  await bubble.getByRole("button", { name: "Verificar envio", exact: true }).click();
  await bubble.getByRole("button", { name: "Retomar envio", exact: true }).click();
  await expect.poll(() => state.sends.length).toBe(2);
  expect(state.sends[1].key).toBe(queued.id);
  expect(state.sends[1].fields.text).toBe("Still queued locally");
  expect(state.sends.filter((send) => send.key === queued.id)).toHaveLength(1);
  state.releaseFirst();
  await expect.poll(state.firstFinished).toBe(true);
});

for (const attachment of [false, true]) {
  test(`reload with a delayed original POST resumes the same payload without creating two messages (attachment=${attachment})`, async ({ page }) => {
    const state = await setup(page, { holdFirst: true });
    if (attachment) await page.getByRole("button", { name: "Attach", exact: true }).click();
    await send(page, "Delayed request");
    await expect.poll(() => state.sends.length).toBe(1);
    await page.reload();
    await expect(page.getByTestId("ready")).toHaveText("true");
    await page.getByRole("button", { name: "Verificar envio", exact: true }).click();
    const resume = page.getByRole("button", { name: "Retomar envio", exact: true });
    await expect(resume).toBeEnabled();
    await resume.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    await expect.poll(() => state.sends.length).toBe(2);
    expect(state.sends[1]).toEqual(state.sends[0]);
    await expect(page.getByTestId("pending")).toHaveText("[]");
    state.releaseFirst();
    await expect.poll(state.firstFinished).toBe(true);
    expect(state.persisted()).toBe(1);
  });
}

test("a rejected manual resume cannot declare the delayed original POST failed", async ({ page }) => {
  const state = await setup(page, { holdFirst: true, rejectReplayStatus: 400 });
  await send(page);
  await expect.poll(() => state.sends.length).toBe(1);
  await page.reload();
  await expect(page.getByTestId("ready")).toHaveText("true");
  await page.getByRole("button", { name: "Verificar envio", exact: true }).click();
  await page.getByRole("button", { name: "Retomar envio", exact: true }).click();
  await expect.poll(() => state.sends.length).toBe(2);
  await expect(page.getByTestId("pending")).toContainText('"status":"unconfirmed"');
  await expect(page.getByRole("button", { name: "Recuperar mensagem", exact: true })).toHaveCount(0);
  state.releaseFirst();
  await expect.poll(state.firstFinished).toBe(true);
  await page.getByRole("button", { name: "Verificar envio", exact: true }).click();
  await expect(page.getByTestId("pending")).toHaveText("[]");
  expect(state.persisted()).toBe(1);
});
