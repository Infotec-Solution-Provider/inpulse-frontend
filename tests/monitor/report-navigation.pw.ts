import { expect, test, type Page } from "@playwright/test";

const shortcutName = "Acesso rápido a relatórios";
const baseUrl = "/tests/monitor/index.html?report-navigation";

function navigation(page: Page) {
  return page.getByRole("navigation", { name: "Navegação principal" });
}

async function openShortcuts(page: Page) {
  await navigation(page).getByRole("button", { name: shortcutName }).click();
  const dialog = page.getByRole("dialog", { name: shortcutName });
  await expect(dialog.getByRole("searchbox", { name: "Buscar relatório" })).toBeFocused();
  return dialog;
}

async function visit(page: Page, path: string) {
  await page.evaluate((destination) => window.monitorHarness.navigate(destination), path);
  await expect(page.getByLabel("Conteúdo legado")).toHaveAttribute("data-pathname", path);
}

test("central link and searchable shortcuts are separate actions", async ({ page }) => {
  await page.goto(baseUrl);
  const nav = navigation(page);
  const central = nav.getByRole("link", { name: "Relatórios", exact: true });
  await expect(central).toHaveAttribute("href", "/tenant-a/reports");
  await central.click();
  await expect(page.getByLabel("Conteúdo legado")).toHaveAttribute(
    "data-pathname",
    "/tenant-a/reports",
  );

  const dialog = await openShortcuts(page);
  await expect(dialog.getByRole("list", { name: "Para começar" }).getByRole("link")).toHaveText([
    "Mensagens por Operador",
    "Performance Geral",
    "Vendas",
  ]);
  const search = dialog.getByRole("searchbox");
  await search.fill("regua");
  await expect(dialog.getByRole("link")).toHaveText(["Régua por Carteira"]);
  await search.fill("dashboard financeiro");
  await expect(dialog.getByRole("link")).toHaveText(["Vendas"]);
  await search.fill("relatorio inexistente");
  await expect(dialog.getByRole("status")).toHaveText("Nenhum relatório encontrado.");
  await search.fill("performance geral");
  await dialog.getByRole("link", { name: "Performance Geral" }).click();
  await expect(page.getByLabel("Conteúdo legado")).toHaveAttribute(
    "data-pathname",
    "/tenant-a/reports/general-performance",
  );
  await expect(dialog).toBeHidden();

  const reopened = await openShortcuts(page);
  await expect(
    reopened.getByRole("list", { name: "Últimos abertos" }).getByRole("link"),
  ).toHaveText(["Performance Geral"]);
  await page.keyboard.press("Escape");
  await expect(reopened).toBeHidden();
  await expect(nav.getByRole("button", { name: shortcutName })).toBeFocused();
});

test("recent visits are capped, reordered and persisted per user and company", async ({ page }) => {
  await page.goto(baseUrl);
  await expect(navigation(page)).toBeVisible();
  for (const report of [
    "messages-per-operator",
    "messages-per-contact",
    "messages-per-hour-day",
    "contacts-awaiting-return",
    "general-performance",
    "sales",
  ])
    await visit(page, "/tenant-a/reports/" + report);

  await visit(page, "/tenant-a/reports/messages-per-contact");
  const title = "Últimos abertos";
  const recentNames = [
    "Mensagens por Contato",
    "Vendas",
    "Performance Geral",
    "Contatos aguardando retorno",
    "Mensagens por Hora e Dia",
  ];
  let dialog = await openShortcuts(page);
  await expect(dialog.getByRole("list", { name: title }).getByRole("link")).toHaveText(recentNames);
  await page.reload();
  dialog = await openShortcuts(page);
  await expect(dialog.getByRole("list", { name: title }).getByRole("link")).toHaveText(recentNames);

  await page.evaluate(() => window.monitorHarness.switchUser(2));
  await expect(dialog).toBeHidden();
  dialog = await openShortcuts(page);
  await expect(dialog.getByRole("list", { name: "Para começar" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.monitorHarness.switchTenant("tenant-b"));
  await page.evaluate(() => window.monitorHarness.switchUser(1));
  dialog = await openShortcuts(page);
  await expect(dialog.getByRole("list", { name: "Para começar" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.monitorHarness.switchTenant("tenant-a"));

  dialog = await openShortcuts(page);
  await expect(dialog.getByRole("link", { name: "Vendas", exact: true })).toBeVisible();
  await page.evaluate(() => window.monitorHarness.setReportSales(false));
  await expect(dialog.getByRole("link", { name: "Vendas", exact: true })).toHaveCount(0);
  await dialog.getByRole("searchbox").fill("dashboard financeiro");
  await expect(dialog.getByRole("status")).toHaveText("Nenhum relatório encontrado.");
  await page.evaluate(() => window.monitorHarness.setRole("ATIVO"));
  await expect(dialog).toBeHidden();
  await expect(navigation(page).getByRole("button", { name: shortcutName })).toHaveCount(0);
});

test("compact navigation keeps both actions available by keyboard", async ({ page }) => {
  await page.goto(baseUrl);
  await page.getByRole("button", { name: "Recolher navegação", exact: true }).click();
  const nav = navigation(page);
  const central = nav.getByRole("link", { name: "Relatórios", exact: true });
  const trigger = nav.getByRole("button", { name: shortcutName });
  await central.focus();
  await page.keyboard.press("Tab");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: shortcutName });
  await expect(dialog.getByRole("searchbox")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("mobile shortcuts fit the viewport and close the drawer on navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl);
  const drawer = page.getByRole("button", { name: "Abrir navegação" });
  await drawer.click();
  const dialog = await openShortcuts(page);
  const bounds = await dialog.boundingBox();
  expect(bounds).toBeTruthy();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(navigation(page)).toBeVisible();
  const reopened = await openShortcuts(page);
  await reopened.getByRole("searchbox").fill("curva abc");
  await reopened.getByRole("link", { name: "Curva ABC de ligações" }).click();
  await expect(drawer).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Conteúdo legado")).toHaveAttribute(
    "data-pathname",
    "/tenant-a/reports/call-abc",
  );
});
