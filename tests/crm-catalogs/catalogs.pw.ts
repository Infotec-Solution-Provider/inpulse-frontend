import { test, expect, type Page } from "@playwright/test";
const url = "/tests/crm-catalogs/index.html";
const catalogCases = [
  {
    catalog: "customer-groups",
    title: "Grupos de clientes",
    singular: "grupo",
    field: "Descrição",
  },
  { catalog: "positions", title: "Cargos dos contatos", singular: "cargo", field: "Descrição" },
  { catalog: "origins", title: "Origens de clientes", singular: "origem", field: "Descrição" },
  { catalog: "brands", title: "Marcas", singular: "marca", field: "Descrição" },
  { catalog: "medias", title: "Mídias CRM", singular: "mídia", field: "Nome" },
  { catalog: "cities", title: "Cidades CRM", singular: "cidade", field: "Nome" },
  { catalog: "states", title: "Estados CRM", singular: "estado", field: "Nome" },
];
async function initial(page: Page, query = "") {
  await page.goto(`${url}${query}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Atualizar lista", exact: true })).toBeEnabled();
}
for (const fixture of catalogCases)
  test(`${fixture.catalog}: creates, edits with original snapshot and deletes`, async ({
    page,
  }) => {
    await initial(page, `?catalog=${fixture.catalog}`);
    await expect(page.getByRole("heading", { name: fixture.title, exact: true })).toBeVisible();
    await page
      .getByRole("button", {
        name: `${["origem", "marca", "mídia", "cidade"].includes(fixture.singular) ? "Nova" : "Novo"} ${fixture.singular}`,
        exact: true,
      })
      .click();
    let dialog = page.getByRole("dialog");
    if (fixture.catalog === "states")
      await dialog.getByLabel("Sigla do estado", { exact: true }).fill("RS");
    else if (fixture.catalog !== "brands")
      await dialog.getByLabel("Código", { exact: true }).fill("22");
    await dialog.getByLabel(fixture.field, { exact: false }).first().fill("Cadastro de teste");
    if (fixture.catalog === "brands") {
      await dialog.getByRole("combobox", { name: "Unidade" }).click();
      await page.getByRole("option", { name: "Unidade real (#2)" }).click();
    }
    if (fixture.catalog === "cities") {
      await dialog.getByRole("combobox", { name: "Estado" }).click();
      await page.getByRole("option", { name: "SP · São Paulo" }).click();
    }
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Registro salvo com sucesso.")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Cadastro de teste", exact: true })).toBeVisible();
    const id = fixture.catalog === "states" ? "RS" : "22";
    await page.getByRole("button", { name: `Editar ${id}`, exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(fixture.field, { exact: false }).first().fill("Cadastro alterado");
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("cell", { name: "Cadastro alterado", exact: true })).toBeVisible();
    const writes = await page.evaluate(() => window.catalogTest.updates);
    expect(Object.values(writes[0].expected)).toContain("Cadastro de teste");
    expect(Object.values(writes[0].changes)).toEqual(["Cadastro alterado"]);
    await page.getByRole("button", { name: `Excluir ${id}`, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(page.getByText("Registro excluído com sucesso.")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Cadastro alterado", exact: true })).toHaveCount(0);
  });

test("conflict preserves draft, blocks repeat write and reloads original", async ({ page }) => {
  await initial(page);
  await page.getByRole("button", { name: "Editar 1", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Descrição", { exact: false }).fill("Meu rascunho");
  await page.evaluate(() => {
    window.catalogTest.failure = "conflict";
    window.catalogTest.rows["customer-groups"][0].DESCRICAO = "Outra edição";
  });
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    dialog.getByText("O registro foi alterado por outra pessoa. Recarregue os dados."),
  ).toBeVisible();
  await expect(dialog.getByLabel("Descrição", { exact: false })).toHaveValue("Meu rascunho");
  await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Recarregar registro" }).click();
  await expect(dialog.getByLabel("Descrição", { exact: false })).toHaveValue("Outra edição");
  expect(await page.evaluate(() => window.catalogTest.updates.length)).toBe(1);
});
for (const failure of ["unknown", "network", "duplicate-unknown"])
  test(`${failure}: requires reconciliation after uncertain write`, async ({ page }) => {
    await initial(page);
    await page.getByRole("button", { name: "Novo grupo", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Código", { exact: true }).fill("22");
    await dialog.getByLabel("Descrição", { exact: false }).fill("Nova tentativa");
    await page.evaluate((failure) => {
      window.catalogTest.failure = failure;
    }, failure);
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(dialog.getByText(/Não foi possível confirmar a gravação/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.getByRole("button", { name: "Fechar formulário" }).click();
    await expect(page.getByRole("button", { name: "Novo grupo", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Conferi os dados" }).click();
    await expect(page.getByRole("button", { name: "Novo grupo", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => window.catalogTest.creates.length)).toBe(1);
  });
test("reference refusal keeps the row and does not remove relations", async ({ page }) => {
  await initial(page);
  await page.evaluate(() => {
    window.catalogTest.failure = "in-use";
  });
  await page.getByRole("button", { name: "Excluir 1", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("O registro possui vínculos e não pode ser excluído."),
  ).toBeVisible();
  expect(await page.evaluate(() => window.catalogTest.rows["customer-groups"].length)).toBe(1);
});
test("session renewal during a pending write keeps its result unknown", async ({ page }) => {
  await initial(page);
  await page.getByRole("button", { name: "Editar 1", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Descrição", { exact: false }).fill("Alteração em andamento");
  await page.evaluate(() => {
    window.catalogTest.delay = 900;
  });
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await page
    .getByRole("button", { name: "Renovar sessão", exact: true, includeHidden: true })
    .click({ force: true });
  await expect(
    dialog.getByText(
      "Sua sessão mudou durante a gravação. Confira os dados antes de tentar novamente.",
    ),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancelar", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Cancelar", exact: true })).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
  await expect(dialog.getByLabel("Descrição", { exact: false })).toHaveValue(
    "Alteração em andamento",
  );
  expect(await page.evaluate(() => window.catalogTest.updates.length)).toBe(1);
});
test("non-admin never loads administrative catalogs", async ({ page }) => {
  await page.goto(`${url}?operator`);
  await expect(page.getByText("Acesso restrito a administradores.")).toBeVisible();
  expect(await page.evaluate(() => window.catalogTest.reads)).toEqual([]);
});
test("switching tenant discards drafts and ignores late old responses", async ({ page }) => {
  await initial(page);
  await page.getByRole("button", { name: "Editar 1", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Descrição", { exact: false })
    .fill("Rascunho tenant A");
  await page.evaluate(() => {
    window.catalogTest.listDelay = 400;
  });
  await page
    .getByRole("button", { name: "Atualizar lista", exact: true, includeHidden: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await page
    .getByRole("button", { name: "Trocar tenant", exact: true, includeHidden: true })
    .click({ force: true });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "Grupo tenant B", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Grupo inicial", exact: true })).toHaveCount(0);
});
test("dark mobile form remains operable within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await initial(page, "?catalog=brands&dark");
  await page.getByRole("button", { name: "Nova marca", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }),
  ).toBeInViewport();
  const size = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: innerWidth,
  }));
  expect(size.scroll).toBeLessThanOrEqual(size.width);
  await page.screenshot({ path: test.info().outputPath("crm-catalogs-dark-mobile.png") });
});
