import { test, expect } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test(`explicit confirmation and usable layout at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tests/contact-quality/index.html");
    await expect(page.getByRole("button", { name: "Confirmar vínculo" })).toBeDisabled();
    await expect(page.getByText("Há mais de uma correspondência", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Selecionar este cliente" }).first().click();
    expect(await page.evaluate(() => (window as any).contactFixture.posts.length)).toBe(0);
    await expect(page.getByText("Cliente selecionado para confirmação")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`link-customer-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Confirmar vínculo" }).click();
    await expect.poll(() => page.evaluate(() => (window as any).contactFixture.closed)).toBe(1);
    expect(await page.evaluate(() => (window as any).contactFixture.posts)).toEqual([{ url: "/api/whatsapp/contacts/8/customer", body: { customerId: 12 } }]);
    expect(await page.evaluate(() => (window as any).contactFixture.refreshed)).toBe(1);
  });
}

test("CNPJ search remains available during unavailable phone lookup and editing clears stale selection", async ({ page }) => {
  await page.goto("/tests/contact-quality/index.html?scenario=unavailable");
  await expect(page.getByText("A consulta por telefone está indisponível", { exact: false })).toBeVisible();
  const input = page.getByRole("combobox", { name: "Cliente", exact: true });
  await input.fill("12345678000190");
  await page.getByRole("option", { name: /Empresa de teste A/ }).click();
  await expect(page.getByRole("button", { name: "Confirmar vínculo" })).toBeEnabled();
  expect(await page.evaluate(() => (window as any).contactFixture.searches.some((s: any) => s.field === "CPF_CNPJ" && s.text === "12345678000190"))).toBe(true);
  await input.fill("98765432000190");
  await expect(page.getByRole("button", { name: "Confirmar vínculo" })).toBeDisabled();
});

test("concurrent change stays visible and does not report success", async ({ page }) => {
  await page.goto("/tests/contact-quality/index.html?scenario=conflict");
  await page.getByRole("button", { name: "Selecionar este cliente" }).first().click();
  await page.getByRole("button", { name: "Confirmar vínculo" }).click();
  await expect(page.getByRole("alert")).toContainText("O contato já foi alterado");
  expect(await page.evaluate(() => (window as any).contactFixture.closed)).toBe(0);
});

test("saved link with pending CRM synchronization remains retryable", async ({ page }) => {
  await page.goto("/tests/contact-quality/index.html?scenario=sync-pending");
  await page.getByRole("button", { name: "Selecionar este cliente" }).first().click();
  await page.getByRole("button", { name: "Confirmar vínculo" }).click();
  await expect(page.getByRole("alert")).toContainText("O vínculo foi salvo");
  expect(await page.evaluate(() => (window as any).contactFixture.closed)).toBe(0);
  await page.getByRole("button", { name: "Confirmar vínculo" }).click();
  await expect.poll(() => page.evaluate(() => (window as any).contactFixture.closed)).toBe(1);
});
