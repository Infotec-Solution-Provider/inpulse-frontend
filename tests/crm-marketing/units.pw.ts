import { expect, test } from "@playwright/test";
const base = "/tests/crm-marketing/index.html?panel=units";
test("token renewal preserves the unit draft and a pending write keeps the original token", async ({ page }) => {
  await page.goto(base);
  await page.getByRole("button", { name: "1 · Matriz (0)", exact: true }).click();
  await page.getByLabel("Descrição da unidade", { exact: true }).fill("Rascunho mantido");
  await page.evaluate(() => (window as any).crmHarness.switchAuth("tenant-a", "token-renovado"));
  await expect(page.getByLabel("Descrição da unidade", { exact: true })).toHaveValue("Rascunho mantido");
  await page.evaluate(() => (window as any).crmHarness.fault("delay"));
  await page.getByRole("button", { name: "Salvar unidade", exact: true }).click();
  await page.evaluate(() => (window as any).crmHarness.switchAuth("tenant-a", "outro-token"));
  await page.evaluate(() => (window as any).crmHarness.release());
  await expect(page.getByRole("button", { name: "Salvar unidade", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Descrição da unidade", { exact: true })).toHaveValue("Rascunho mantido");
  const calls = await page.evaluate(() => (window as any).crmHarness.calls());
  expect(calls).toHaveLength(1);
  expect(calls[0].token).toBe("token-renovado");
});
test("desktop creates only the selected named campaign and preserves legacy units", async ({
  page,
}) => {
  await page.goto(base);
  await expect(page.getByRole("button", { name: "1 · Matriz (0)", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nova unidade", exact: true }).click();
  await page.getByLabel("Código da unidade", { exact: true }).fill("2");
  await page.getByLabel("Descrição da unidade", { exact: true }).fill("Equipe varejo");
  await page.getByLabel("Inativos recentes a partir de (dias)", { exact: true }).fill("30");
  await page.getByLabel("Inativos antigos a partir de (dias)", { exact: true }).fill("90");
  await page.getByLabel("Incluir PROSPE", { exact: true }).check();
  await page.getByLabel("Código PROSPE", { exact: true }).fill("41");
  await page.getByLabel("Nome PROSPE", { exact: true }).fill("Novos clientes da loja");
  await page.getByRole("button", { name: "Salvar unidade", exact: true }).click();
  await expect(page.getByText("Unidade e campanhas gravadas.", { exact: false })).toBeVisible();
  await expect(
    page.getByText("41 · Novos clientes da loja · PROSPE · Pausada", { exact: true }),
  ).toBeVisible();
  const calls = await page.evaluate(() => (window as any).crmHarness.calls());
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    name: "createUnit",
    token: "token-a",
    instance: "tenant-a",
    payload: {
      fields: { CODIGO: 2 },
      campaigns: [{ CODIGO: 41, TIPO: "PROSPE", NOME: "Novos clientes da loja", PAUSADA: "SIM" }],
    },
  });
  await expect(page.getByRole("button", { name: "1 · Matriz (0)", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results-crm-marketing/units-desktop.png", fullPage: true });
});
test("mobile edits preserve thresholds; applied uncertain result requires reconciliation, no retry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.getByRole("button", { name: "1 · Matriz (0)", exact: true }).click();
  await expect(
    page.getByLabel("Inativos recentes a partir de (dias)", { exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Descrição da unidade", { exact: true }).fill("Nome revisado");
  await page.evaluate(() => (window as any).crmHarness.fault("unknown"));
  await page.getByRole("button", { name: "Salvar unidade", exact: true }).click();
  await expect(page.getByRole("button", { name: "Salvar unidade", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Descrição da unidade", { exact: true })).toHaveValue(
    "Nome revisado",
  );
  expect(await page.evaluate(() => (window as any).crmHarness.calls().length)).toBe(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Recarregar unidades", exact: true }).click();
  await expect(page.getByRole("button", { name: "Salvar unidade", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as any).crmHarness.calls().length)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results-crm-marketing/units-mobile.png", fullPage: true });
});
test("unit editor resets on tenant change and has no mutation for non-admin users", async ({
  page,
}) => {
  await page.goto(base);
  await page.getByRole("button", { name: "1 · Matriz (0)", exact: true }).click();
  await page.getByLabel("Descrição da unidade", { exact: true }).fill("Rascunho tenant A");
  await page.evaluate(() => (window as any).crmHarness.switchAuth("tenant-b", "token-b"));
  await expect(page.getByRole("button", { name: "1 · Filial B (0)", exact: true })).toBeVisible();
  await expect(page.getByLabel("Descrição da unidade", { exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as any).crmHarness.setRole("ATIVO"));
  await expect(page.getByText("Acesso restrito a administradores.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nova unidade", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).crmHarness.calls().length)).toBe(0);
});
test("adds one campaign to an existing unit without recreating its composition", async ({
  page,
}) => {
  await page.goto(base);
  await page.getByRole("button", { name: "1 · Matriz (0)", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar ATIVOS", exact: true }).click();
  await page.getByLabel("Código ATIVOS", { exact: true }).fill("81");
  await page.getByLabel("Nome ATIVOS", { exact: true }).fill("Clientes frequentes");
  await page.getByRole("button", { name: "Salvar nova campanha", exact: true }).click();
  await expect(page.getByText("Campanha incluída e pausada.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar ATIVOS", exact: true })).toHaveCount(0);
  const calls = await page.evaluate(() => (window as any).crmHarness.calls());
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    name: "create",
    payload: { CODIGO: 81, UNIDADE: 1, TIPO: "ATIVOS", PAUSADA: "SIM" },
  });
});
