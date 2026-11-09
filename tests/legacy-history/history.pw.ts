import { expect, test, type Page } from "@playwright/test";
async function enabled(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("@history/parameters", JSON.stringify({ feature_legacy_history_enabled: "true" })));
}
test("disabled contact action and chat modal make no archive requests", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Contato sintético", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Histórico sem atendimento", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).historyTest.state.historyCalls)).toEqual([]);
  await page.goto("/?mode=chat");
  await expect(page.getByText("Histórico fechado", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).historyTest.state.historyCalls)).toEqual([]);
});
test("contact archive requires ADMIN even when enabled", async ({ page }) => {
  await enabled(page); await page.goto("/?role=ATIVO");
  await expect(page.getByText("Contato sintético", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Histórico sem atendimento", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).historyTest.state.historyCalls)).toEqual([]);
});
test("contact action reads plain messages, preserves unknown dates and authors, paginates and only links files", async ({ page }) => {
  await enabled(page); await page.goto("/");
  const fileRequests: string[] = []; page.on("request", request => { if (request.url().includes("/api/files/")) fileRequests.push(request.url()); });
  expect(await page.evaluate(() => (window as any).historyTest.state.historyCalls)).toEqual([]);
  await page.getByRole("button", { name: "Histórico sem atendimento", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Histórico sem atendimento", exact: true })).toBeVisible();
  const body = page.getByText("<img src=x onerror=alert(1)>\n  Texto com espaços", { exact: true });
  await expect(body).toBeVisible(); await expect(body).toHaveCSS("white-space", "pre-wrap");
  await expect(page.locator("article img")).toHaveCount(0);
  await expect(page.getByText("Autor · ID legado: -5000", { exact: true })).toBeVisible();
  await expect(page.getByText("Data não disponível", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "arquivo <antigo>.pdf", exact: true })).toHaveAttribute("href", "https://files.example.test/api/files/88");
  expect(fileRequests).toEqual([]);
  await page.getByRole("button", { name: "Carregar mensagens mais antigas", exact: true }).click();
  await expect(page.getByText("Mensagem anterior", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).historyTest.state.historyCalls)).toEqual([
    { url: "/api/whatsapp/contacts/149/legacy-messages", params: { limit: 50 }, instance: "odim" },
    { url: "/api/whatsapp/contacts/149/legacy-messages", params: { limit: 50, beforeId: 100 }, instance: "odim" },
  ]);
  expect(await page.evaluate(() => (window as any).historyTest.state.mutations)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).historyTest.state.historyCalls.length)).toBe(2);
});
test("backend errors differ from empty history and retry is explicit", async ({ page }) => {
  await enabled(page); await page.goto("/?error=1"); await page.getByRole("button", { name: "Histórico sem atendimento", exact: true }).click();
  await expect(page.getByText("Não foi possível carregar o histórico sem atendimento.", { exact: false })).toBeVisible();
  await expect(page.getByText("Não há mensagens antigas sem atendimento para este contato.")).toHaveCount(0);
  await page.evaluate(() => (window as any).historyTest.update({ fail: false }));
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByText("Autor · ID legado: -5000", { exact: true })).toBeVisible();
  await page.goto("/?empty=1"); await page.getByRole("button", { name: "Histórico sem atendimento", exact: true }).click();
  await expect(page.getByText("Não há mensagens antigas sem atendimento para este contato.")).toBeVisible();
});
for (const change of ["user", "tenant", "logout", "flag"] as const) test(`contact modal cancels a delayed response after ${change} changes`, async ({ page }) => {
  await enabled(page); await page.goto("/?delay=500"); await page.getByRole("button", { name: "Histórico sem atendimento", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).historyTest.state.historyCalls.length)).toBe(1);
  await page.evaluate(change => (window as any).historyTest.update(change === "user" ? { user: { CODIGO: 24, NIVEL: "ADMIN" } } :
    change === "tenant" ? { instance: "outro" } : change === "logout" ? { token: null } : { parameters: {} }), change);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).historyTest.state.aborted)).toBe(1);
  await page.waitForTimeout(550);
  await expect(page.getByText("Autor · ID legado: -5000", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).historyTest.state.historyCalls.length)).toBe(1);
});
test("a response for another contact is rejected without exposing its messages", async ({ page }) => {
  await enabled(page); await page.goto("/?wrong-contact=1"); await page.getByRole("button", { name: "Histórico sem atendimento", exact: true }).click();
  await expect(page.getByText("Não foi possível carregar o histórico sem atendimento.", { exact: false })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(0);
});

test("changing the old archive chat cancels its page and cannot carry its cursor into another chat", async ({ page }) => {
  await enabled(page); await page.goto("/?mode=chat&delay=500");
  await expect.poll(() => page.evaluate(() => (window as any).historyTest.state.historyCalls.length)).toBe(1);
  await page.evaluate(() => (window as any).historyTest.update({ chatId: 42 }));
  await expect(page.getByText("Histórico fechado", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).historyTest.state.aborted)).toBe(1);
  await page.waitForTimeout(550);
  expect(await page.evaluate(() => (window as any).historyTest.state.historyCalls.length)).toBe(1);
  await expect(page.locator("article")).toHaveCount(0);
});
