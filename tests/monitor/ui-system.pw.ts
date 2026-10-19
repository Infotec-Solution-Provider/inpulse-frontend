import { expect, test, type Page } from "@playwright/test";
import { setupTelephony } from "./telephony-fixtures";

// These checks exercise keyboard and ARIA behavior; they do not claim a manual
// screen-reader audit. Notification APIs and tenant data are simulated by the harness.
const themeButton = (page: Page) =>
  page.getByRole("button", { name: "Preferência de tema", exact: true });
const navigation = (page: Page) =>
  page.getByRole("navigation", { name: "Navegação principal", exact: true });

async function seedTheme(page: Page, legacy: "light" | "dark" | null = null) {
  await page.addInitScript((saved) => {
    if (sessionStorage.getItem("ui-system-theme-seeded")) return;
    localStorage.removeItem("themePreference");
    localStorage.removeItem("themeMode");
    if (saved) localStorage.setItem("themeMode", saved);
    sessionStorage.setItem("ui-system-theme-seeded", "true");
  }, legacy);
}

async function expectTheme(page: Page, mode: "light" | "dark") {
  for (const scope of await page.locator("[data-ui-theme]").all())
    await expect(scope).toHaveAttribute("data-ui-theme", mode);
  await expect(page.getByRole("main").locator("[data-ui-theme]").first()).toHaveCSS(
    "color-scheme",
    mode,
  );
}

async function chooseTheme(page: Page, name: "Claro" | "Escuro" | "Sistema") {
  await themeButton(page).click();
  await page.getByRole("menuitem", { name: new RegExp(`^${name}`) }).click();
}

async function expectSidebarWidth(page: Page, width: number) {
  await expect(navigation(page)).toBeVisible();
  await expect
    .poll(() =>
      navigation(page).evaluate((element) =>
        Math.round(element.parentElement!.getBoundingClientRect().width),
      ),
    )
    .toBe(width);
}

test("novo usuário segue o tema do sistema e acompanha mudanças do SO", async ({ page }) => {
  await seedTheme(page);
  await page.emulateMedia({ colorScheme: "light" });
  const { errors } = await setupTelephony(page);
  await expectTheme(page, "light");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("themePreference")))
    .toBe("system");
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme(page, "light");
  expect(errors).toEqual([]);
});

test("tema legado é preservado, escolha explícita persiste e Sistema pode ser restaurado", async ({
  page,
}) => {
  await seedTheme(page, "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await setupTelephony(page);
  await expectTheme(page, "dark");
  await chooseTheme(page, "Claro");
  await expectTheme(page, "light");
  await page.reload();
  await expect(themeButton(page)).toBeVisible();
  await expectTheme(page, "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "light");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("themePreference")))
    .toBe("light");
  await chooseTheme(page, "Sistema");
  await expectTheme(page, "dark");
  await page.reload();
  await expect(themeButton(page)).toBeVisible();
  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme(page, "light");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("themePreference")))
    .toBe("system");
});

test("lateral preserva 240 ou 64px e isola a preferência por usuário e tenant", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupTelephony(page);
  await expectSidebarWidth(page, 240);
  await page.getByRole("button", { name: "Recolher navegação", exact: true }).click();
  await expectSidebarWidth(page, 64);
  await page.reload();
  await expectSidebarWidth(page, 64);
  await page.evaluate(() => window.monitorHarness.switchUser(2));
  await expectSidebarWidth(page, 240);
  await page.evaluate(() => window.monitorHarness.switchUser(1));
  await expectSidebarWidth(page, 64);
  await page.evaluate(() => window.monitorHarness.switchTenant("tenant-b"));
  await expectSidebarWidth(page, 240);
  await page.evaluate(() => window.monitorHarness.switchTenant("tenant-a"));
  await expectSidebarWidth(page, 64);
});

test("tablet inicia compacto e respeita expansão explícita ao redimensionar", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await setupTelephony(page);
  await expectSidebarWidth(page, 64);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expectSidebarWidth(page, 240);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expectSidebarWidth(page, 64);
  await page.getByRole("button", { name: "Expandir navegação", exact: true }).click();
  await expectSidebarWidth(page, 240);
  await page.reload();
  await expectSidebarWidth(page, 240);
});

test("mobile mantém cabeçalho com chat ativo e navegação modal acessível em 320px", async ({
  page,
}) => {
  // The WhatsApp double deliberately has a currentChat, as it does during a live attendance.
  await page.setViewportSize({ width: 320, height: 844 });
  const { errors } = await setupTelephony(page);
  await expect(themeButton(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "notificações", exact: true })).toBeVisible();
  await expect(navigation(page)).toHaveCount(0);
  const opener = page.getByRole("button", { name: "Abrir navegação", exact: true });
  await opener.click();
  await expectSidebarWidth(page, 240);
  await expect(
    navigation(page).getByRole("link", { name: "Monitoria", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      navigation(page).evaluate((element) =>
        element.parentElement!.contains(document.activeElement),
      ),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(navigation(page)).toHaveCount(0);
  await expect(opener).toBeFocused();
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  expect(errors).toEqual([]);
});

test("menus de tema, notificações e usuário funcionam por teclado e restauram foco", async ({
  page,
}) => {
  await setupTelephony(page);
  const theme = themeButton(page);
  await theme.focus();
  await page.keyboard.press("Enter");
  const appearance = page.getByRole("menu");
  await expect(appearance.getByRole("menuitem", { name: /^Sistema/ })).toBeVisible();
  await expect
    .poll(() => appearance.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(theme).toBeFocused();

  const notifications = page.getByRole("button", { name: "notificações", exact: true });
  await notifications.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("menuitem", { name: "Nenhuma notificação", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(notifications).toBeFocused();

  const user = page.getByRole("button", { name: "Menu do usuário Supervisor", exact: true });
  await user.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("menuitem", { name: "Preferências de notificações", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Sair", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(user).toBeFocused();
});

test("navegação global mantém o conteúdo legado isolado e a escolha de tema", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupTelephony(page);
  await chooseTheme(page, "Escuro");
  await expectTheme(page, "dark");
  await navigation(page).getByRole("link", { name: "Área de Atendimento", exact: true }).click();
  await expect(page.getByLabel("Conteúdo legado", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").locator(".ip-ui")).toHaveCount(0);
  await expect(themeButton(page)).toBeVisible();
  await expect(navigation(page)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("themePreference"))).toBe("dark");
  await page.evaluate(() => window.monitorHarness.navigate("/tenant-a/monitor"));
  await expect(themeButton(page)).toBeVisible();
  await expectTheme(page, "dark");
});

test("tooltip dos filtros permanece visível e seletores usam um único painel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupTelephony(page);
  const opener = page.getByRole("button", { name: /^Filtros/ });
  await opener.click();
  const panel = page.getByRole("dialog", { name: "Filtros da telefonia", exact: true });
  await expect(panel).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  const help = panel.getByLabel(
    "Atividade no mês: contatos e ligações telefônicos no mês de referência",
    { exact: true },
  );
  await help.focus();
  // Re-enter using keyboard modality, as MUI only opens focus tooltips for :focus-visible.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("Contatos contam contatos telefônicos efetivos");
  // Visibility alone ignores ancestor clipping; a painted tooltip must win hit testing.
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
  await panel.getByRole("button", { name: "Selecionar campanhas", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Campanhas", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Selecionar campanhas", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("consulta de conversa anuncia diálogo e recebe foco antes da primeira navegação", async ({
  page,
}) => {
  const { errors } = await setupTelephony(page);
  await page.route("**/api/whatsapp/monitor/**", async (route) => {
    const url = route.request().url();
    const data = url.includes("/messages")
      ? {
          messages: [
            {
              id: 1,
              from: "customer",
              body: "Histórico de demonstração",
              timestamp: String(Date.now()),
              type: "chat",
              status: "RECEIVED",
            },
          ],
          nextCursor: null,
        }
      : url.endsWith("/summary")
        ? {
            inProgress: 1,
            waitingAgent: 1,
            waitingCustomer: 0,
            unread: 0,
            overdue: 0,
            scheduled: 0,
            slaMinutes: null,
          }
        : {
            items: [
              {
                id: 7,
                instance: "tenant-a",
                chatType: "wpp",
                contactId: 107,
                userId: 2,
                sectorId: 1,
                isFinished: false,
                startedAt: "2026-09-25T09:00:00.000Z",
                finishedAt: null,
                contact: { id: 107, name: "Consulta acessível", phone: "5511900000000" },
                customer: { RAZAO: "Empresa demonstrativa", CPF_CNPJ: "00000000000" },
                operational: {
                  status: "waiting_agent",
                  lastMessageAt: new Date().toISOString(),
                  lastMessagePreview: "Preciso de ajuda.",
                  waitingSince: new Date().toISOString(),
                  unreadCount: 0,
                  channel: "WhatsApp",
                  deliveryStatus: null,
                  slaBreached: false,
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
  const opener = page.getByRole("button", {
    name: "Visualizar conversa de Consulta acessível",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Consulta acessível", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.getByRole("button", { name: "Fechar conversa", exact: true })).toBeFocused();
  await expect(dialog.getByText("Histórico de demonstração", { exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect
    .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true);
  expect(await page.evaluate(() => window.monitorHarness.opened())).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(errors).toEqual([]);
});

test.describe("remoção de filtros por toque", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("toque na borda do alvo de remoção de 44px preserva rascunho e teclado", async ({
    page,
  }) => {
    const { queries, errors } = await setupTelephony(page);
    await page.getByRole("button", { name: /^Filtros/ }).click();
    await page.getByRole("checkbox", { name: "Nunca trabalhados", exact: true }).check();
    await page.getByRole("combobox", { name: /^Atividade no mês/ }).click();
    await page.getByRole("option", { name: "Menos de 2 contatos no mês", exact: true }).click();
    await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await expect.poll(() => queries.at(-1)?.filters.neverWorked).toBe(true);
    const search = page.getByLabel("Pesquisar cliente ou telefone", { exact: true });
    await search.fill("rascunho não aplicado");
    const chips = page.getByLabel("Filtros aplicados", { exact: true });
    const chip = chips.getByRole("button", { name: /^Filtro aplicado Nunca trabalhados/ });
    // The decorative span is the actual MUI delete handler; it is not a nested button.
    const target = chip.locator("span[aria-hidden='true']");
    await expect(target).toBeVisible();
    const bounds = await target.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await page.touchscreen.tap(bounds!.x + 2, bounds!.y + 2);
    await expect(chip).toHaveCount(0);
    await expect.poll(() => queries.at(-1)?.filters.neverWorked).toBe(false);
    expect(queries.at(-1)?.filters).toMatchObject({
      monthlyActivity: "contacts_lt2",
      searchText: "",
    });
    await expect(search).toHaveValue("rascunho não aplicado");
    const remaining = chips.getByRole("button", { name: /^Filtro aplicado/ });
    await expect(remaining).toHaveCount(1);
    await remaining.press("Delete");
    await expect.poll(() => queries.at(-1)?.filters.monthlyActivity).toBe("all");
    await expect(chips).toHaveCount(0);
    await expect(search).toHaveValue("rascunho não aplicado");
    expect(errors).toEqual([]);
  });
});
