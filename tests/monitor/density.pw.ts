import { expect, test, type Locator, type Page } from "@playwright/test";
import { setupTelephony, telephonyItem } from "./telephony-fixtures";

// Deliberately longer than the available identity column. These are fictional
// names; the tests check usable records/actions rather than a particular CSS grid.
const longName =
  "Distribuidora demonstrativa de equipamentos e soluções para atendimento empresarial da região metropolitana";
const conversationName = `Contato da ${longName}`;

async function setupDensity(page: Page) {
  const state = await setupTelephony(page, {
    search: async (route, query) => {
      await route.fulfill({
        json: {
          data: {
            items: Array.from({ length: 12 }, (_, index) =>
              telephonyItem(
                index + 1,
                query.filters.mode,
                index === 0 ? longName : `Cliente demonstrativo ${index + 1}`,
              ),
            ),
            totalCount: 12,
            page: 1,
            pageSize: 20,
            summary: { customerCount: 12, overdueCount: 3 },
          },
        },
      });
      return true;
    },
  });
  // The latest route wins over the empty conversation fixture in setupTelephony.
  await page.route("**/api/whatsapp/monitor/**", async (route) => {
    const url = route.request().url();
    const data = url.includes("/messages")
      ? {
          messages: [
            {
              id: 1,
              from: "customer",
              body: "Histórico fictício para testar a consulta sem iniciar atendimento.",
              timestamp: String(Date.now()),
              type: "chat",
              status: "RECEIVED",
            },
          ],
          nextCursor: null,
        }
      : url.endsWith("/summary")
        ? {
            inProgress: 12,
            waitingAgent: 6,
            waitingCustomer: 6,
            unread: 6,
            overdue: 3,
            scheduled: 0,
            slaMinutes: 30,
          }
        : {
            items: Array.from({ length: 12 }, (_, index) => ({
              id: index + 1,
              instance: "tenant-a",
              chatType: "wpp",
              contactId: index + 101,
              userId: 2,
              sectorId: 1,
              isFinished: false,
              startedAt: "2026-10-19T09:00:00Z",
              finishedAt: null,
              contact: {
                id: index + 101,
                name: index === 0 ? conversationName : `Contato demonstrativo ${index + 1}`,
                phone: "5511900000000",
              },
              customer: { RAZAO: "Empresa demonstrativa", CPF_CNPJ: "00000000000" },
              operational: {
                status: index % 2 ? "waiting_customer" : "waiting_agent",
                lastMessageAt: new Date().toISOString(),
                lastMessagePreview: "Mensagem demonstrativa com informação para supervisão.",
                waitingSince: new Date(Date.now() - 42 * 60_000).toISOString(),
                unreadCount: index % 2 ? 0 : 2,
                channel: "WhatsApp · WABA",
                deliveryStatus: null,
                slaBreached: index % 4 === 0,
              },
            })),
            totalCount: 12,
            page: 1,
            pageSize: 20,
          };
    await route.fulfill({ json: { data } });
  });
  await page.evaluate(() => document.fonts.ready);
  return state;
}

async function openConversations(page: Page) {
  await page.getByRole("tab", { name: "Conversas", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(12);
}

const viewConversation = (page: Page) =>
  page.getByRole("button", { name: `Visualizar conversa de ${conversationName}`, exact: true });
const viewCustomer = (page: Page) =>
  page.getByRole("button", { name: `Ver cliente ${longName}`, exact: true });
const editSchedule = (page: Page) =>
  page.getByRole("button", { name: `Editar agendamento 1 de ${longName}`, exact: true });

async function expectNoPageOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "nomes longos não devem alargar a página",
  ).toBe(true);
}

async function expectCustomerDocument(record: Locator) {
  // Ignore separators and surrounding text: phone and CPF/CNPJ may share a line.
  await expect(record.getByText(/0{3}\D*0{3}\D*0{3}\D*0{2}/)).toBeVisible();
}

async function expectIconAction(action: Locator, minimumSize: number) {
  await expect(action).toBeVisible();
  expect((await action.innerText()).trim(), "a ação repetida deve mostrar somente o ícone").toBe(
    "",
  );
  const box = await action.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(minimumSize);
  expect(box!.height).toBeGreaterThanOrEqual(minimumSize);
}

async function fullyVisibleCount(records: Locator) {
  return records.evaluateAll(
    (elements) =>
      elements.filter((element) => {
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.top < 0 || rect.bottom > innerHeight) return false;
        // A row behind an ancestor's scroll edge is not an available complete record.
        let ancestor = element.parentElement;
        while (ancestor) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(ancestor).overflowY)) {
            const clip = ancestor.getBoundingClientRect();
            if (rect.top < clip.top - 1 || rect.bottom > clip.bottom + 1) return false;
          }
          ancestor = ancestor.parentElement;
        }
        return true;
      }).length,
  );
}

async function expectIdentityClearOfActions(identity: Locator, actions: Locator[]) {
  const identityBox = await identity.boundingBox();
  expect(identityBox).not.toBeNull();
  for (const action of actions) {
    const actionBox = await action.boundingBox();
    expect(actionBox).not.toBeNull();
    const intersects =
      identityBox!.x < actionBox!.x + actionBox!.width &&
      identityBox!.x + identityBox!.width > actionBox!.x &&
      identityBox!.y < actionBox!.y + actionBox!.height &&
      identityBox!.y + identityBox!.height > actionBox!.y;
    expect(intersects, "o nome deve preservar o espaço das ações").toBe(false);
  }
}

async function expectPaintedTooltip(page: Page, text: string) {
  const tooltip = page.getByRole("tooltip", { name: text, exact: true });
  await expect(tooltip).toHaveText(text);
  await expect
    .poll(() =>
      tooltip.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        return !!hit && element.contains(hit);
      }),
    )
    .toBe(true);
}

test("desktop apresenta ao menos seis registros completos e ações discretas com nomes longos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { errors } = await setupDensity(page);
  await openConversations(page);
  await expect.poll(() => fullyVisibleCount(page.getByRole("article"))).toBeGreaterThanOrEqual(6);
  const firstConversation = page.getByRole("article").first();
  await expect(firstConversation.getByText("Empresa demonstrativa", { exact: true })).toBeVisible();
  await expectCustomerDocument(firstConversation);
  await expectIconAction(viewConversation(page), 36);
  await expectIdentityClearOfActions(
    page.getByRole("heading", { name: conversationName, exact: true }),
    [viewConversation(page)],
  );
  await expectNoPageOverflow(page);

  await page.getByRole("tab", { name: "Telefonia", exact: true }).click();
  const rows = page.getByRole("table").locator("tbody tr");
  await expect(rows).toHaveCount(12);
  await expect.poll(() => fullyVisibleCount(rows)).toBeGreaterThanOrEqual(6);
  await expectCustomerDocument(rows.first());
  await expectIconAction(viewCustomer(page), 36);
  await expectIconAction(editSchedule(page), 36);
  await expectIdentityClearOfActions(page.getByRole("table").getByText(longName, { exact: true }), [
    viewCustomer(page),
    editSchedule(page),
  ]);
  await expectNoPageOverflow(page);
  expect(errors).toEqual([]);
});

test("ações por ícone oferecem tooltip no mouse e teclado e devolvem foco após consulta", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { errors } = await setupDensity(page);
  await openConversations(page);
  const view = viewConversation(page);
  await view.hover();
  await expectPaintedTooltip(page, "Visualizar conversa");
  await page.mouse.move(0, 0);
  await view.focus();
  // Trigger keyboard modality so MUI intentionally opens a focus-visible tooltip.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(view).toBeFocused();
  await expectPaintedTooltip(page, "Visualizar conversa");
  await page.keyboard.press("Enter");
  const preview = page.getByRole("dialog", { name: conversationName, exact: true });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("button", { name: "Fechar conversa", exact: true })).toBeFocused();
  const context = preview.getByRole("region", { name: "Contexto da conversa", exact: true });
  await expect(context.getByText("Empresa demonstrativa", { exact: true })).toBeVisible();
  await expect(context.getByText("WhatsApp · WABA", { exact: true })).toBeVisible();
  await expect(context.getByText("Última mensagem", { exact: true })).toBeVisible();
  const lastMessage = context.locator("time[datetime]");
  await expect(lastMessage).toBeVisible();
  await expect(lastMessage).toContainText(/\d/);
  expect(Number.isFinite(Date.parse((await lastMessage.getAttribute("datetime"))!))).toBe(true);
  expect(await page.evaluate(() => window.monitorHarness.opened())).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(view).toBeFocused();

  await page.getByRole("tab", { name: "Telefonia", exact: true }).click();
  const edit = editSchedule(page);
  await edit.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(edit).toBeFocused();
  await expectPaintedTooltip(page, "Editar agendamento");
  await page.getByRole("tab", { name: "Telefonia", exact: true }).focus();
  await viewCustomer(page).hover();
  await expectPaintedTooltip(page, "Ver cliente");
  expect(errors).toEqual([]);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 720 },
]) {
  test.describe(`toque ${viewport.width}px`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });

    test("primeira ficha inteira fica acessível sem scroll e ícones têm alvo de 44px", async ({
      page,
    }) => {
      const { errors } = await setupDensity(page);
      await openConversations(page);
      await expect.poll(() => fullyVisibleCount(page.getByRole("article").first())).toBe(1);
      const firstConversation = page.getByRole("article").first();
      await expect(
        firstConversation.getByText("Empresa demonstrativa", { exact: true }),
      ).toBeVisible();
      await expectCustomerDocument(firstConversation);
      await expectIconAction(viewConversation(page), 44);
      await expect(page.getByRole("button", { name: "Exibir cartões", exact: true })).toBeHidden();
      await expectIdentityClearOfActions(
        page.getByRole("heading", { name: conversationName, exact: true }),
        [viewConversation(page)],
      );
      await expectNoPageOverflow(page);

      await page.getByRole("tab", { name: "Telefonia", exact: true }).click();
      const records = page
        .getByRole("list", { name: "Agendamentos", exact: true })
        .getByRole("listitem");
      await expect(records).toHaveCount(12);
      await expect.poll(() => fullyVisibleCount(records.first())).toBe(1);
      await expectCustomerDocument(records.first());
      await expectIconAction(viewCustomer(page), 44);
      await expectIconAction(editSchedule(page), 44);
      await expect(page.getByRole("button", { name: "Exibir cartões", exact: true })).toBeHidden();
      await expectIdentityClearOfActions(records.first().getByText(longName, { exact: true }), [
        viewCustomer(page),
        editSchedule(page),
      ]);
      await expectNoPageOverflow(page);
      const target = await viewCustomer(page).boundingBox();
      // The edge of the full target must activate, not just the small painted eye.
      await page.touchscreen.tap(target!.x + 2, target!.y + 2);
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog")).toContainText("Cliente 1");
      expect(errors).toEqual([]);
    });
  });
}

test("ocultar alternadores no mobile preserva as duas preferências de visualização desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupDensity(page);
  const cards = () => page.getByRole("button", { name: "Exibir cartões", exact: true });
  await cards().focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(cards()).toBeFocused();
  await expectPaintedTooltip(page, "Cartões");
  await cards().click();
  await expect(cards()).toHaveAttribute("aria-pressed", "true");
  await openConversations(page);
  await cards().focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(cards()).toBeFocused();
  await expectPaintedTooltip(page, "Cartões");
  await cards().click();
  await expect(cards()).toHaveAttribute("aria-pressed", "true");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(cards()).toBeHidden();
  await page.getByRole("tab", { name: "Telefonia", exact: true }).click();
  await expect(cards()).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(cards()).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("tab", { name: "Conversas", exact: true }).click();
  await expect(cards()).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(cards()).toHaveAttribute("aria-pressed", "true");
});
