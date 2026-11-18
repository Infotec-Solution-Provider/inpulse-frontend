import { expect, test, type Page } from "@playwright/test";
import { navigationPreferencesKey } from "../../src/lib/ui-system/navigation-preferences";

const editorName = "Personalizar navegação";
const storageKey = navigationPreferencesKey("tenant-a", 1);
const navigation = (page: Page) => page.getByRole("navigation", { name: "Navegação principal" });
const trigger = (page: Page) => page.getByRole("button", { name: editorName });
const editor = (page: Page) => page.getByRole("dialog", { name: editorName });

async function open(page: Page) {
  await page.route("**/api/whatsapp/monitor/**", (route) =>
    route.fulfill({ json: { data: { items: [], totalCount: 0, page: 1, pageSize: 20 } } }),
  );
  await page.goto("/tests/monitor/index.html?homolog-no-flags");
}

test("reorders modules by mouse and nested shortcuts by keyboard, then reloads", async ({
  page,
}) => {
  await open(page);
  await trigger(page).click();
  const dialog = editor(page);
  const rootRows = dialog.getByRole("listitem");
  const monitorRow = rootRows.filter({
    has: page.getByRole("switch", { name: "Exibir Monitoria" }),
  });
  const handle = monitorRow.getByTitle("Arrastar para reordenar");
  await handle.hover();
  const destination = await rootRows.first().boundingBox();
  if (!destination) throw new Error("The first navigation row is not visible");
  await page.mouse.down();
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
    {
      steps: 12,
    },
  );
  await page.mouse.up();
  await expect(rootRows.first()).toContainText("Monitoria");

  await dialog.getByRole("button", { name: "Editar submenu Usuários" }).click();
  await dialog.getByRole("button", { name: "Editar submenu Vendas" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Barra principal / Usuários / Vendas" }),
  ).toBeFocused();
  const move = dialog.getByRole("button", { name: "Subir Propostas" });
  await move.press("Enter");
  await expect(dialog.getByText("Propostas na posição 1 de 3.", { exact: true })).toBeAttached();
  await expect(move).toBeFocused();
  await dialog.getByRole("switch", { name: "Exibir Lançamentos" }).uncheck();
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(trigger(page)).toBeFocused();

  await page.reload();
  const nav = navigation(page);
  await expect(nav.getByRole("link").first()).toHaveText("Monitoria");
  await nav.getByRole("button", { name: "Usuários", exact: true }).click();
  await nav.getByRole("button", { name: "Vendas", exact: true }).click();
  const sales = nav.locator("#navigation-sales");
  await expect(sales.getByRole("link")).toHaveText(["Propostas", "Catálogo de vendas"]);
  await trigger(page).click();
  await dialog.getByRole("button", { name: "Editar submenu Usuários" }).click();
  await dialog.getByRole("button", { name: "Editar submenu Vendas" }).click();
  await expect(dialog.getByRole("listitem").nth(1)).toContainText("Lançamentos");
  await expect(dialog.getByRole("switch", { name: "Exibir Lançamentos" })).not.toBeChecked();
  await dialog.getByRole("button", { name: "Voltar para Usuários" }).click();
  await expect(dialog.getByRole("heading", { name: "Barra principal / Usuários" })).toBeFocused();
});

test("keeps the page title and avoids selecting a different link when an active shortcut is hidden", async ({
  page,
}) => {
  await open(page);
  await trigger(page).click();
  const dialog = editor(page);
  await dialog.getByRole("button", { name: "Editar submenu Comunicação" }).click();
  await dialog.getByRole("button", { name: "Editar submenu Email" }).click();
  await dialog.getByRole("switch", { name: "Exibir Contas" }).uncheck();
  await dialog.getByRole("button", { name: "Salvar" }).click();

  await page.evaluate(() => window.monitorHarness.navigate("/tenant-a/crm-email?tab=accounts"));
  await expect(
    page.getByRole("banner").getByText("Comunicação", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Conteúdo legado")).toBeVisible();
  const nav = navigation(page);
  await expect(nav.getByRole("link", { name: "Enviar", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Contas", exact: true })).toHaveCount(0);
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
});

test("edits from compact mode, cancels a reset, and restores the defaults on save", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Recolher navegação" }).click();
  await trigger(page).press("Enter");
  const dialog = editor(page);
  await dialog.getByRole("switch", { name: "Exibir Relatórios" }).uncheck();
  await dialog.getByRole("button", { name: "Salvar" }).click();
  const reports = navigation(page).getByRole("link", { name: "Relatórios", exact: true });
  const reportShortcuts = navigation(page).getByRole("button", {
    name: "Acesso rápido a relatórios",
  });
  await expect(reports).toHaveCount(0);
  await expect(reportShortcuts).toHaveCount(0);

  await trigger(page).click();
  await dialog.getByRole("button", { name: "Restaurar padrão" }).click();
  await expect(dialog.getByRole("switch", { name: "Exibir Relatórios" })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(trigger(page)).toBeFocused();
  await expect(reports).toHaveCount(0);

  await trigger(page).click();
  await dialog.getByRole("button", { name: "Restaurar padrão" }).click();
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Expandir navegação" })).toBeVisible();
  await expect(reports).toBeVisible();
  await expect(reportShortcuts).toBeVisible();
});

test("isolates preferences by company, operator, and impersonation and respects role changes", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ hidden: ["reports"], order: { $root: ["news"] } }));
    localStorage.setItem(key.replace(/:1$/, ":2"), "{invalid");
  }, storageKey);
  await open(page);
  await expect(trigger(page)).toBeVisible();
  const nav = navigation(page);
  const reports = nav.getByRole("link", { name: "Relatórios", exact: true });
  const news = nav.getByRole("link", { name: "Novidades", exact: true });
  await expect(reports).toHaveCount(0);
  await expect(nav.getByRole("link").first()).toHaveText("Novidades");
  await page.evaluate(() => window.monitorHarness.setRole("EXTERNO"));
  await expect(news).toHaveCount(0);
  await trigger(page).click();
  const dialog = editor(page);
  await expect(dialog.getByRole("listitem")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await page.evaluate(() => window.monitorHarness.setRole("ADMIN"));
  await expect(nav.getByRole("link").first()).toHaveText("Novidades");

  await page.evaluate(() => window.monitorHarness.setImpersonating(true));
  await expect(reports).toBeVisible();
  await expect(trigger(page)).toHaveCount(0);
  await page.evaluate(() => window.monitorHarness.setImpersonating(false));
  await expect(reports).toHaveCount(0);
  await trigger(page).click();
  await page.evaluate(() => window.monitorHarness.switchUser(2));
  await expect(dialog).toHaveCount(0);
  await expect(reports).toBeVisible();
  await expect(nav.getByRole("link").first()).toHaveText("Área de Atendimento");
  await page.evaluate(() => window.monitorHarness.switchUser(1));
  await expect(reports).toHaveCount(0);
  await page.evaluate(() => window.monitorHarness.switchTenant("tenant-b"));
  await expect(reports).toBeVisible();
  await page.evaluate(() => window.monitorHarness.switchTenant("tenant-a"));
  await expect(reports).toHaveCount(0);
});

test("preserves the unsaved draft and supports retry when storage rejects the first write", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    const setItem = Storage.prototype.setItem;
    let blocked = true;
    Storage.prototype.setItem = function (name, value) {
      if (name === key && blocked) {
        blocked = false;
        throw new DOMException("Simulated storage failure", "QuotaExceededError");
      }
      setItem.call(this, name, value);
    };
  }, storageKey);
  await open(page);
  await trigger(page).click();
  const dialog = editor(page);
  const showReports = dialog.getByRole("switch", { name: "Exibir Relatórios" });
  await showReports.uncheck();
  const save = dialog.getByRole("button", { name: "Salvar" });
  await save.click();
  await expect(dialog.getByRole("alert")).toContainText("Não foi possível salvar");
  await expect(showReports).not.toBeChecked();
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull();
  await save.click();
  await expect(navigation(page).getByRole("link", { name: "Relatórios", exact: true })).toHaveCount(
    0,
  );
});

test("updates the open compact submenu when another tab saves a preference", async ({
  page,
  context,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Recolher navegação" }).click();
  await navigation(page).getByRole("button", { name: "Comunicação", exact: true }).click();
  await page.getByRole("menuitem", { name: "Email", exact: true }).click();
  const accounts = page.getByRole("menuitem", { name: "Contas", exact: true });
  await expect(accounts).toBeVisible();

  const otherTab = await context.newPage();
  await open(otherTab);
  await trigger(otherTab).click();
  const dialog = editor(otherTab);
  await dialog.getByRole("button", { name: "Editar submenu Comunicação" }).click();
  await dialog.getByRole("button", { name: "Editar submenu Email" }).click();
  await dialog.getByRole("switch", { name: "Exibir Contas" }).uncheck();
  await dialog.getByRole("button", { name: "Salvar" }).click();

  await expect(accounts).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Enviar", exact: true })).toBeVisible();
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("edits by touch, returns focus to the drawer, and keeps access when all items are hidden", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Abrir navegação" }).tap();
    await trigger(page).tap();
    const dialog = editor(page);
    await dialog.getByRole("button", { name: "Subir Monitoria" }).tap();
    await expect(dialog.getByRole("listitem").first()).toContainText("Monitoria");
    await dialog.getByRole("switch", { name: "Exibir Área de Atendimento" }).tap();
    await dialog.getByRole("button", { name: "Salvar" }).tap();
    await expect(trigger(page)).toBeFocused();
    const nav = navigation(page);
    await expect(nav.getByRole("link").first()).toHaveText("Monitoria");

    await page.evaluate(() => window.monitorHarness.setRole("EXTERNO"));
    await expect(nav.getByRole("link")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /in.pulse .* Área de Atendimento/ })).toBeVisible();
    await trigger(page).tap();
    await dialog.getByRole("button", { name: "Restaurar padrão" }).tap();
    await dialog.getByRole("button", { name: "Salvar" }).tap();
    await expect(nav.getByRole("link", { name: "Área de Atendimento" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
  });
});
