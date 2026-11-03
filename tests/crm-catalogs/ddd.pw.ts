import { test, expect } from "@playwright/test";
const url = "/tests/crm-catalogs/index.html?catalog=phone-areas";
for (const width of [1280, 390]) test(`coverage writes after explicit review at width ${width}; uncertain commit requires consultation`, async ({
  page,
}) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`${url}&coverage=1`);
  const panel = page.getByRole("region", { name: "Consulta de cidades por DDD" });
  await panel.getByLabel("DDD para consultar").fill("11");
  await panel.getByRole("button", { name: "Consultar cidades", exact: true }).click();
  const save = panel.getByRole("button", { name: "Gravar associações revisadas", exact: true });
  await expect(save).toBeDisabled();
  const select = panel.getByRole("combobox", { name: "Revisar vínculo de SÃO PAULO" });
  await select.fill("São");
  await page.getByRole("option", { name: "São Paulo · SP (#1)" }).click();
  await expect(save).toBeDisabled();
  await panel.getByRole("checkbox").check();
  await save.click();
  await expect(
    panel.getByText("Associações incluídas: 1. Já existentes: 0. Vínculos anteriores preservados."),
  ).toBeVisible();
  expect(await page.evaluate(() => window.catalogTest.associations)).toEqual([
    {
      ddd: "11",
      data: {
        uf: "SP",
        reviewed: true,
        links: [{ cityId: 1, expectedName: "São Paulo", providerCity: "SÃO PAULO" }],
      },
    },
  ]);
  await expect(panel.getByText(/Cobertura já cadastrada: 1 vínculos/)).toBeVisible();
  await select.fill("São");
  await page.getByRole("option", { name: "São Paulo · SP (#1)" }).click();
  await panel.getByRole("checkbox").check();
  await page.evaluate(() => {
    window.catalogTest.failure = "unknown";
  });
  await save.click();
  await expect(panel.getByText(/Não foi possível confirmar a gravação/)).toBeVisible();
  await expect(save).toBeDisabled();
  await expect(select).toBeDisabled();
  expect(await page.evaluate(() => window.catalogTest.associations.length)).toBe(2);
  await page.evaluate(() => {
    window.catalogTest.failure = "";
  });
  await panel.getByRole("button", { name: "Consultar cidades", exact: true }).click();
  await expect(select).toBeEnabled();
});
test("DDD description editor preserves textual key and disables deletion", async ({ page }) => {
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Áreas telefônicas e DDD", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Excluir 11", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Editar 11", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Código", { exact: true })).toBeDisabled();
  await dialog.getByLabel("Descrição", { exact: false }).fill("Grande São Paulo");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Grande São Paulo", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.catalogTest.updates)).toEqual([
    { changes: { DESCRICAO: "Grande São Paulo" }, expected: { DESCRICAO: "São Paulo" } },
  ]);
  await page.getByRole("button", { name: "Novo DDD", exact: true }).click();
  await dialog.getByLabel("Código", { exact: true }).fill("01");
  await dialog.getByLabel("Descrição", { exact: false }).fill("Outro");
  await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
  await dialog.getByLabel("Código", { exact: true }).fill("12");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  expect(await page.evaluate(() => window.catalogTest.creates)).toEqual([
    { CODIGO: "12", DESCRICAO: "Outro" },
  ]);
});
for (const width of [1280, 390])
  test(`DDD city review displays complete result and manual choices at width ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(url);
    const panel = page.getByRole("region", { name: "Consulta de cidades por DDD" });
    await panel.getByLabel("DDD para consultar").fill("11");
    await panel.getByRole("button", { name: "Consultar cidades", exact: true }).click();
    await expect(panel.getByText("DDD 11 · UF SP · 2 cidades · Fonte: BrasilAPI")).toBeVisible();
    await expect(panel.getByText("Conferir grafia", { exact: true })).toBeVisible();
    await expect(panel.getByText("Sem correspondência", { exact: true })).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Gravar associações indisponível", exact: true }),
    ).toBeDisabled();
    const selection = panel.getByRole("combobox", { name: "Revisar vínculo de SÃO PAULO" });
    await selection.fill("São");
    await page.getByRole("option", { name: "São Paulo · SP (#1)" }).click();
    await expect(selection).toHaveValue("São Paulo · SP (#1)");
    expect(
      await page.evaluate(() => ({
        creates: window.catalogTest.creates.length,
        updates: window.catalogTest.updates.length,
        deletes: window.catalogTest.deletes.length,
      })),
    ).toEqual({ creates: 0, updates: 0, deletes: 0 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/crm-catalogs/ddd-${width}.png`, fullPage: true });
  });
test("provider failure preserves catalog; late response cannot cross tenant", async ({ page }) => {
  await page.goto(url);
  const panel = page.getByRole("region", { name: "Consulta de cidades por DDD" });
  await panel.getByLabel("DDD para consultar").fill("11");
  await page.evaluate(() => {
    window.catalogTest.failure = "network";
  });
  await panel.getByRole("button", { name: "Consultar cidades", exact: true }).click();
  await expect(panel.getByText(/Nenhum vínculo foi alterado/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "São Paulo", exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.catalogTest.failure = "";
    window.catalogTest.delay = 500;
  });
  await panel.getByRole("button", { name: "Consultar cidades", exact: true }).click();
  await page.getByRole("button", { name: "Trocar tenant", exact: true }).click();
  await expect(panel.getByLabel("DDD para consultar")).toHaveValue("");
  await page.waitForTimeout(700);
  await expect(panel.getByText(/Fonte: BrasilAPI/)).toHaveCount(0);
});
