import { expect, test, type Locator, type Page } from "@playwright/test";
import { setupTelephony } from "./telephony-fixtures";

async function expectIcon(action: Locator, size: number) {
  await expect(action).toBeVisible();
  const icon = action.locator("svg").first();
  await expect(icon).toHaveAttribute("width", String(size));
  await expect(icon).toHaveAttribute("height", String(size));
  await expect(icon).toHaveAttribute("stroke-width", "2");
  await expect(icon).toHaveAttribute("aria-hidden", "true");
}

async function addConversationFixture(page: Page) {
  await page.route("**/api/whatsapp/monitor/**", async (route) => {
    const data = route.request().url().endsWith("/summary")
      ? {
          inProgress: 1,
          waitingAgent: 1,
          waitingCustomer: 0,
          unread: 1,
          overdue: 1,
          scheduled: 0,
          slaMinutes: 30,
        }
      : {
          items: [
            {
              id: 1,
              instance: "tenant-a",
              chatType: "wpp",
              contactId: 101,
              userId: 2,
              sectorId: 1,
              isFinished: false,
              startedAt: new Date(Date.now() - 80 * 60_000).toISOString(),
              finishedAt: null,
              contact: { id: 101, name: "Contato fictício de acabamento", phone: "5511000000000" },
              customer: { RAZAO: "Empresa demonstrativa", CPF_CNPJ: "00000000000" },
              operational: {
                status: "waiting_agent",
                lastMessageAt: new Date().toISOString(),
                lastMessagePreview: "Mensagem fictícia de teste.",
                waitingSince: new Date(Date.now() - 42 * 60_000).toISOString(),
                unreadCount: 2,
                channel: "WhatsApp · WABA",
                deliveryStatus: null,
                slaBreached: true,
              },
            },
          ],
          totalCount: 1,
          page: 1,
          pageSize: 20,
        };
    await route.fulfill({ json: { data } });
  });
  await page.getByRole("tab", { name: "Conversas", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
}

test("ícones compartilham escala por contexto e ações repetidas mantêm nome e tooltip", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { errors } = await setupTelephony(page);
  const currentNavigation = page
    .getByRole("navigation", { name: "Navegação principal", exact: true })
    .getByRole("link", { name: "Monitoria", exact: true });
  await expectIcon(currentNavigation, 20);
  const refresh = page.getByRole("button", { name: "Atualizar", exact: true });
  await expectIcon(refresh, 20);
  expect((await refresh.innerText()).trim()).toBe("");
  const view = page.getByRole("button", { name: "Ver cliente Cliente telefonia 1", exact: true });
  await expectIcon(view, 18);
  expect((await view.innerText()).trim()).toBe("");
  await view.hover();
  await expect(page.getByRole("tooltip", { name: "Ver cliente", exact: true })).toBeVisible();
  await page.mouse.move(0, 0);
  await view.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(view).toBeFocused();
  await expect(page.getByRole("tooltip", { name: "Ver cliente", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("seleção de navegação, indicador e visualização possui sinal além da cor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupTelephony(page);
  await addConversationFixture(page);
  const currentNavigation = page
    .getByRole("navigation", { name: "Navegação principal", exact: true })
    .getByRole("link", { name: "Monitoria", exact: true });
  await expect(currentNavigation).toHaveAttribute("aria-current", "page");
  const navigationSignal = await currentNavigation.evaluate((element) => {
    const style = getComputedStyle(element);
    const label = element.querySelector(".MuiListItemText-primary");
    const bold = Number(getComputedStyle(label || element).fontWeight) >= 600;
    const pseudo = ["::before", "::after"].some((part) => {
      const partStyle = getComputedStyle(element, part);
      return !["none", "normal"].includes(partStyle.content) && parseFloat(partStyle.height) > 0;
    });
    return bold || pseudo || style.boxShadow !== "none";
  });
  expect(navigationSignal, "o destino atual deve ter peso ou marcador, além da cor").toBe(true);

  const indicator = page.getByRole("button", { name: /^Aguardando atendente/ });
  await indicator.click();
  await expect(indicator).toHaveAttribute("aria-pressed", "true");
  expect(
    await indicator.evaluate((element) => {
      const marker = getComputedStyle(element, "::after");
      return !["none", "normal"].includes(marker.content) && parseFloat(marker.height) > 0;
    }),
    "o filtro rápido selecionado deve ter um marcador de forma",
  ).toBe(true);

  const cards = page.getByRole("button", { name: "Exibir cartões", exact: true });
  await cards.click();
  await expect(cards).toHaveAttribute("aria-pressed", "true");
  expect(
    await cards.evaluate((element) => getComputedStyle(element).boxShadow !== "none"),
    "a visualização selecionada deve ter um traço além da superfície colorida",
  ).toBe(true);
  const compact = page.getByRole("button", { name: "Exibir lista compacta", exact: true });
  await compact.click();
  await expect(compact).toHaveAttribute("aria-pressed", "true");
  await expect(cards).toHaveAttribute("aria-pressed", "false");
});

test("reflow equivalente a zoom de 200% conserva filtros, ações e foco com movimento reduzido", async ({
  page,
}) => {
  // 720×450 CSS pixels is the available layout of a 1440×900 window at 200%.
  // This exercises reflow without claiming to automate the browser zoom setting.
  await page.setViewportSize({ width: 720, height: 450 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { errors } = await setupTelephony(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "Abrir navegação", exact: true })).toBeVisible();
  const view = page.getByRole("button", { name: "Ver cliente Cliente telefonia 1", exact: true });
  await view.scrollIntoViewIfNeeded();
  await expect(view).toBeInViewport();
  expect(
    await view.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        style.transitionDuration.split(",").every((value) => parseFloat(value) <= 0.001) &&
        (style.animationName === "none" ||
          style.animationDuration.split(",").every((value) => parseFloat(value) <= 0.001))
      );
    }),
  ).toBe(true);
  const filters = page.getByRole("button", { name: /^Filtros/ });
  await filters.click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  const apply = panel.getByRole("button", { name: "Aplicar filtros", exact: true });
  const cancel = panel.getByRole("button", { name: "Cancelar", exact: true });
  await expect(apply).toBeInViewport();
  await expect(cancel).toBeInViewport();
  await cancel.click();
  await expect(panel).toHaveCount(0);
  await expect(filters).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
