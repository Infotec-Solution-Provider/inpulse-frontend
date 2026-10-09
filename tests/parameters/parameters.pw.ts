import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/parameters/index.html");
  await expect(page.getByRole("heading", { name: "Parâmetros", exact: true })).toBeVisible();
});

test("preserves drafts across tabs and saves only the selected system", async ({ page }) => {
  const whatsappToggle = page.getByRole("checkbox", {
    name: "Aprovar exclusão de contatos",
    exact: true,
  });
  await whatsappToggle.check();
  await page.getByRole("tab", { name: "CRM", exact: true }).click();
  await page.getByRole("checkbox", { name: "Validar CPF e CNPJ", exact: true }).check();
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Nenhuma alteração pendente" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "WhatsApp", exact: true }).click();
  await expect(whatsappToggle).toBeChecked();
  await expect(page.getByRole("status").filter({ hasText: "1 alteração" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  const state = await page.evaluate(() => window.parameterTest);
  expect(state.calls.map((call) => call.source)).toEqual(["crm", "whatsapp"]);
  expect(state.calls[0].changes[0]).toEqual({
    key: "VALIDA_CPF_CNPJ",
    value: "SIM",
    previousValue: "NAO",
  });
  expect(state.calls[1].changes[0]).toEqual({
    key: "require_supervisor_approval_for_contact_deletion",
    value: "true",
    previousValue: null,
  });
  expect(state.refreshes).toBe(1);
});

test("converts minutes, restores the default and leaves other settings untouched", async ({
  page,
}) => {
  const time = page.getByRole("spinbutton", { name: "Tempo de inatividade", exact: true });
  await expect(time).toHaveValue("60");
  await time.fill("45");
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Nenhuma alteração pendente" }),
  ).toBeVisible();
  expect((await page.evaluate(() => window.parameterTest.calls))[0].changes).toEqual([
    { key: "chat_auto_finish_idle_time", value: "2700000", previousValue: "3600000" },
  ]);
  await page
    .getByRole("button", { name: "Usar padrão: Tempo de inatividade", exact: true })
    .click();
  await expect(time).toHaveValue("30");
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Nenhuma alteração pendente" }),
  ).toBeVisible();
  expect((await page.evaluate(() => window.parameterTest.calls))[1].changes).toEqual([
    { key: "chat_auto_finish_idle_time", value: null, previousValue: "2700000" },
  ]);
});

test("validates numbers, retains drafts on save failure, and supports discard", async ({
  page,
}) => {
  const time = page.getByRole("spinbutton", { name: "Tempo de inatividade", exact: true });
  await time.fill("0");
  await expect(page.getByRole("button", { name: "Salvar alterações", exact: true })).toBeDisabled();
  await time.fill("40");
  await page.evaluate(() => {
    window.parameterTest.failSave = true;
  });
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Suas alterações foram mantidas" }),
  ).toBeVisible();
  await expect(time).toHaveValue("40");
  await expect(page.getByRole("button", { name: "Recarregar", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Descartar alterações", exact: true }).click();
  await expect(time).toHaveValue("60");
  await expect(page.getByRole("button", { name: "Recarregar", exact: true })).toBeEnabled();
});

test("searches friendly labels and fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("textbox", { name: "Buscar configuração" }).fill("inteligencia");
  await expect(
    page.getByRole("checkbox", { name: "Inteligência artificial", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Aprovar exclusão de contatos", exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/parameters-mobile.png", fullPage: true });
});

test("renders both tabs and their defaults", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1000 });
  await expect(
    page.getByRole("combobox", { name: "Sincronizar grupos internos com WhatsApp", exact: true }),
  ).toHaveText("Padrão do provedor");
  await page.screenshot({ path: "test-results/parameters-whatsapp.png" });
  await page.getByRole("tab", { name: "CRM", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Validar CPF e CNPJ", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/parameters-crm.png" });
});

test("denies non-admin access without loading settings", async ({ page }) => {
  await page.goto("/tests/parameters/index.html?operator");
  await expect(page.getByRole("alert")).toContainText("Acesso restrito a administradores");
  await expect(page.getByRole("tab")).toHaveCount(0);
});

test("offers a retry after a failed load without showing editable defaults", async ({ page }) => {
  await page.goto("/tests/parameters/index.html?load-error");
  await expect(
    page.getByRole("alert").filter({ hasText: "Falha ao carregar configurações" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar alterações", exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    window.parameterTest.failLoad = false;
  });
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Aprovar exclusão de contatos", exact: true }),
  ).toBeVisible();
});

test("renders the existing dark appearance", async ({ page }) => {
  await page.goto("/tests/parameters/index.html?dark");
  await expect(
    page.getByRole("checkbox", { name: "Aprovar exclusão de contatos", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/parameters-dark.png" });
});
