import { expect, test } from "@playwright/test";
const base = "/tests/crm-marketing/index.html";
test("creates a campaign with explicit identity, preserved nullable defaults and no writable SQL", async ({
  page,
}) => {
  await page.goto(base);
  await expect(page.getByText("Campanha A", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Novo cadastro", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Código", { exact: true }).fill("12");
  await dialog.getByLabel("Nome", { exact: true }).fill("Campanha nova");
  await expect(dialog.getByLabel("Seleção da campanha")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Cadastro salvo.")).toBeVisible();
  const calls = await page.evaluate(() => (window as any).crmHarness.calls());
  expect(calls.at(-1)).toMatchObject({
    name: "create",
    instance: "tenant-a",
    token: "token-a",
    payload: { CODIGO: 12, NOME: "Campanha nova", DATA_INI: null, PRIORIDADE: 0 },
  });
  expect(calls.at(-1).payload.SQL_CAMPANHA).toBeUndefined();
  await page.screenshot({ path: "test-results-crm-marketing/crm-marketing-desktop.png", fullPage: true });
});
test("conflict keeps the draft and requires explicit authoritative reload", async ({ page }) => {
  await page.goto(base);
  await page.getByRole("button", { name: "Editar Campanha A", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Rascunho");
  await page.evaluate(() => (window as any).crmHarness.fault("conflict"));
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByLabel("Nome", { exact: true })).toHaveValue("Rascunho");
  await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Conferir dados", exact: true }).click();
  await expect(dialog.getByLabel("Nome", { exact: true })).toHaveValue("Campanha A");
  await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeEnabled();
});
test("ambiguous applied write survives closing and reopening until read confirmation", async ({
  page,
}) => {
  await page.goto(base);
  await page.getByRole("button", { name: "Editar Campanha A", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Aplicada");
  await page.evaluate(() => (window as any).crmHarness.fault("unknown"));
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Novo cadastro", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Conferir dados", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Nome", { exact: true })).toHaveValue(
    "Aplicada",
  );
});
test("a token change during a pending write keeps the original token and blocks another write", async ({
  page,
}) => {
  await page.goto(base);
  await page.getByRole("button", { name: "Editar Campanha A", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Atualizada");
  await page.evaluate(() => (window as any).crmHarness.fault("delay"));
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.evaluate(() => (window as any).crmHarness.switchAuth("tenant-a", "refreshed-token"));
  await page.evaluate(() => (window as any).crmHarness.release());
  await expect(dialog.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
  expect(
    (await page.evaluate(() => (window as any).crmHarness.calls())).find(
      (call: any) => call.name === "patch",
    ).token,
  ).toBe("token-a");
});
test("changing tenant discards the old editor and cannot apply a late old write", async ({
  page,
}) => {
  await page.goto(base);
  await page.getByRole("button", { name: "Editar Campanha A", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Antiga");
  await page.evaluate(() => (window as any).crmHarness.fault("delay"));
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.evaluate(() => (window as any).crmHarness.switchAuth("tenant-b", "token-b"));
  await page.evaluate(() => (window as any).crmHarness.release());
  await expect(page.getByText("Campanha B", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Antiga", { exact: true })).toHaveCount(0);
});
test("result editor uses tenant actions and keeps explicit outcome flags", async ({ page }) => {
  await page.goto(`${base}?panel=results`);
  await page.getByRole("button", { name: "Editar Contato", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ação do CRM", { exact: true }).click();
  await page.getByRole("option", { name: "Reagendar (10)", exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Cadastro salvo.")).toBeVisible();
  expect(
    (await page.evaluate(() => (window as any).crmHarness.calls())).at(-1).payload,
  ).toMatchObject({
    changes: { COD_ACAO: 10 },
    expected: { ECONTATO: "SIM", EVENDA: null, COD_ACAO: null },
  });
});
test("customer exceptions preserve ERP zeroes and support delete", async ({ page }) => {
  await page.goto(`${base}?panel=exceptions`);
  await page.getByRole("tab", { name: "Clientes", exact: true }).click();
  await page.getByRole("button", { name: "Nova exceção", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Código ERP do cliente", { exact: true }).fill("0009");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Exceção salva.")).toBeVisible();
  await page.getByRole("button", { name: "Excluir exceção 0009", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page.getByText("Exceção excluída.")).toBeVisible();
  expect(
    (await page.evaluate(() => (window as any).crmHarness.calls())).filter(
      (call: any) => call.name === "createException",
    )[0].payload,
  ).toEqual({ COD_ERP: "0009" });
});
test("exception ambiguity gate survives switching tabs", async ({ page }) => {
  await page.goto(`${base}?panel=exceptions`);
  await page.getByRole("button", { name: "Nova exceção", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome da cidade", { exact: true }).fill("Nova cidade");
  await page.evaluate(() => (window as any).crmHarness.fault("unknown"));
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await page.getByRole("tab", { name: "Estados", exact: true }).click();
  await page.getByRole("tab", { name: "Cidades", exact: true }).click();
  await expect(page.getByRole("button", { name: "Nova exceção", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Conferir dados", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Nome da cidade", { exact: true })).toHaveValue(
    "Nova cidade",
  );
});
test("configuration requires a preview before persisting structured criteria", async ({ page }) => {
  await page.goto(`${base}?panel=configuration`);
  await expect(page.getByRole("button", { name: "Salvar critérios", exact: true })).toBeDisabled();
  await page.getByLabel("Situação dos clientes", { exact: true }).click();
  await page.getByRole("option", { name: "Inativos", exact: true }).click();
  await page.getByRole("button", { name: "Prévia do público", exact: true }).click();
  await expect(page.getByText("3 clientes na prévia", { exact: true })).toBeVisible();
  await page.getByText("Configurar campanha 10", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results-crm-marketing/crm-marketing-configuration.png", fullPage: true });
  await page.getByRole("button", { name: "Salvar critérios", exact: true }).click();
  await expect(
    page.getByText("Critérios salvos. A lista está marcada para geração."),
  ).toBeVisible();
  expect(
    (await page.evaluate(() => (window as any).crmHarness.calls())).find(
      (call: any) => call.name === "configure",
    ).payload.criteria.active,
  ).toBe("NAO");
});
test("unsaved configuration criteria survive a token refresh", async ({ page }) => {
  await page.goto(`${base}?panel=configuration`);
  await page.getByLabel("Situação dos clientes", { exact: true }).click();
  await page.getByRole("option", { name: "Inativos", exact: true }).click();
  await page.evaluate(() => (window as any).crmHarness.switchAuth("tenant-a", "refreshed-token"));
  await expect(page.getByRole("combobox", { name: /Situação dos clientes/ })).toHaveText(
    "Inativos",
  );
});
test("generation previews a responsible user and sends only the guarded eligible batch", async ({
  page,
}) => {
  await page.goto(`${base}?panel=configuration`);
  await page.getByLabel("Usuário dos agendamentos", { exact: true }).fill("Ana");
  await page.getByRole("option", { name: "Ana (7)", exact: true }).click();
  await page.getByLabel("Data e hora no CRM", { exact: true }).fill("2026-10-20T09:00");
  await page.getByRole("button", { name: "Prévia dos agendamentos", exact: true }).click();
  await expect(page.getByText(/3 novos agendamentos elegíveis/)).toBeVisible();
  await page.getByRole("button", { name: "Gerar 3 agendamentos", exact: true }).click();
  await expect(page.getByText("3 agendamentos gerados.", { exact: true })).toBeVisible();
  expect(
    (await page.evaluate(() => (window as any).crmHarness.calls())).find(
      (call: any) => call.name === "generate",
    ).payload,
  ).toMatchObject({
    operatorId: 7,
    expectedCount: 3,
    scheduledAt: "2026-10-20 09:00:00",
    expected: { GERADO_LISTA: "NAO" },
  });
});
test("ordering moves controlled criteria and preserves the full original snapshot", async ({
  page,
}) => {
  await page.goto(`${base}?panel=ordering`);
  await page
    .getByRole("button", { name: "Subir Ordem de cadastro na campanha", exact: true })
    .click();
  await page.getByRole("button", { name: "Salvar ordem", exact: true }).click();
  await expect(page.getByText("Ordem dos critérios salva.")).toBeVisible();
  expect(
    (await page.evaluate(() => (window as any).crmHarness.calls())).at(-1).payload,
  ).toMatchObject({
    criteria: ["CADASTRO", "POTENCIAL"],
    expected: { CODIGO: 5, ORDENACAO_APENAS_CIDADE: "N" },
  });
});
test("mobile and dark editors keep controls inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}?panel=results&dark=1`);
  await page.getByRole("button", { name: "Editar Contato", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }),
  ).toBeInViewport();
  await expect(page.locator(".MuiDialog-container")).toHaveCSS("opacity", "1");
  const bounds = await page.getByRole("dialog").boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results-crm-marketing/crm-marketing-mobile-dark.png", fullPage: true });
});
test("landscape keeps the result form footer reachable without covering the editor", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(`${base}?panel=results`);
  await page.getByRole("button", { name: "Editar Contato", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true })).toBeInViewport();
  await page.getByRole("dialog").getByLabel("Nome", { exact: true }).fill("Contato paisagem");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Cadastro salvo.")).toBeVisible();
});
