import { expect, test } from "@playwright/test";
const base = "/tests/crm-marketing/index.html?panel=units";
async function openUnit(page: import("@playwright/test").Page) {
  await page.goto(base);
  await page.getByRole("link", { name: "Abrir unidade", exact: true }).click();
}
test("unit list opens a dedicated named detail and explicit cancel preserves stored data", async ({
  page,
}) => {
  await openUnit(page);
  await expect(page.getByRole("heading", { name: "Matriz", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar dados", exact: true }).click();
  await page.getByLabel("Nome da unidade", { exact: true }).fill("Rascunho");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByLabel("Nome da unidade", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Matriz", exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).crmHarness.calls())).toHaveLength(0);
});
test("unit creation allocates its identity on the server and continues to its detail", async ({
  page,
}) => {
  await page.goto(base);
  await page.getByRole("link", { name: "Nova unidade", exact: true }).click();
  await expect(page.getByLabel("Código da unidade", { exact: true })).toHaveCount(0);
  await page.getByLabel("Nome da unidade", { exact: true }).fill("Equipe varejo");
  await page.getByLabel("Inativos recentes a partir de (dias)", { exact: true }).fill("30");
  await page.getByLabel("Inativos antigos a partir de (dias)", { exact: true }).fill("90");
  await page.getByRole("button", { name: "Criar unidade", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Equipe varejo", exact: true })).toBeVisible();
  const calls = await page.evaluate(() => (window as any).crmHarness.calls());
  expect(calls).toHaveLength(1);
  expect(calls[0].payload).toEqual({
    fields: { DESCRICAO: "Equipe varejo", INATIVOS_RECENTES: 30, INATIVOS_ANTIGOS: 90 },
    campaigns: [],
  });
});
test("session renewal preserves edits and pins a pending unit mutation", async ({ page }) => {
  await openUnit(page);
  await page.getByRole("button", { name: "Editar dados", exact: true }).click();
  await page.getByLabel("Nome da unidade", { exact: true }).fill("Rascunho mantido");
  await page.evaluate(() => (window as any).crmHarness.switchAuth("tenant-a", "token-renovado"));
  await expect(page.getByLabel("Nome da unidade", { exact: true })).toHaveValue("Rascunho mantido");
  await page.evaluate(() => (window as any).crmHarness.fault("delay"));
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await page.evaluate(() => (window as any).crmHarness.switchAuth("tenant-a", "outro-token"));
  await page.evaluate(() => (window as any).crmHarness.release());
  await expect(page.getByRole("button", { name: "Salvar alterações", exact: true })).toBeDisabled();
  const calls = await page.evaluate(() => (window as any).crmHarness.calls());
  expect(calls).toHaveLength(1);
  expect(calls[0].token).toBe("token-renovado");
});
test("mobile detail creates a supplemental paused campaign without copied IDs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnit(page);
  await page.getByRole("button", { name: "Adicionar campanha", exact: true }).click();
  await page.getByLabel("Nome da campanha", { exact: true }).fill("Reativação regional");
  await expect(page.getByLabel("Forma de operação", { exact: true })).toHaveText(
    "Público definido · geração manual",
  );
  await page.getByRole("button", { name: "Criar campanha", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reativação regional", exact: true }),
  ).toBeVisible();
  const calls = await page.evaluate(() => (window as any).crmHarness.calls());
  expect(calls).toHaveLength(1);
  expect(calls[0].payload).toMatchObject({
    operationMode: "audience-manual",
    organizationalUnitId: 1,
    NOME: "Reativação regional",
    UNIDADE: null,
    TIPO: null,
    PAUSADA: "SIM",
  });
  expect(calls[0].payload.CODIGO).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("tenant changes clear the unit edit and non-admin access has no actions", async ({ page }) => {
  await openUnit(page);
  await page.getByRole("button", { name: "Editar dados", exact: true }).click();
  await page.getByLabel("Nome da unidade", { exact: true }).fill("Tenant A");
  await page.evaluate(() => (window as any).crmHarness.switchAuth("tenant-b", "token-b"));
  await expect(page.getByRole("heading", { name: "Filial B", exact: true })).toBeVisible();
  await expect(page.getByLabel("Nome da unidade", { exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as any).crmHarness.setRole("ATIVO"));
  await expect(page.getByText("Acesso restrito a administradores.", { exact: true })).toBeVisible();
});
