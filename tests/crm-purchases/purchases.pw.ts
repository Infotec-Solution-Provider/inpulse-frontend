import { expect, test, type Page } from "@playwright/test";
const url = "/tests/crm-purchases/index.html";
async function fillNew(page: Page) {
  await page.getByRole("button", { name: "Novo lançamento", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Novo lançamento de venda" });
  await dialog.getByRole("combobox", { name: "Cliente", exact: true }).click();
  await page.getByRole("option", { name: "Cliente 2 (#2)", exact: true }).click();
  await dialog.getByLabel("Data", { exact: true }).fill("2026-10-19");
  await dialog.getByLabel("Valor (R$)", { exact: true }).fill("1.250,50");
  await dialog.getByLabel("Descrição", { exact: true }).fill("Compra nova");
  await dialog.getByLabel("Forma de pagamento", { exact: true }).fill("PIX");
  return dialog;
}
test("creates a purchase using real paginated customer and operator options", async ({ page }) => {
  await page.goto(url);
  const dialog = await fillNew(page);
  await dialog.getByRole("combobox", { name: "Cliente", exact: true }).click();
  await expect(page.getByRole("option", { name: "Cliente 25 (#25)", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Carregar mais clientes", exact: true }).click();
  await page.getByRole("option", { name: "Cliente 25 (#25)", exact: true }).click();
  await dialog.getByRole("combobox", { name: "Usuário", exact: true }).fill("Usuário 22");
  await page.getByRole("option", { name: "Usuário 22 (#22)", exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar lançamento", exact: true }).click();
  await expect(page.getByText("Lançamento criado.")).toBeVisible();
  expect(await page.evaluate(() => window.purchaseTest.writes.at(-1))).toMatchObject({
    operation: "create",
    body: {
      CLIENTE: 25,
      OPERADOR: 22,
      VALOR: "1250.50",
      DATA: "2026-10-19",
      DESCRICAO: "Compra nova",
      FORMA_PGTO: "PIX",
    },
    context: { instance: "tenant-a", token: "token-a" },
  });
});
test("editing a description preserves a historical DOUBLE and submits its opaque version", async ({
  page,
}) => {
  await page.goto(url);
  await expect(page.getByRole("cell", { name: "R$ 1.234,56789012345", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar lançamento 1", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Editar lançamento #1" });
  await expect(dialog.getByLabel("Valor (R$)", { exact: true })).toHaveValue("1234.56789012345");
  await expect(dialog.getByRole("combobox", { name: "Cliente", exact: true })).toBeDisabled();
  await dialog.getByLabel("Descrição", { exact: true }).fill("Descrição corrigida");
  await dialog.getByRole("button", { name: "Salvar lançamento", exact: true }).click();
  await expect(page.getByText("Lançamento atualizado.")).toBeVisible();
  expect(await page.evaluate(() => window.purchaseTest.writes.at(-1)?.body)).toEqual({
    changes: { DESCRICAO: "Descrição corrigida" },
    version: "a".repeat(64),
  });
});
test("clears an explicit historical operator association with null", async ({ page }) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Editar lançamento 1", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Editar lançamento #1" });
  await dialog.getByRole("combobox", { name: "Usuário", exact: true }).hover();
  await dialog.getByRole("button", { name: "Limpar usuário", exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar lançamento", exact: true }).click();
  await expect(page.getByText("Lançamento atualizado.")).toBeVisible();
  expect(await page.evaluate(() => window.purchaseTest.writes.at(-1)?.body)).toEqual({
    changes: { OPERADOR: null },
    version: "a".repeat(64),
  });
});
test("deletes only after confirmation and blocks referenced or uncertain deletions", async ({
  page,
}) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Excluir lançamento 1", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Excluir lançamento #1?" });
  await page.evaluate(() => {
    window.purchaseTest.failure = "in-use";
  });
  await dialog.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(dialog.getByText(/Feche e recarregue/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Excluir", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.purchaseTest.writes)).toHaveLength(1);
  await dialog.getByRole("button", { name: "Conferir listagem", exact: true }).click();
  await page.evaluate(() => {
    window.purchaseTest.failure = "";
  });
  await page.getByRole("button", { name: "Excluir lançamento 1", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Excluir lançamento #1?" });
  await dialog.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page.getByText("Lançamento excluído.")).toBeVisible();
  await expect(page.getByText("Nenhum lançamento encontrado.")).toBeVisible();
});
test("a list started during an uncertain deletion cannot unlock another deletion", async ({
  page,
}) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Excluir lançamento 1", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Excluir lançamento #1?" });
  await page.evaluate(() => {
    window.purchaseTest.failure = "unknown";
    window.purchaseTest.delay = 500;
    window.purchaseTest.readDelay = 1000;
  });
  await dialog.getByRole("button", { name: "Excluir", exact: true }).click();
  await page
    .getByRole("button", { name: "Renovar sessão", exact: true, includeHidden: true })
    .click({ force: true });
  await expect(dialog.getByText(/Feche e recarregue/)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.purchaseTest.completedReads))
    .toBeGreaterThanOrEqual(2);
  await expect(dialog.getByRole("button", { name: "Excluir", exact: true })).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Conferir listagem", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.purchaseTest.writes)).toHaveLength(1);
});

test("conflict preserves the draft and requires an explicit authoritative reload", async ({
  page,
}) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Editar lançamento 1", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Editar lançamento #1" });
  await dialog.getByLabel("Descrição", { exact: true }).fill("Rascunho local");
  await page.evaluate(() => {
    window.purchaseTest.failure = "conflict";
    window.purchaseTest.rows[0].record.DESCRICAO = "Outro editor";
    window.purchaseTest.rows[0].version = "d".repeat(64);
  });
  await dialog.getByRole("button", { name: "Salvar lançamento", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Salvar lançamento", exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByLabel("Descrição", { exact: true })).toHaveValue("Rascunho local");
  await dialog.getByRole("button", { name: "Recarregar cadastro", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Descartar alterações?" })
    .getByRole("button", { name: "Descartar", exact: true })
    .click();
  await expect(dialog.getByLabel("Descrição", { exact: true })).toHaveValue("Outro editor");
});
test("unknown creation requires checking the list and never automatically repeats", async ({
  page,
}) => {
  await page.goto(url);
  const dialog = await fillNew(page);
  await page.evaluate(() => {
    window.purchaseTest.failure = "unknown";
  });
  await dialog.getByRole("button", { name: "Salvar lançamento", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("pode ter sido gravado");
  await expect(
    dialog.getByRole("button", { name: "Salvar lançamento", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Conferir lançamentos", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => window.purchaseTest.writes)).toHaveLength(1);
});
test("pending writes retain their original tenant and are discarded by the next scope", async ({
  page,
}) => {
  await page.goto(url);
  const dialog = await fillNew(page);
  await page.evaluate(() => {
    window.purchaseTest.delay = 600;
  });
  await dialog.getByRole("button", { name: "Salvar lançamento", exact: true }).click();
  await page
    .getByRole("button", { name: "Trocar empresa", exact: true, includeHidden: true })
    .click({ force: true });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Lançamento criado.")).toHaveCount(0);
  expect(await page.evaluate(() => window.purchaseTest.writes[0].context)).toEqual({
    instance: "tenant-a",
    token: "token-a",
  });
});
test("same-actor token renewal during a write blocks further submission without changing its context", async ({
  page,
}) => {
  await page.goto(url);
  const dialog = await fillNew(page);
  await page.evaluate(() => {
    window.purchaseTest.delay = 600;
  });
  await dialog.getByRole("button", { name: "Salvar lançamento", exact: true }).click();
  await page
    .getByRole("button", { name: "Renovar sessão", exact: true, includeHidden: true })
    .click({ force: true });
  await expect(dialog.getByRole("alert")).toContainText("Sua sessão mudou");
  await expect(
    dialog.getByRole("button", { name: "Salvar lançamento", exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate(() => window.purchaseTest.writes)).toHaveLength(1);
});
test("filtering and ordering are requested from the server and a new search resets pagination", async ({
  page,
}) => {
  await page.goto(url);
  await page.getByLabel("Buscar descrição", { exact: true }).fill("Compra inicial");
  await page.getByLabel("Data inicial", { exact: true }).fill("2026-10-01");
  await page.getByLabel("Data final", { exact: true }).fill("2026-10-31");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.purchaseTest.reads.at(-1)))
    .toMatchObject({
      page: 1,
      perPage: 10,
      search: "Compra inicial",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-31",
      sortBy: "DATA",
      sortDirection: "desc",
    });
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.purchaseTest.reads.at(-1)?.search))
    .toBeUndefined();
});
test("deleting the last item on a later page returns to the previous valid page", async ({
  page,
}) => {
  await page.goto(url);
  await page.evaluate(() => {
    const first = window.purchaseTest.rows[0];
    window.purchaseTest.rows = Array.from({ length: 11 }, (_, index) => ({
      ...structuredClone(first),
      record: { ...structuredClone(first.record), CODIGO: index + 1 },
    }));
  });
  await page.getByRole("button", { name: "Recarregar", exact: true }).click();
  await page.getByRole("button", { name: "Próxima página", exact: true }).click();
  await page.getByRole("button", { name: "Excluir lançamento 11", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Editar lançamento 1", exact: true }),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.purchaseTest.reads.at(-1)?.page)).toBe(1);
});

test("non-administrators cannot open direct administration or query its endpoints", async ({
  page,
}) => {
  await page.goto(`${url}?operator`);
  await expect(page.getByText("Acesso restrito a administradores.")).toBeVisible();
  expect(await page.evaluate(() => window.purchaseTest.reads)).toEqual([]);
});
test("dark mobile form keeps actions inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url}?dark`);
  const dialog = await fillNew(page);
  const save = await dialog
    .getByRole("button", { name: "Salvar lançamento", exact: true })
    .boundingBox();
  expect(save).not.toBeNull();
  expect(save!.y + save!.height).toBeLessThanOrEqual(844);
  await page.screenshot({
    path: "C:/Workspace/infotec/planejamento/cross-service/INF-20261019-001-crm-web-paridade/artifacts/crm-purchases-dark-mobile.png",
    animations: "disabled",
    caret: "hide",
  });
  await page.setViewportSize({ width: 844, height: 390 });
  const landscape = await dialog
    .getByRole("button", { name: "Salvar lançamento", exact: true })
    .boundingBox();
  expect(landscape!.y + landscape!.height).toBeLessThanOrEqual(390);
});
