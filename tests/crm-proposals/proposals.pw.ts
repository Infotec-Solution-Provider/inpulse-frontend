import { test, expect } from "@playwright/test";
const url = "/tests/crm-proposals/index.html";
test("desktop: editing is reviewed, closed proposals are protected and report/history remain available", async ({
  page,
}, testInfo) => {
  await page.goto(url);
  await expect(page.getByText("Cliente exemplo / ERP-1")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("desktop.png"), fullPage: true });
  const open = page.getByRole("row").filter({ hasText: "Cliente exemplo" }),
    closed = page.getByRole("row").filter({ hasText: "Cliente fechado" });
  await expect(closed.getByRole("button", { name: "Alterar", exact: true })).toBeDisabled();
  await open.getByRole("button", { name: "Alterar", exact: true }).click();
  await page.getByLabel("Novo valor (R$)").fill("120,75");
  await page.getByLabel("Justificativa").fill("Revisão comercial");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const change = await page.evaluate(() => (window as any).proposalTest.changes[0]);
  expect(change.body.value).toBe("120.75");
  expect(change.body.version).toBe("a".repeat(64));
  expect(change.instance).toBe("tenant-a");
  await open.getByRole("button", { name: "Histórico", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Revisão");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Relatório para impressão" }).click();
  await expect(
    page.frameLocator('iframe[title="Relatório de propostas"]').getByRole("heading"),
  ).toHaveText("Relatório de propostas");
});
test("mobile: filters and confirmation fit viewport; unknown writes stay blocked until reread", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url + "?unknown");
  await expect(page.getByRole("heading", { name: "Gestão de propostas" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
  await page
    .getByRole("row")
    .filter({ hasText: "Cliente exemplo" })
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await page.getByLabel("Justificativa").fill("Solicitação do cliente");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmar", exact: true })).toBeDisabled();
  await expect(page.getByRole("alert").first()).toContainText("Não foi possível");
  expect(await page.evaluate(() => (window as any).proposalTest.changes.length)).toBe(1);
});
test("tenant changes discard delayed old results and readonly/operator contexts cannot mutate", async ({
  page,
}) => {
  await page.goto(url + "?slow");
  await page.getByRole("button", { name: "Trocar empresa" }).click();
  await expect(page.getByText("Empresa B / ERP-1")).toBeVisible();
  await page.evaluate(() => (window as any).proposalTest.release?.());
  await expect(page.getByText("Cliente exemplo / ERP-1")).toHaveCount(0);
  await page.goto(url + "?readonly");
  await expect(page.getByRole("alert")).toContainText("Auditoria indisponível");
  await expect(page.getByRole("button", { name: "Alterar", exact: true }).first()).toBeDisabled();
  await page.goto(url + "?operator");
  await expect(page.getByRole("alert")).toContainText("Acesso restrito");
  expect(await page.evaluate(() => (window as any).proposalTest.requests)).toEqual([]);
});
test("finish: proposal flags require a value or explicit selection and pass additive extension fields", async ({
  page,
}) => {
  await page.goto(url + "?finish");
  await page.getByLabel("Resultado").click();
  await page.getByRole("option", { name: "Proposta", exact: true }).click();
  await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
  await page.getByLabel("Valor da proposta (R$)").fill("25,50");
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  expect(await page.evaluate(() => (window as any).proposalTest.finishes[0][4])).toEqual({
    proposalValue: "25.50",
  });
  await page.reload();
  await page.getByLabel("Resultado").click();
  await page.getByRole("option", { name: "Cancelar proposta", exact: true }).click();
  await expect(page.getByRole("button", { name: "Finalizar", exact: true })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  expect(await page.evaluate(() => (window as any).proposalTest.finishes[0][4])).toEqual({
    cancelProposals: [{ id: 11, version: "a".repeat(64) }],
  });
});
