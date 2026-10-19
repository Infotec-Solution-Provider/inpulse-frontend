import { test, expect, type Page } from "@playwright/test";
async function open(page: Page, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/api/whatsapp/monitor/**", (route) =>
    route.fulfill({ json: { data: { items: [], totalCount: 0, page: 1, pageSize: 20 } } }),
  );
  await page.goto("/tests/monitor/index.html");
  if (width >= 1024)
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeAttached();
  else await expect(page.getByRole("button", { name: "Abrir navegação" })).toBeVisible();
}
test("expanded groups do not navigate, show Cadastro first and preserve navigation on legacy content", async ({
  page,
}) => {
  await open(page);
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await nav.getByRole("button", { name: "Clientes", exact: true }).click();
  await expect(nav.getByRole("button", { name: "Clientes", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator("#navigation-customers").getByRole("link").first()).toHaveText(
    "Cadastro",
  );
  await page
    .locator("#navigation-customers")
    .getByRole("link", { name: "Segmentos", exact: true })
    .click();
  await expect(page.getByLabel("Conteúdo legado")).toBeVisible();
  await expect(nav.getByRole("button", { name: "Clientes", exact: true })).toBeVisible();
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(nav.locator('[aria-current="page"]')).toHaveText("Segmentos");
});
test("compact menu drills down and returns by keyboard without hover", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Recolher navegação" }).click();
  await page.getByRole("button", { name: "Usuários", exact: true }).click();
  const menu = page.getByRole("menu");
  await menu.getByRole("menuitem", { name: "Vendas", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "Catálogo de vendas", exact: true }),
  ).toBeVisible();
  await page.getByRole("menuitem", { name: "Voltar para Usuários", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Expedientes", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Usuários", exact: true })).toBeFocused();
});
test("query-specific exception links select a single leaf and its ancestors", async ({ page }) => {
  await open(page);
  await page.evaluate(() =>
    window.monitorHarness.navigate("/tenant-a/crm-exceptions?kind=segments"),
  );
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(nav.getByRole("button", { name: "Campanhas", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(nav.getByRole("button", { name: "Exceções", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(nav.locator('[aria-current="page"]')).toHaveText("Segmentos");
});
test("mobile navigation closes after selecting a destination and does not overflow", async ({
  page,
}) => {
  await open(page, 390);
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await nav.getByRole("button", { name: "Clientes", exact: true }).click();
  await nav.getByRole("link", { name: "Segmentos", exact: true }).click();
  await expect(page.getByRole("button", { name: "Abrir navegação" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
