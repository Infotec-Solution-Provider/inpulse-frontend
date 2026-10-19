import { test, expect } from "@playwright/test";
const url = "/tests/crm-users/index.html";
for (const catalog of ["user-groups", "shifts", "pause-reasons", "sales-types"])
  test(`${catalog}: complete catalog workflow preserves snapshots`, async ({ page }) => {
    await page.goto(`${url}?catalog=${catalog}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Recarregar", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: /^Cadastrar/ }).click();
    let dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Código", { exact: true })
      .fill(catalog === "sales-types" ? "0022" : "22");
    await dialog
      .getByLabel(catalog === "sales-types" ? "Nome" : "Descrição", { exact: false })
      .first()
      .fill("Cadastro novo");
    if (catalog === "sales-types")
      await dialog.getByLabel("Pagamento", { exact: false }).fill("1,25");
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Registro salvo com sucesso.")).toBeVisible();
    const id = catalog === "sales-types" ? "0022" : "22";
    await page.getByRole("button", { name: `Editar ${id}`, exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByLabel(catalog === "sales-types" ? "Nome" : "Descrição", { exact: false })
      .first()
      .fill("Cadastro alterado");
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("cell", { name: "Cadastro alterado", exact: true })).toBeVisible();
    const writes = await page.evaluate(() => window.userTest.writes);
    expect(writes.at(-1)?.context).toEqual({ token: "token-a", instance: "tenant-a" });
    expect((writes.at(-1)?.data as { expected: Record<string, unknown> }).expected).toMatchObject(
      catalog === "sales-types"
        ? { ID: "0022", NOME: "Cadastro novo", PAGAMENTO: "1.25" }
        : { DESCRICAO: "Cadastro novo" },
    );
    await page.getByRole("button", { name: `Excluir ${id}`, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(page.getByText("Registro excluído com sucesso.")).toBeVisible();
  });
test("shift flag changes preserve overnight and historical intervals", async ({ page }) => {
  await page.goto(`${url}?catalog=shifts`);
  await page.getByRole("button", { name: "Editar 1", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Entrada 2", { exact: true })).toHaveValue("-838:59:59");
  await dialog.getByRole("combobox", { name: /^Usar intervalo 1/ }).click();
  await page.getByRole("option", { name: "Não", exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  const payload = await page.evaluate(() => window.userTest.writes.at(-1)?.data);
  expect(payload).toMatchObject({
    changes: { HORARIO_1: "NAO" },
    expected: { ENTRADA_1: "23:30:00", SAIDA_1: "04:15:00", ENTRADA_2: "-838:59:59" },
  });
});
test("sales duplicate identities stay visible with mutations disabled", async ({ page }) => {
  await page.goto(`${url}?catalog=sales-types&duplicate`);
  await expect(page.getByText(/Há códigos compartilhados/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar 0001", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Excluir 0001", exact: true })).toBeDisabled();
});
test("group membership adds a real user and removes only its association", async ({ page }) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Membros", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Membros · Equipe inicial" });
  await dialog.getByLabel("Código do vínculo", { exact: true }).fill("55");
  await dialog.getByRole("combobox", { name: "Usuário" }).click();
  await page.getByRole("option", { name: "João (#43)", exact: true }).click();
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog.getByRole("cell", { name: "João (#43)", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Remover membro 55", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Remover usuário do grupo?" })
    .getByRole("button", { name: "Remover vínculo", exact: true })
    .click();
  await expect(dialog.getByText("Nenhum membro neste grupo.")).toBeVisible();
  expect(await page.evaluate(() => window.userTest.writes.map((write) => write.data))).toEqual([
    { CODIGO: 55, OPERADOR: 43 },
    { expected: { OPERADOR: 43 } },
  ]);
});
test("registration edits with an opaque version and never refills or resends a password", async ({
  page,
}) => {
  await page.goto(`${url}?registration`);
  const dialog = page.getByRole("dialog", { name: "Editar usuário #42" });
  await expect(dialog.getByLabel("Senha", { exact: true })).toHaveValue("");
  await dialog.getByLabel("Nome", { exact: true }).fill("Maria Silva");
  await dialog.getByRole("button", { name: "Salvar usuário", exact: true }).click();
  await expect(dialog.getByText("Usuário atualizado.")).toBeVisible();
  expect(await page.evaluate(() => window.userTest.writes.at(-1))).toMatchObject({
    operation: "update-registration",
    data: { changes: { NOME: "Maria Silva" }, version: "opaque-v1" },
    context: { token: "token-a", instance: "tenant-a" },
  });
  await expect(dialog.getByLabel("Senha", { exact: true })).toHaveValue("");
});
test("new registration keeps avatar selection separate from submit and then allows a shift", async ({
  page,
}) => {
  await page.goto(`${url}?registration&new`);
  let dialog = page.getByRole("dialog", { name: "Novo usuário" });
  await dialog.getByLabel("Nome", { exact: false }).first().fill("Novo usuário");
  await dialog.getByLabel("Login", { exact: false }).fill("novo-usuario");
  await dialog.getByLabel("Senha", { exact: false }).fill("senha-de-teste");
  await dialog.getByRole("combobox", { name: /^Perfil de acesso/ }).click();
  await page.getByRole("option", { name: "Administrador", exact: true }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await dialog.getByRole("button", { name: "Selecionar imagem", exact: true }).click();
  await (
    await chooserPromise
  ).setFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSFEAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  expect(await page.evaluate(() => window.userTest.writes.length)).toBe(0);
  await dialog.getByRole("button", { name: "Salvar usuário", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Editar usuário #70" });
  await expect(
    dialog.getByText("Usuário cadastrado. Você já pode associar um expediente."),
  ).toBeVisible();
  expect(await page.evaluate(() => window.userTest.writes[0].data)).toMatchObject({
    NOME: "Novo usuário",
    LOGIN: "novo-usuario",
    SENHA: "senha-de-teste",
    NIVEL: "ADMIN",
    AVATAR_ID: 77,
  });
  await dialog.getByRole("combobox", { name: /^Expediente/ }).click();
  await page.getByRole("option", { name: "Diurno (2)", exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar expediente", exact: true }).click();
  await expect(dialog.getByText("Expediente atualizado.")).toBeVisible();
  expect(await page.evaluate(() => window.userTest.writes.at(-1)?.data)).toEqual({
    HORARIO: 2,
    expected: { HORARIO: 0 },
  });
});
test("shift removal requires confirmation and sends explicit null", async ({ page }) => {
  await page.goto(`${url}?registration`);
  const dialog = page.getByRole("dialog", { name: "Editar usuário #42" });
  await dialog.getByRole("button", { name: "Remover expediente", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Remover expediente do usuário?" })
    .getByRole("button", { name: "Remover vínculo", exact: true })
    .click();
  await expect(dialog.getByText("Expediente atualizado.")).toBeVisible();
  expect(await page.evaluate(() => window.userTest.writes.at(-1)?.data)).toEqual({
    HORARIO: null,
    expected: { HORARIO: 0 },
  });
});
test("registration conflict preserves draft until explicit authoritative reload", async ({
  page,
}) => {
  await page.goto(`${url}?registration`);
  const dialog = page.getByRole("dialog", { name: "Editar usuário #42" });
  await dialog.getByLabel("Nome", { exact: true }).fill("Meu rascunho");
  await page.evaluate(() => {
    window.userTest.failure = "conflict";
    window.userTest.detail.record.NOME = "Outra edição";
  });
  await dialog.getByRole("button", { name: "Salvar usuário", exact: true }).click();
  await expect(dialog.getByText(/Seu rascunho foi preservado/)).toBeVisible();
  await expect(dialog.getByLabel("Nome", { exact: true })).toHaveValue("Meu rascunho");
  await expect(dialog.getByRole("button", { name: "Salvar usuário", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Recarregar cadastro", exact: true }).click();
  await page.getByRole("button", { name: "Descartar rascunho", exact: true }).click();
  await expect(dialog.getByLabel("Nome", { exact: true })).toHaveValue("Outra edição");
});
for (const failure of ["unknown", "network"])
  test(`registration ${failure} does not repeat a write`, async ({ page }) => {
    await page.goto(`${url}?registration`);
    const dialog = page.getByRole("dialog", { name: "Editar usuário #42" });
    await dialog.getByLabel("Nome", { exact: true }).fill("Nome em revisão");
    await page.evaluate((failure) => {
      window.userTest.failure = failure;
    }, failure);
    await dialog.getByRole("button", { name: "Salvar usuário", exact: true }).click();
    await expect(dialog.getByText(/Não foi possível confirmar a gravação/)).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Salvar usuário", exact: true }),
    ).toBeDisabled();
    expect(await page.evaluate(() => window.userTest.writes.length)).toBe(1);
  });
test("token renewal during registration preserves its original request context", async ({
  page,
}) => {
  await page.goto(`${url}?registration`);
  const dialog = page.getByRole("dialog", { name: "Editar usuário #42" });
  await dialog.getByLabel("Nome", { exact: true }).fill("Gravação pendente");
  await page.evaluate(() => {
    window.userTest.delay = 900;
  });
  await dialog.getByRole("button", { name: "Salvar usuário", exact: true }).click();
  await page
    .getByRole("button", { name: "Renovar sessão", exact: true, includeHidden: true })
    .click({ force: true });
  await expect(
    dialog.getByText(
      "Sua sessão mudou durante a gravação. Recarregue o cadastro antes de continuar.",
    ),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Salvar usuário", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.userTest.writes[0].context)).toEqual({
    token: "token-a",
    instance: "tenant-a",
  });
});
for (const query of ["?operator", "?registration&operator"])
  test(`non-admin cannot load ${query}`, async ({ page }) => {
    await page.goto(`${url}${query}`);
    await expect(page.getByText("Acesso restrito a administradores.")).toBeVisible();
    expect(await page.evaluate(() => window.userTest.reads)).toEqual([]);
  });
test("dark mobile registration keeps actions visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url}?registration&dark`);
  await expect(page.getByRole("button", { name: "Salvar usuário", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("crm-users-registration-dark-mobile.png"), animations: "disabled" });
});
