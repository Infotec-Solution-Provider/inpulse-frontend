import { expect, test, type Page } from "@playwright/test";

const user = { CODIGO: 23, NOME: "Operador sintético", NOME_EXIBICAO: "Operador sintético", NIVEL: "ADMIN", SETOR: 1, LOGIN: "fixture", ATIVO: "SIM" };
const token = `fixture.${Buffer.from(JSON.stringify({ exp: 4102444800, instance: "odim", userId: 23 })).toString("base64url")}.fixture`;
async function fixtures(page: Page, parameters: Record<string, string>, authenticated = true, historyChat = false, legacyContacts = false) {
  const errors: string[] = [], failedAssets: string[] = [], calls: string[] = [];
  const chat = { id: 41, instance: "odim", contactId: 149, userId: 23, sectorId: 1, type: "ACTIVE", priority: "NORMAL", isFinished: false, startedAt: "2026-11-09T12:00:00Z", isSchedule: false, contact: { id: 149, name: "Contato sintético", phone: "5511999999999", instance: "odim", isBlocked: false, isOnlyAdmin: false }, customer: null, schedule: null };
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.url().includes("/_next/") && response.status() >= 400) failedAssets.push(response.url()); });
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    const path = url.pathname;
    if (path.includes("/_fixture/") || /localhost:80(00|01|02|03|04|05|06|07|08)/.test(url.host)) {
      calls.push(`${request.method()} ${path}`);
      const send = (data: unknown, status = 200) => route.fulfill({ status, json: data });
      if (request.method() === "OPTIONS") return send({});
      if (/\/api\/auth\/(refresh|login)$/.test(path)) return authenticated ? send({ data: { token, user } }) : send({ message: "Fixture anonymous" }, 401);
      if (path.endsWith("/api/auth/session")) return send({ data: { userId: 23, instance: "odim", sectorId: 1, role: "ADMIN" } });
      if (path.endsWith("/session/parameters")) return send({ parameters, tenantPolicy: null });
      if (path.endsWith("/sectors")) return send({ data: [{ id: 1, name: "Atendimento sintético", defaultClientId: null }] });
      if (/\/sector\/1\/clients$/.test(path)) return send({ data: [] });
      if (path.includes("notification-preferences")) return send({ data: {} });
      if (path.includes("notifications")) return send({ data: { notifications: [], totalCount: 0 } });
      if (path.endsWith("/session/changes")) return send({ data: { chats: [], messages: [], removedChatIds: [], removedMessageIds: [], nextCursor: "fixture-cursor", hasMore: false } });
      if (path.endsWith("/session/chats")) return send({ data: { chats: historyChat && path.includes("/whatsapp/") ? [chat] : [], messages: [], syncCursor: "fixture-cursor" } });
      if (path.endsWith("/chats/41/legacy-history")) return send({ data: { entries: [{ id: 100, body: "Registro antigo preservado", occurredAt: "2026-11-08T12:00:00Z" }], nextBeforeId: null } });
      if (path.endsWith("/contacts/149/legacy-messages")) return send({ data: { entries: [{ id: 201, contactId: 149, chatId: null, body: "Mensagem antiga sem atendimento", type: "chat", sentAt: null, userId: -5000, agentId: null, from: "origem sintética", to: "destino sintético", status: "READ", fileId: null, fileName: null }], nextBeforeId: null } });
      if (path.endsWith("/chats/41")) return send({ data: { chat, messages: [] } });
      if (path.endsWith("/contacts") && legacyContacts) return send({ data: [{ ...chat.contact, sectors: [] }], page: { totalRows: 1, current: 1, totalPages: 1 } });
      if (path.endsWith("/contacts") || path.endsWith("/customers") || path.endsWith("/users")) return send({ data: [], page: { totalRows: 0, current: 1, totalPages: 1 } });
      return send({ data: [] });
    }
    if (url.origin !== "http://127.0.0.1:13011") return route.abort("blockedbyclient");
    return route.continue();
  });
  return { errors, failedAssets, calls };
}

for (const next of [false, true]) for (const switching of [false, true])
  test(`two Next processes: new=${next}, switch=${switching}`, async ({ page }) => {
    const proof = await fixtures(page, { feature_new_frontend_enabled: String(next), feature_frontend_switch_enabled: String(switching) });
    await page.goto("/odim");
    await expect(page.locator(".chats-menu")).toBeVisible();
    await expect(page).toHaveURL(next ? /\/nova\/odim$/ : /\/odim$/);
    const toggle = page.getByRole("link", { name: next ? "Voltar à versão anterior" : "Experimentar nova versão", exact: true });
    if (switching) {
      await expect(toggle).toBeVisible();
      await toggle.click();
      await expect(page.locator(".chats-menu")).toBeVisible();
      await expect(page).toHaveURL(next ? /\/odim$/ : /\/nova\/odim$/);
      expect(await page.evaluate(() => sessionStorage.getItem("@inpulse/frontend-choice:v1:odim:23"))).toBe(next ? "legacy" : "new");
      await page.reload();
      await expect(page.locator(".chats-menu")).toBeVisible();
      await expect(page).toHaveURL(next ? /\/odim$/ : /\/nova\/odim$/);
    } else await expect(toggle).toHaveCount(0);
    expect(proof.calls.some(call => call.endsWith("/api/auth/refresh"))).toBe(true);
    expect(proof.errors).toEqual([]);
    expect(proof.failedAssets).toEqual([]);
  });

test("both public logins have no version switch and the nova manifest/assets use their namespace", async ({ page, request }) => {
  const proof = await fixtures(page, {}, false);
  for (const path of ["/odim/login", "/nova/odim/login"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Experimentar nova versão|Voltar à versão anterior/ })).toHaveCount(0);
  }
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/nova/manifest.webmanifest");
  const response = await request.get("/nova/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.start_url).toBe("/nova/");
  expect(manifest.scope).toBe("/nova/");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  expect(proof.errors).toEqual([]);
  expect(proof.failedAssets).toEqual([]);
});

test("direct nova CRM URL follows session selection and rejects a disabled module before API reads", async ({ page }) => {
  const proof = await fixtures(page, { feature_new_frontend_enabled: "true", feature_frontend_switch_enabled: "true" });
  await page.goto("/nova/odim/crm-email?tab=accounts");
  await expect(page.getByText("Funcionalidade indisponível para esta instância.")).toBeVisible();
  expect(proof.calls.some(call => /crm-email|email\/(settings|accounts|jobs)/.test(call))).toBe(false);
  expect(proof.errors).toEqual([]);
});


for (const next of [false, true]) test(`legacy history has a working entry in the ${next ? "new" : "current"} Next application`, async ({ page }) => {
  const proof = await fixtures(page, { feature_new_frontend_enabled: String(next), feature_legacy_history_enabled: "true" }, true, true);
  await page.goto("/odim");
  await page.getByText("Contato sintético", { exact: true }).click();
  if (next) {
    await page.getByRole("button", { name: "Ações da conversa com Contato sintético", exact: true }).click();
    await page.getByRole("menuitem", { name: "Histórico do sistema antigo", exact: true }).click();
  } else await page.getByRole("button", { name: "Histórico do sistema antigo", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Histórico do sistema antigo", exact: true })).toBeVisible();
  await expect(page.getByText("Registro antigo preservado", { exact: true })).toBeVisible();
  expect(proof.calls.some(call => call.endsWith("/chats/41/legacy-history"))).toBe(true);
  expect(proof.errors).toEqual([]);
});

for (const next of [false, true]) test(`disabled legacy history makes no requests in the ${next ? "new" : "current"} Next application`, async ({ page }) => {
  const proof = await fixtures(page, { feature_new_frontend_enabled: String(next) }, true, true, true);
  await page.goto("/odim");
  await page.getByText("Contato sintético", { exact: true }).click();
  if (next) {
    await page.getByRole("button", { name: "Ações da conversa com Contato sintético", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "Histórico do sistema antigo", exact: true })).toHaveCount(0);
  } else await expect(page.getByRole("button", { name: "Histórico do sistema antigo", exact: true })).toHaveCount(0);
  await page.goto(next ? "/nova/odim/contacts" : "/odim/contacts");
  await expect(page.getByRole("button", { name: "Histórico sem atendimento", exact: true })).toHaveCount(0);
  expect(proof.calls.some(call => /legacy-history|legacy-messages/.test(call))).toBe(false);
  expect(proof.errors).toEqual([]);
});

for (const next of [false, true]) test(`contact legacy messages open without an attendance in the ${next ? "new" : "current"} Next application`, async ({ page }) => {
  const proof = await fixtures(page, { feature_new_frontend_enabled: String(next), feature_legacy_history_enabled: "true" }, true, false, true);
  await page.goto(next ? "/nova/odim/contacts" : "/odim/contacts");
  await page.getByRole("button", { name: "Histórico sem atendimento", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Histórico sem atendimento", exact: true })).toBeVisible();
  await expect(page.getByText("Mensagem antiga sem atendimento", { exact: true })).toBeVisible();
  expect(proof.calls.some(call => call.endsWith("/contacts/149/legacy-messages"))).toBe(true);
  expect(proof.calls.some(call => /^(POST|PUT|PATCH|DELETE) /.test(call) && !call.includes("/api/auth/"))).toBe(false);
  expect(proof.errors).toEqual([]);
});
