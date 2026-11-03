import { test, expect } from "@playwright/test";
const path = "/tests/crm-registration/index.html?phones";
for (const [name, width, height] of [["desktop", 1280, 900], ["mobile", 390, 844]] as const) {
  test(`${name}: delete compacts phone metadata and labels former fax as Telefone 4`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(path);
    await page.getByRole("button", { name: "Telefones e e-mails" }).click();
    await expect(page.getByLabel("Telefone 4", { exact: true })).toHaveValue("55555555");
    await page.getByRole("button", { name: "Remover telefone 1", exact: true }).click();
    await page.getByRole("button", { name: "Salvar cadastro", exact: true }).click();
    await expect(page.getByText("Cadastro salvo.")).toBeVisible();
    expect(await page.evaluate(() => window.registrationTest.writes[0].data)).toMatchObject({ changes: { AREA1: 21, FONE1: "44444444", DESC_FONE1: "Segundo", OBS_FONE1: "Observação dois", AREA2: 31, FONE2: "55555555", DESC_FONE2: "Quarto", OBS_FONE2: null, FAX: null } });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results-crm-registration/phones-${name}.png`, fullPage: true });
  });
}
test("refuses DDD-only pairs and deletion of the last phone without sending a request", async ({ page }) => {
  await page.goto(path);
  await page.getByRole("button", { name: "Telefones e e-mails" }).click();
  await page.getByLabel("Telefone 2", { exact: true }).fill("");
  await page.getByRole("button", { name: "Salvar cadastro", exact: true }).click();
  await expect(page.getByText("Informe o DDD e o telefone 2 completos e válidos.")).toBeVisible();
  expect(await page.evaluate(() => window.registrationTest.writes)).toHaveLength(0);
  await page.getByLabel("DDD do telefone 2", { exact: true }).fill("");
  await page.getByRole("button", { name: "Remover telefone 1", exact: true }).click();
  await page.getByRole("button", { name: "Remover telefone 4", exact: true }).click();
  await page.getByRole("button", { name: "Salvar cadastro", exact: true }).click();
  await expect(page.getByText("Mantenha pelo menos um telefone completo com DDD.")).toBeVisible();
  expect(await page.evaluate(() => window.registrationTest.writes)).toHaveLength(0);
});
