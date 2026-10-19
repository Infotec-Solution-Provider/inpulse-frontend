import { test, expect } from "@playwright/test";
const path = "/tests/crm-registration/index.html";
test("creates complete registration and navigates to returned identity", async ({ page }) => {
  await page.goto(`${path}?new`);
  await page.getByLabel("Razão social ou nome *", { exact: true }).fill("Cliente novo");
  await page.getByRole("button", { name: "Salvar cadastro", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.registrationTest.navigation))
    .toContain("/tenant-a/crm-customers/52");
  expect(await page.evaluate(() => window.registrationTest.writes[0].data)).toEqual({
    RAZAO: "Cliente novo",
  });
});
test("edits only changed fields with a complete version and clears email explicitly", async ({
  page,
}) => {
  await page.goto(path);
  await page.getByLabel("Nome fantasia", { exact: true }).fill("Nome editado");
  await page.getByRole("button", { name: "Telefones e e-mails" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("");
  await page.getByRole("button", { name: "Salvar cadastro", exact: true }).click();
  await expect(page.getByText("Cadastro salvo.")).toBeVisible();
  expect(await page.evaluate(() => window.registrationTest.writes[0].data)).toMatchObject({
    changes: { FANTASIA: "Nome editado", EMAIL: null },
    version: expect.any(String),
  });
});
test("uses real lookup options while preserving a historical zero until explicitly cleared", async ({
  page,
}) => {
  await page.goto(path);
  await page.getByRole("button", { name: "Origem e classificação" }).click();
  const group = page.getByRole("combobox", { name: "Grupo de clientes" });
  await expect(group).toHaveValue("Código 0 (atual)");
  await group.click();
  await page.getByRole("option", { name: "Grupo real" }).click();
  await page.getByRole("button", { name: "Salvar cadastro", exact: true }).click();
  await expect(page.getByText("Cadastro salvo.")).toBeVisible();
  expect(await page.evaluate(() => window.registrationTest.writes[0].data)).toMatchObject({
    changes: { GRUPO: 1 },
  });
});
test("contact create/update/delete stays scoped with manual identity and versions", async ({
  page,
}) => {
  await page.goto(path);
  await page.getByRole("tab", { name: /Contatos/ }).click();
  await page.getByRole("button", { name: "Adicionar contato", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Código do contato *", { exact: true }).fill("25");
  await dialog.getByLabel("Nome *", { exact: true }).fill("Pessoa nova");
  await dialog.getByRole("combobox", { name: "Cargo" }).click();
  await page.getByRole("option", { name: "Cargo real" }).click();
  await dialog.getByRole("button", { name: "Salvar contato", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Pessoa nova", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar contato Pessoa nova", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome *", { exact: true }).fill("Pessoa editada");
  await dialog.getByRole("button", { name: "Salvar contato", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Pessoa editada", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Excluir contato Pessoa editada", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar exclusão", exact: true })
    .click();
  await expect(page.getByText("Nenhum contato cadastrado.")).toBeVisible();
  expect(await page.evaluate(() => window.registrationTest.writes.map((row) => row.kind))).toEqual([
    "contact.create",
    "contact.update",
    "contact.delete",
  ]);
});
test("brand associations preserve purchase history and delete only the selected manual link", async ({
  page,
}) => {
  await page.goto(path);
  await page.getByRole("tab", { name: /Marcas/ }).click();
  await expect(page.getByRole("button", { name: "Histórico preservado" })).toBeDisabled();
  await page.getByRole("combobox", { name: "Marca", exact: true }).click();
  await page.getByRole("option", { name: "Marca real" }).click();
  await page.getByRole("button", { name: "Vincular marca", exact: true }).click();
  await expect(page.getByText("Marca vinculada.")).toBeVisible();
  await page.getByRole("button", { name: "Remover", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar exclusão", exact: true })
    .click();
  await expect(page.getByText("Vínculo 2")).not.toBeVisible();
  await expect(page.getByText("Marca histórica")).toBeVisible();
});
for (const mode of ["conflict", "unknown", "network"])
  test(`${mode}: preserves draft and blocks writes until an authoritative successful check`, async ({
    page,
  }) => {
    await page.goto(path);
    await page.getByLabel("Nome fantasia", { exact: true }).fill("Rascunho preservado");
    await page.evaluate((value) => {
      window.registrationTest.failure = value;
    }, mode);
    await page.getByRole("button", { name: "Salvar cadastro", exact: true }).click();
    await expect(page.getByRole("button", { name: "Salvar cadastro", exact: true })).toBeDisabled();
    await expect(page.getByLabel("Nome fantasia", { exact: true })).toHaveValue(
      "Rascunho preservado",
    );
    await page.evaluate(() => {
      window.registrationTest.failure = "";
      window.registrationTest.failRead = true;
    });
    await page.getByRole("button", { name: "Conferir dados", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Descartar e continuar" }).click();
    await expect(page.getByRole("button", { name: "Salvar cadastro", exact: true })).toBeDisabled();
    await page.evaluate(() => {
      window.registrationTest.failRead = false;
    });
    await page.getByRole("button", { name: "Conferir dados", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Descartar e continuar" }).click();
    await expect(page.getByText("Dados conferidos e atualizados.")).toBeVisible();
    await page.getByLabel("Nome fantasia", { exact: true }).fill("Depois de conferir");
    await expect(page.getByRole("button", { name: "Salvar cadastro", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => window.registrationTest.writes)).toHaveLength(1);
  });
test("late tenant A write cannot replace tenant B form", async ({ page }) => {
  await page.goto(path);
  await page.getByLabel("Nome fantasia", { exact: true }).fill("Gravação A");
  await page.evaluate(() => {
    window.registrationTest.delay = 500;
  });
  await page.getByRole("button", { name: "Salvar cadastro", exact: true }).click();
  await page.getByRole("button", { name: "Trocar tenant" }).click();
  await expect(page.getByRole("heading", { name: "Cliente B", exact: true })).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.getByLabel("Nome fantasia", { exact: true })).toHaveValue("Outro tenant");
  expect(await page.evaluate(() => window.registrationTest.writes[0])).toMatchObject({
    tenant: "tenant-a",
    token: "token-a",
  });
});
test("session changes during a write keep the form gated until reread", async ({ page }) => {
  await page.goto(path);
  await page.getByLabel("Nome fantasia", { exact: true }).fill("Sessão antiga");
  await page.evaluate(() => {
    window.registrationTest.delay = 400;
  });
  await page.getByRole("button", { name: "Salvar cadastro", exact: true }).click();
  await page.getByRole("button", { name: "Renovar sessão" }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole("button", { name: "Salvar cadastro", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Conferir dados", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Descartar e continuar" }).click();
  await expect(page.getByText("Dados conferidos e atualizados.")).toBeVisible();
});
test("idle session renewal preserves an unsaved draft and requires an explicit check", async ({
  page,
}) => {
  await page.goto(path);
  await page.getByLabel("Nome fantasia", { exact: true }).fill("Rascunho sem gravação");
  await page.getByRole("button", { name: "Renovar sessão" }).click();
  await expect(page.getByLabel("Nome fantasia", { exact: true })).toHaveValue(
    "Rascunho sem gravação",
  );
  await expect(page.getByRole("button", { name: "Salvar cadastro", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.registrationTest.writes)).toHaveLength(0);
});
test("new create UNKNOWN survives a reload and cannot replay automatically", async ({ page }) => {
  await page.goto(`${path}?new`);
  await page.getByLabel("Razão social ou nome *", { exact: true }).fill("Resultado incerto");
  await page.evaluate(() => {
    window.registrationTest.failure = "unknown";
  });
  await page.getByRole("button", { name: "Salvar cadastro", exact: true }).click();
  await expect(page.getByRole("button", { name: "Salvar cadastro", exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByText(/Confira a lista de clientes antes/)).toBeVisible();
  await page.getByLabel("Razão social ou nome *", { exact: true }).fill("Outra tentativa");
  await expect(page.getByRole("button", { name: "Salvar cadastro", exact: true })).toBeDisabled();
});
test("operator cannot access administration", async ({ page }) => {
  await page.goto(`${path}?operator`);
  await expect(page.getByText("Acesso restrito a administradores.")).toBeVisible();
  expect(await page.evaluate(() => window.registrationTest.reads)).toEqual([]);
});
for (const [name, width, height, query] of [
  ["mobile", 390, 844, ""],
  ["dark", 1280, 800, "?dark"],
] as const)
  test(`${name}: renders usable labels without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(`${path}${query}`);
    await expect(page.getByLabel("Razão social ou nome *", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `test-results-crm-registration/crm-registration-${name}.png`,
      fullPage: true,
    });
  });
