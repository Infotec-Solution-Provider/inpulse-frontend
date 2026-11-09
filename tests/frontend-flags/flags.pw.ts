import { test, expect } from "@playwright/test";

async function parameters(page: import("@playwright/test").Page, values: Record<string, string>) {
  await page.addInitScript(values => sessionStorage.setItem("@test/parameters", JSON.stringify(values)), values);
}
for (const next of [false, true]) for (const switching of [false, true])
  test(`new=${next} switch=${switching}: configured interface and voluntary selection`, async ({ page }) => {
    await parameters(page, { feature_new_frontend_enabled: String(next), feature_frontend_switch_enabled: String(switching) });
    await page.goto("/odim");
    await expect(page.getByText(next ? "Interface nova" : "Interface atual", { exact: true })).toBeVisible();
    const toggle = page.getByRole("link", { name: next ? "Voltar à versão anterior" : "Experimentar nova versão" });
    if (!switching) { await expect(toggle).toHaveCount(0); return; }
    await toggle.click();
    await expect(page.getByText(next ? "Interface atual" : "Interface nova", { exact: true })).toBeVisible();
    await expect(page).not.toHaveURL(/frontend-choice/);
    expect(await page.evaluate(() => sessionStorage.getItem("@inpulse/frontend-choice:v1:odim:23"))).toBe(next ? "legacy" : "new");
    await page.reload();
    await expect(page.getByText(next ? "Interface atual" : "Interface nova", { exact: true })).toBeVisible();
  });

test("a direct nova URL cannot override current-only parameters", async ({ page }) => {
  await page.goto("/nova/odim#frontend-choice=new");
  await expect(page.getByText("Interface atual", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/odim$/);
  expect(await page.evaluate(() => sessionStorage.getItem("@inpulse/frontend-choice:v1:odim:23"))).toBeNull();
});

test("canceling a draft transition preserves the draft and does not store a choice", async ({ page }) => {
  await parameters(page, { feature_new_frontend_enabled: "true", feature_frontend_switch_enabled: "true" });
  await page.goto("/odim");
  await page.getByLabel("Rascunho").fill("Texto ainda não salvo");
  await page.getByRole("link", { name: "Voltar à versão anterior" }).click();
  await expect(page.getByRole("dialog", { name: "Descartar alterações?" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar editando" }).click();
  await expect(page.getByLabel("Rascunho")).toHaveValue("Texto ainda não salvo");
  expect(await page.evaluate(() => sessionStorage.getItem("@inpulse/frontend-choice:v1:odim:23"))).toBeNull();
});

test("changing configuration does not discard an admitted draft", async ({ page }) => {
  await parameters(page, { feature_new_frontend_enabled: "true" });
  await page.goto("/odim");
  await page.getByLabel("Rascunho").fill("Manter este rascunho");
  await page.evaluate(() => (window as any).flagTest.update({ parameters: {} }));
  await expect(page.getByRole("dialog", { name: "Descartar alterações?" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar editando" }).click();
  await expect(page.getByLabel("Rascunho")).toHaveValue("Manter este rascunho");
});

test("disabled and loading direct modules never mount children or their effects", async ({ page }) => {
  await page.goto("/odim?mode=route&route=/nova/odim/crm-email?tab=accounts");
  await expect(page.getByText("Funcionalidade indisponível para esta instância.")).toBeVisible();
  expect(await page.evaluate(() => (window as any).flagTest.state.effects)).toBe(0);
  await page.evaluate(() => (window as any).flagTest.update({ loaded: false, parameters: { feature_crm_email_enabled: "true" } }));
  await expect(page.getByText("Carregando permissões...")).toBeVisible();
  expect(await page.evaluate(() => (window as any).flagTest.state.renders)).toBe(0);
  await page.evaluate(() => (window as any).flagTest.update({ loaded: true }));
  await expect(page.getByText("Módulo montado")).toBeVisible();
  expect(await page.evaluate(() => (window as any).flagTest.state.effects)).toBe(1);
});


test("canceling an active call unload does not persist a frontend choice", async ({ page }) => {
  await parameters(page, { feature_new_frontend_enabled: "true", feature_frontend_switch_enabled: "true" });
  await page.goto("/odim");
  await page.getByLabel("Rascunho").click();
  await page.evaluate(() => window.addEventListener("beforeunload", event => { event.preventDefault(); event.returnValue = ""; }));
  page.on("dialog", dialog => dialog.dismiss());
  await page.getByRole("link", { name: "Voltar à versão anterior" }).click({ noWaitAfter: true });
  await expect(page.getByText("Interface nova", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("@inpulse/frontend-choice:v1:odim:23"))).toBeNull();
});


test("legacy chat history preserves plain text and paginates by cursor without inferring an author", async ({ page }) => {
  await parameters(page, { feature_legacy_history_enabled: "true" });
  await page.goto("/odim?mode=history");
  await expect(page.getByText("<img src=x onerror=alert(1)>\n  Texto com espaços", { exact: true })).toBeVisible();
  await expect(page.locator("article img")).toHaveCount(0);
  await expect(page.getByText("Registro do sistema antigo", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Carregar registros mais antigos" }).click();
  await expect(page.getByText("Registro anterior", { exact: true })).toBeVisible();
  await expect(page.getByText("Registro do sistema antigo", { exact: true })).toHaveCount(2);
  expect(await page.evaluate(() => (window as any).flagTest.state.historyCalls)).toEqual([
    { url: "/api/whatsapp/chats/41/legacy-history", params: { limit: 50 }, instance: "odim" },
    { url: "/api/whatsapp/chats/41/legacy-history", params: { limit: 50, beforeId: 100 }, instance: "odim" },
  ]);
});

test("legacy history distinguishes backend failure from an empty archive and retries explicitly", async ({ page }) => {
  await parameters(page, { feature_legacy_history_enabled: "true" });
  await page.goto("/odim?mode=history&history-error=1");
  await expect(page.getByText("Não foi possível carregar o histórico antigo.", { exact: false })).toBeVisible();
  await expect(page.getByText("Não há registros do sistema antigo para esta conversa.")).toHaveCount(0);
  await page.evaluate(() => (window as any).flagTest.update({ failHistory: false }));
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByText("Registro do sistema antigo", { exact: true })).toBeVisible();
  await page.goto("/odim?mode=history&history-empty=1");
  await expect(page.getByText("Não há registros do sistema antigo para esta conversa.")).toBeVisible();
});

test("legacy history closes on identity change and ignores a delayed response", async ({ page }) => {
  await parameters(page, { feature_legacy_history_enabled: "true" });
  await page.goto("/odim?mode=history&history-delay=500");
  await expect.poll(() => page.evaluate(() => (window as any).flagTest.state.historyCalls.length)).toBe(1);
  await page.evaluate(() => (window as any).flagTest.update({ user: { CODIGO: 24, NIVEL: "ADMIN" } }));
  await expect(page.getByText("Histórico fechado", { exact: true })).toBeVisible();
  await expect(page.getByText("Registro do sistema antigo", { exact: true })).toHaveCount(0);
});
