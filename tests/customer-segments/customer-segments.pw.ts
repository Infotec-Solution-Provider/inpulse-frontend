import { expect, test, type Page } from "@playwright/test";

async function search(page: Page, name: string) {
  await page.getByRole("textbox", { name: "Buscar por nome", exact: true }).fill(name);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByLabel("Carregando segmentos")).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/customer-segments/index.html");
  await expect(page.getByRole("heading", { name: "Segmentos", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Atacado");
});

test("loads the real page with server pagination, sort and literal filters", async ({ page }) => {
  await expect(page.getByText("1–20 de 26", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Próxima página" }).click();
  await expect(page.getByText("21–26 de 26", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Sem nome");
  await page.getByRole("button", { name: "Código", exact: true }).click();
  await expect(page.getByText("1–20 de 26", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.segmentTest.reads.at(-1)))
    .toMatchObject({ page: 1, sortBy: "CODIGO", sortDirection: "asc" });
  await search(page, "Não existe %_");
  await expect(page.getByRole("table")).toContainText(
    "Nenhum segmento encontrado para esses filtros.",
  );
  expect(await page.evaluate(() => window.segmentTest.reads.at(-1)?.NOME)).toBe("Não existe %_");
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByRole("textbox", { name: "Código", exact: true }).fill("0");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(page.getByText("1–1 de 1", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Código 0");
});

test("creates with database defaults and refreshes tenant consumers", async ({ page }) => {
  await page.getByRole("button", { name: "Novo segmento" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
  await dialog.getByRole("textbox", { name: "Nome", exact: true }).fill("  Serviços  ");
  await expect(dialog.getByRole("combobox", { name: /^Unidade/ })).toBeEnabled();
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("cadastrado com sucesso");
  expect(await page.evaluate(() => window.segmentTest.creates)).toEqual([{ NOME: "Serviços" }]);
  expect(
    await page.evaluate(() => [window.segmentTest.invalidations, window.segmentTest.published]),
  ).toEqual([1, 1]);
});
test("sets and clears a segment unit using real options", async ({ page }) => {
  await page.getByRole("button", { name: "Editar segmento Atacado", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: /^Unidade/ }).click();
  await page.getByRole("option", { name: "Filial (#15)", exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.segmentTest.updates.at(-1)?.data.changes)).toEqual({
    COD_UNIDADE: 15,
  });
  await page.getByRole("button", { name: "Editar segmento Atacado", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: /^Unidade/ }).click();
  await page.getByRole("option", { name: "Sem unidade", exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.segmentTest.updates.at(-1)?.data.changes)).toEqual({
    COD_UNIDADE: null,
  });
});
test("deletes only the selected segment and shows dependency refusal", async ({ page }) => {
  await page.evaluate(() => {
    window.segmentTest.saveError = "CATALOG_IN_USE";
  });
  await page.getByRole("button", { name: "Excluir segmento Atacado", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(
    dialog.getByText("Este segmento possui vínculos e não pode ser excluído."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.evaluate(() => {
    window.segmentTest.saveError = null;
  });
  await page.getByRole("button", { name: "Excluir segmento Atacado", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("Segmento excluído com sucesso.");
  expect(await page.evaluate(() => window.segmentTest.rows.some((row) => row.CODIGO === 1))).toBe(
    false,
  );
});

test("edits changed fields with full original precondition including unit", async ({ page }) => {
  await page.getByRole("button", { name: "Editar segmento Atacado", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("combobox", { name: /^Unidade/ })).toContainText("Matriz (#12)");
  await dialog.getByRole("textbox", { name: "Ordem", exact: true }).fill("");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.segmentTest.updates)).toEqual([
    {
      id: 1,
      data: { changes: { ordem: null }, expected: { NOME: "Atacado", ordem: 7, COD_UNIDADE: 12 } },
    },
  ]);
});

test("keeps a draft after conflict and reloads only on explicit action", async ({ page }) => {
  await page.getByRole("button", { name: "Editar segmento Atacado", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Nome", exact: true }).fill("Meu rascunho");
  await page.evaluate(() => {
    window.segmentTest.saveError = "SEGMENT_CHANGED";
    window.segmentTest.rows.find((row) => row.CODIGO === 1)!.NOME = "Alterado por outra pessoa";
  });
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Seu rascunho foi mantido");
  await expect(dialog.getByRole("textbox", { name: "Nome", exact: true })).toHaveValue(
    "Meu rascunho",
  );
  await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Descartar rascunho e recarregar dados atuais", exact: true })
    .click();
  await expect(dialog.getByRole("textbox", { name: "Nome", exact: true })).toHaveValue(
    "Alterado por outra pessoa",
  );
  await page.evaluate(() => {
    window.segmentTest.saveError = null;
  });
  await dialog.getByRole("textbox", { name: "Nome", exact: true }).fill("Minha revisão");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.segmentTest.updates.at(-1)?.data.expected.NOME)).toBe(
    "Alterado por outra pessoa",
  );
});

test("lets the user correct duplicate names without discarding the draft", async ({ page }) => {
  await page.getByRole("button", { name: "Novo segmento" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Nome", exact: true }).fill("Atacado");
  await page.evaluate(() => {
    window.segmentTest.saveError = "SEGMENT_DUPLICATE_NAME";
  });
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Já existe um segmento com esse nome");
  await expect(dialog.getByRole("textbox", { name: "Nome", exact: true })).toHaveValue("Atacado");
  await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    window.segmentTest.saveError = null;
  });
  await dialog.getByRole("textbox", { name: "Nome", exact: true }).fill("Distribuição");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

for (const failure of ["SEGMENT_WRITE_UNKNOWN", "NETWORK_ERROR"]) {
  test(`does not repeat a write whose outcome is unknown (${failure})`, async ({ page }) => {
    await page.getByRole("button", { name: "Novo segmento" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Nome", exact: true }).fill("Resultado incerto");
    await page.evaluate((failure) => {
      window.segmentTest.saveError = failure;
    }, failure);
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Não foi possível confirmar");
    await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("textbox", { name: "Nome", exact: true })).toHaveValue(
      "Resultado incerto",
    );
    expect(await page.evaluate(() => window.segmentTest.creates.length)).toBe(1);
  });
}

test("validates order and confirms discarding unsaved changes", async ({ page }) => {
  await page.getByRole("button", { name: "Editar segmento Atacado", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Editar segmento" });
  await editor.getByRole("textbox", { name: "Ordem", exact: true }).fill("2147483648");
  await expect(
    editor.getByText("Informe um número inteiro entre -2147483648 e 2147483647."),
  ).toBeVisible();
  await expect(editor.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
  await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar editando", exact: true }).click();
  await expect(editor.getByRole("textbox", { name: "Ordem", exact: true })).toHaveValue(
    "2147483648",
  );
  await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => window.segmentTest.updates)).toHaveLength(0);
});

test("distinguishes failed loading, retry and empty result", async ({ page }) => {
  await page.goto("/tests/customer-segments/index.html?load-error");
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar os segmentos");
  await expect(page.getByText("Nenhum segmento cadastrado.")).toHaveCount(0);
  await page.evaluate(() => {
    window.segmentTest.failLoad = false;
    window.segmentTest.rows = [];
  });
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.getByRole("table")).toContainText("Nenhum segmento cadastrado.");
});

test("rejects non-admin users before any service read", async ({ page }) => {
  await page.goto("/tests/customer-segments/index.html?operator");
  await expect(page.getByRole("alert")).toContainText("Acesso restrito a administradores");
  await expect(page.getByRole("button", { name: "Novo segmento" })).toHaveCount(0);
  expect(await page.evaluate(() => window.segmentTest.reads)).toHaveLength(0);
});

test("fits mobile and landscape with the table scrolling inside its card", async ({ page }) => {
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/customer-segments-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Novo segmento" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("renders the dark appearance and desktop editing state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/customer-segments-desktop.png",
    animations: "disabled",
  });
  await page.goto("/tests/customer-segments/index.html?dark");
  await expect(page.getByRole("table")).toContainText("Atacado");
  await page.getByRole("button", { name: "Editar segmento Atacado", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({
    path: "test-results/customer-segments-dark-dialog.png",
    animations: "disabled",
  });
});
