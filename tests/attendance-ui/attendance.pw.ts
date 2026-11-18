import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";
import type {} from "./harness";

const artifacts = resolve(
  process.env.ATTENDANCE_UI_ARTIFACTS_DIR || "test-results/attendance-ui-artifacts",
);
const rows = (page: Page) => page.getByTestId("chat-menu-item");
const draft = (page: Page) => page.getByRole("textbox", { name: "Mensagem", exact: true });
async function open(page: Page, width = 1440, height = 900, fixture = "") {
  await page.setViewportSize({ width, height });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return (url.hostname === "127.0.0.1" &&
      url.port === "4210" &&
      !url.pathname.startsWith("/api/")) ||
      ["blob:", "data:"].includes(url.protocol)
      ? route.continue()
      : route.abort();
  });
  await page.goto(`/tests/attendance-ui/index.html${fixture}`);
  await expect(page.getByRole("heading", { name: "Conversas", exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(4);
  await page.evaluate(() => document.fonts.ready);
  return errors;
}
async function selectAna(page: Page) {
  await rows(page).filter({ hasText: "Ana Souza" }).click();
  await expect(draft(page)).toBeVisible();
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("dialog").getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function noOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
}

test("transfer and finish use accessible icons in the conversation header", async ({ page }) => {
  await open(page);
  await selectAna(page);

  const conversation = page.getByRole("region", { name: "Conversa com Ana Souza", exact: true });
  for (const label of ["Transferir conversa", "Finalizar conversa"]) {
    const button = conversation.getByRole("button", { name: `${label}: Ana Souza`, exact: true });
    await expect(button).toBeVisible();
    await expect(button).toHaveText("");
    await expect(button.locator("svg")).toBeVisible();
    await button.hover();
    await expect(page.getByRole("tooltip", { name: label, exact: true })).toBeVisible();
    await button.press("Enter");
    const dialog = page.getByRole("dialog", { name: label, exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await conversation.getByRole("button", { name: "Ações da conversa com Ana Souza" }).click();
  const menu = page.getByRole("menu", { name: "Ações da conversa" });
  await expect(menu.getByRole("menuitem", { name: "Transferir conversa" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Finalizar conversa" })).toBeVisible();
});

test("view options keep the call and WhatsApp draft while switching layouts on desktop and mobile", async ({ page }) => {
  const errors = await open(page, 1440, 900, "?integrated-fixture");
  const area = page.getByRole("region", { name: "Área de atendimento", exact: true });
  const controls = page.getByRole("region", { name: "Telefone web", exact: true });
  const queueOptions = page.getByRole("button", { name: "Opções de visualização", exact: true });
  const layoutMenu = page.getByRole("menu", { name: "Visualização do atendimento", exact: true });
  const chatOptions = page.getByRole("button", { name: "Ações da conversa com Ana Souza", exact: true });
  const chatMenu = page.getByRole("menu", { name: "Ações da conversa", exact: true });
  const draftText = "Mensagem durante a chamada";

  await expect(area).toHaveAttribute("data-attendance-view", "classic");
  await expect(page.getByRole("combobox", { name: "Visualização do atendimento" })).toHaveCount(0);
  await queueOptions.focus();
  await page.keyboard.press("Enter");
  await expect(layoutMenu.getByRole("menuitemradio", { name: "Clássico" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(layoutMenu).toBeHidden();
  await expect(queueOptions).toBeFocused();

  await selectAna(page);
  await draft(page).fill(draftText);

  await queueOptions.click();
  await layoutMenu.getByRole("menuitemradio", { name: "Integrado" }).click();
  await expect(area).toHaveAttribute("data-attendance-view", "integrated");
  await expect(page.getByRole("region", { name: "Ficha do cliente", exact: true })).toContainText("Ana Souza");
  await expect(page.getByText("Contato realizado · 1min 1s")).toBeVisible();
  const history = page.getByRole("group", { name: "Canal do histórico" });
  await history.getByRole("button", { name: "Ligações" }).click();
  await expect(page.getByText("Olá! Preciso acompanhar meu atendimento.")).toHaveCount(0);
  await history.getByRole("button", { name: "Tudo" }).click();
  await expect(page.getByText("Olá! Preciso acompanhar meu atendimento.")).toBeVisible();

  const queue = page.getByRole("group", { name: "Canal da fila" });
  const conversations = queue.getByRole("button", { name: "Conversas" });
  await conversations.click();
  await expect(conversations).toHaveAttribute("aria-pressed", "true");
  await expect(rows(page).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir próxima ligação: Ana da fila" })).toBeHidden();
  const telephony = queue.getByRole("button", { name: "Telefonia" });
  await telephony.click();
  await expect(telephony).toHaveAttribute("aria-pressed", "true");
  await expect(rows(page).first()).toBeHidden();
  await expect(queueOptions).toBeVisible();
  await page.getByRole("button", { name: "Abrir próxima ligação: Ana da fila" }).click();
  const appointment = page.getByRole("complementary", { name: "Dados do atendimento" });
  await expect(appointment).toContainText("Retorno de pós-venda");
  await expect(draft(page)).toHaveValue(draftText);

  const phoneQueue = page.getByRole("region", { name: "Telefonia e próximas ligações", exact: true });
  await phoneQueue.getByRole("button", { name: "Conectar telefonia", exact: true }).click();
  await expect(phoneQueue.getByRole("status", { name: "Ramal conectado", exact: true })).toBeVisible();
  await appointment.getByRole("button", { name: /Iniciar liga/ }).click();
  await expect.poll(() => page.evaluate(() => window.phoneHarness.calls.length)).toBe(1);
  await page.evaluate(() => window.phoneHarness.session?.emit("confirmed"));
  await expect(page.getByRole("region", { name: "Conversa com Ana Souza", exact: true })
    .getByRole("region", { name: "Telefone web", exact: true })).toBeVisible();
  await controls.getByRole("button", { name: "Opções da ligação", exact: true }).click();
  await page.getByText("Localizar conversa de WhatsApp", { exact: true }).click();
  const contacts = page.getByRole("group", { name: "Contatos encontrados" });
  await expect(contacts.getByRole("button")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(draft(page)).toHaveValue(draftText);
  await controls.getByRole("button", { name: "Colocar em espera" }).click();
  await expect(controls.getByRole("button", { name: "Retomar ligação" })).toBeVisible();
  await controls.getByRole("button", { name: "Retomar ligação" }).click();

  await appointment.getByRole("button", { name: "Fechar atendimento telefônico" }).click();
  await queueOptions.click();
  await expect(layoutMenu.getByRole("menuitemradio", { name: "Integrado" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await layoutMenu.getByRole("menuitemradio", { name: "Clássico" }).click();
  await expect(area).toHaveAttribute("data-attendance-view", "classic");
  await expect(controls.getByRole("button", { name: "Desligar", exact: true })).toBeVisible();
  await expect(draft(page)).toHaveValue(draftText);
  await queueOptions.click();
  await layoutMenu.getByRole("menuitemradio", { name: "Integrado" }).click();
  await expect(area).toHaveAttribute("data-attendance-view", "integrated");
  await expect(controls.getByRole("button", { name: "Desligar", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(queueOptions).toBeHidden();
  await expect(page.getByRole("region", { name: "Ficha do cliente", exact: true })).toHaveCount(0);
  await expect(draft(page)).toBeInViewport();
  await chatOptions.click();
  await expect(chatMenu.getByRole("menuitemradio", { name: "Integrado" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await chatMenu.getByRole("menuitemradio", { name: "Clássico" }).click();
  await expect(area).toHaveAttribute("data-attendance-view", "classic");
  await expect(controls.getByRole("button", { name: "Desligar", exact: true })).toBeVisible();
  await expect(draft(page)).toHaveValue(draftText);
  await chatOptions.click();
  await chatMenu.getByRole("menuitemradio", { name: "Integrado" }).click();
  await expect(area).toHaveAttribute("data-attendance-view", "integrated");
  await expect(controls.getByRole("button", { name: "Desligar", exact: true })).toBeVisible();
  await expect(draft(page)).toHaveValue(draftText);
  expect(await page.evaluate(() => window.phoneHarness.calls.length)).toBe(1);
  await noOverflow(page);

  await controls.getByRole("button", { name: "Desligar", exact: true }).click();
  await page.reload();
  await expect(area).toHaveAttribute("data-attendance-view", "integrated");
  await queueOptions.click();
  await expect(layoutMenu.getByRole("menuitemradio", { name: "Integrado" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(errors).toEqual([]);
});

for (const { device, width, height } of [
  { device: "desktop", width: 1440, height: 900 },
  { device: "mobile", width: 320, height: 844 },
]) {
  test(`inline phone appointment fits long customer data and follows both themes on ${device}`, async ({ page }) => {
    const errors = await open(page, width, height, "?integrated-fixture&appointment-overflow");
    if (device === "desktop") await selectAna(page);

    await page.getByRole("button", { name: "Opções de visualização", exact: true }).click();
    await page.getByRole("menuitemradio", { name: "Integrado", exact: true }).click();
    const details = page.getByRole("complementary", { name: "Dados do atendimento", exact: true });
    let customerPanelWidth: number | null = null;
    if (device === "desktop") {
      await expect(details.getByRole("region", { name: "Ficha do cliente", exact: true })).toBeVisible();
      customerPanelWidth = (await details.boundingBox())!.width;
    }
    await page.getByRole("button", { name: /Abrir próxima ligação/ }).click();

    const panel = page.getByRole("region", { name: "Atendimento telefônico", exact: true });
    await expect(panel.getByRole("heading", { name: "Resumo do cliente", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Iniciar ligação", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Finalizar atendimento", exact: true })).toBeVisible();

    const legalName = "DISTRIBUIDORA DEMONSTRATIVA DE ALIMENTOS E PRODUTOS PARA SUPERMERCADOS LTDA";
    const tradeName = "SUPERMERCADOEXEMPLOCOMNOMECOMERCIALMUITOLONGO";
    const fiscalNumber = "00841236000145";
    await expect.poll(async () => (await panel.locator("dd").allTextContents()).map((value) => value.trim()))
      .toEqual(expect.arrayContaining([legalName, tradeName]));

    await panel.getByText("Telefones do atendimento", { exact: true }).click();
    const phones = panel.locator("button[aria-pressed]");
    await expect(phones).toHaveCount(2);
    await expect(phones.first()).toHaveAttribute("aria-pressed", "true");
    await phones.last().click();
    await expect(phones.last()).toHaveAttribute("aria-pressed", "true");
    await panel.getByText("Contatos do WhatsApp", { exact: true }).click();
    await expect(panel.getByRole("button", { name: /Ana Souza.*Conversar/ })).toBeVisible();
    await panel.getByText("Últimas compras", { exact: true }).click();
    await expect(panel.getByText(/Pedido demonstrativo/)).toBeVisible();
    await panel.getByText("Histórico recente", { exact: true }).click();
    await expect(panel.getByText("Contato realizado", { exact: true })).toBeVisible();

    const colors: string[] = [];
    for (const mode of ["light", "dark"] as const) {
      await page.evaluate((selected) => window.attendanceFixture.theme(selected), mode);
      await expect(page.locator("[data-ui-theme]").first()).toHaveAttribute("data-ui-theme", mode);
      await noOverflow(page);
      const geometry = await panel.evaluate((element, values) => {
        const panelBounds = element.getBoundingClientRect();
        const fields = [...element.querySelectorAll("dd")].filter((field) => {
          const value = field.textContent?.trim() ?? "";
          return value === values.legalName || value === values.tradeName ||
            value.replace(/\D/g, "") === values.fiscalNumber;
        });
        const textFits = fields.every((field) => {
          const fieldBounds = field.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(field);
          const rectangles = [...range.getClientRects()];
          return rectangles.length > 0 && rectangles.every((rect) =>
            rect.left >= Math.max(fieldBounds.left, panelBounds.left) - 1 &&
            rect.right <= Math.min(fieldBounds.right, panelBounds.right) + 1,
          );
        });
        const nestedScrollers = [...element.querySelectorAll("*")].filter(
          (child) => ["auto", "scroll"].includes(getComputedStyle(child).overflowY) &&
            child.scrollHeight > child.clientHeight + 1,
        ).length;
        const surface = document.createElement("span");
        surface.style.cssText = "position:absolute;background-color:var(--ip-surface)";
        element.append(surface);
        const expectedColor = getComputedStyle(surface).backgroundColor;
        surface.remove();
        return {
          width: panelBounds.width,
          overflow: element.scrollWidth - element.clientWidth,
          visibleFields: fields.length,
          textFits,
          nestedScrollers,
          color: getComputedStyle(element).backgroundColor,
          expectedColor,
        };
      }, { legalName, tradeName, fiscalNumber });
      if (customerPanelWidth !== null) {
        expect(geometry.width).toBeGreaterThan(customerPanelWidth);
        expect(geometry.width).toBeGreaterThanOrEqual(300);
        expect((await details.boundingBox())!.width).toBeLessThanOrEqual(360);
      } else {
        expect(geometry.width).toBeLessThanOrEqual(width);
      }
      expect(geometry.overflow).toBeLessThanOrEqual(1);
      expect(geometry.visibleFields).toBe(3);
      expect(geometry.textFits).toBe(true);
      expect(geometry.nestedScrollers).toBe(0);
      expect(geometry.color).toBe(geometry.expectedColor);
      colors.push(geometry.color);
    }
    expect(new Set(colors).size).toBe(2);

    if (customerPanelWidth !== null) {
      const chat = page.getByRole("region", { name: "Conversa com Ana Souza", exact: true });
      for (const viewportWidth of [1140, 1139]) {
        await page.setViewportSize({ width: viewportWidth, height });
        await noOverflow(page);
        await expect(draft(page)).toBeInViewport();
        const chatBox = (await chat.boundingBox())!;
        const detailsBox = (await details.boundingBox())!;
        if (viewportWidth === 1140) {
          expect(chatBox.width).toBeGreaterThanOrEqual(300);
          expect(detailsBox.x).toBeGreaterThanOrEqual(chatBox.x + chatBox.width - 1);
        } else {
          expect(detailsBox.y).toBeGreaterThanOrEqual(chatBox.y + chatBox.height - 1);
          expect(detailsBox.width).toBeCloseTo(chatBox.width, 0);
        }
        expect(await panel.evaluate((element) => element.scrollWidth - element.clientWidth))
          .toBeLessThanOrEqual(1);
      }
      await page.setViewportSize({ width, height });
    }

    await panel.getByRole("button", { name: "Fechar atendimento telefônico", exact: true }).click();
    await expect(panel).toBeHidden();
    if (customerPanelWidth !== null) {
      await expect(details.getByRole("region", { name: "Ficha do cliente", exact: true })).toBeVisible();
      expect((await details.boundingBox())!.width).toBeCloseTo(customerPanelWidth, 0);
      await expect(draft(page)).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

test("conversation type carousel navigates without applying filters and keeps keyboard focus visible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await open(page, 320, 844);
  const carousel = page.getByRole("group", { name: "Tipos de conversa", exact: true });
  const viewport = carousel.locator(".attendance-type-carousel-viewport");
  const previous = carousel.getByRole("button", {
    name: "Tipos de conversa anteriores",
    exact: true,
  });
  const next = carousel.getByRole("button", { name: "Próximos tipos de conversa", exact: true });
  await expect(previous).toHaveAttribute("aria-disabled", "true");
  await expect(next).toHaveAttribute("aria-disabled", "false");
  expect(await viewport.evaluate((element) => getComputedStyle(element).scrollbarWidth)).toBe(
    "none",
  );
  await next.click();
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect(carousel.getByRole("button", { name: "Todas", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(rows(page)).toHaveCount(4);

  const all = carousel.getByRole("button", { name: "Todas", exact: true });
  await all.focus();
  await page.keyboard.press("End");
  const scheduled = carousel.getByRole("button", { name: "Agendadas", exact: true });
  await expect(scheduled).toBeFocused();
  const inset = await scheduled.evaluate((button) => {
    const option = button.getBoundingClientRect();
    const bounds = button.closest(".attendance-type-carousel-viewport")!.getBoundingClientRect();
    return { left: option.left - bounds.left, right: bounds.right - option.right };
  });
  expect(inset.left).toBeGreaterThanOrEqual(5);
  expect(inset.right).toBeGreaterThanOrEqual(5);
  await expect(carousel.getByRole("button", { name: "Todas", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(scheduled).toBeFocused();
    await expect
      .poll(() =>
        scheduled.evaluate((button) => {
          const option = button.getBoundingClientRect();
          const bounds = button.closest(".attendance-type-carousel-viewport")!.getBoundingClientRect();
          return option.left >= bounds.left + 5 && option.right <= bounds.right - 5;
        }),
      )
      .toBe(true);
    await expect(all).toHaveAttribute("aria-pressed", "true");
  }
  await page.keyboard.press("Enter");
  await expect(scheduled).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Home");
  await expect(all).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(rows(page)).toHaveCount(4);
  await expect(previous).toHaveAttribute("aria-disabled", "true");
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("applying a type in the filter panel reveals it and resizing hides unnecessary carousel arrows", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await open(page);
  await page.getByRole("button", { name: "Filtrar e ordenar conversas", exact: true }).click();
  await choose(page, "Tipo de conversa", "Agendadas");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  const carousel = page.getByRole("group", { name: "Tipos de conversa", exact: true });
  const scheduled = carousel.getByRole("button", { name: "Agendadas", exact: true });
  await expect(scheduled).toHaveAttribute("aria-pressed", "true");
  const fullyVisible = () =>
    scheduled.evaluate((button) => {
      const option = button.getBoundingClientRect();
      const bounds = button.closest(".attendance-type-carousel-viewport")!.getBoundingClientRect();
      return option.left >= bounds.left + 5 && option.right <= bounds.right - 5;
    });
  await expect.poll(fullyVisible).toBe(true);
  await carousel.evaluate((element) => {
    element.style.width = "600px";
  });
  await expect(
    carousel.getByRole("button", { name: "Próximos tipos de conversa", exact: true }),
  ).toHaveCount(0);
  await carousel.evaluate((element) => {
    element.style.removeProperty("width");
  });
  await expect(
    carousel.getByRole("button", { name: "Próximos tipos de conversa", exact: true }),
  ).toBeVisible();
  await expect.poll(fullyVisible).toBe(true);
  expect(errors).toEqual([]);
});

test("compact telephony can hide without unmounting and reopens when the call becomes active", async ({
  page,
}) => {
  const errors = await open(page, 1280, 540);
  const section = page.getByRole("region", { name: "Telefonia e próximas ligações", exact: true });
  const phone = page.locator('section[aria-label="Telefone web"]');
  const expanded = (await section.boundingBox())!.height;
  await section.getByRole("button", { name: "Abrir telefone", exact: true }).click();
  await section.getByRole("button", { name: "Conectar telefonia", exact: true }).click();
  await phone.getByLabel("Telefone ou ramal", { exact: true }).fill("102");
  await page
    .getByRole("button", { name: "Ocultar telefonia e próxima ligação", exact: true })
    .click();
  await expect(phone).toHaveCount(1);
  await expect(phone).toBeHidden();
  expect((await section.boundingBox())!.height).toBeLessThan(expanded);
  expect((await section.boundingBox())!.height).toBeLessThanOrEqual(48);
  await expect(page.getByRole("heading", { name: "Conversas", exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Mostrar telefonia e próxima ligação", exact: true })
    .click();
  await expect(section.getByRole("status", { name: "Ramal conectado", exact: true })).toBeVisible();
  await expect(phone.getByLabel("Telefone ou ramal", { exact: true })).toHaveValue("102");
  await phone.getByRole("button", { name: "Ligar", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.phoneHarness.session !== null)).toBe(true);
  await page.evaluate(() => {
    (window as any).originalCollapseSession = window.phoneHarness.session;
  });
  await page
    .getByRole("button", { name: "Ocultar telefonia e próxima ligação", exact: true })
    .click();
  await expect(phone).toBeHidden();
  await page.evaluate(() => window.phoneHarness.session?.emit("confirmed"));
  await expect(phone.getByRole("button", { name: "Desligar", exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => window.phoneHarness.session === (window as any).originalCollapseSession,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => window.phoneHarness.calls.length)).toBe(1);
  await phone.getByRole("button", { name: "Desligar", exact: true }).click();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("search, immediate unread filter and an empty result preserve the selected chat", async ({
  page,
}) => {
  const errors = await open(page);
  await selectAna(page);
  await draft(page).fill("Rascunho em andamento");
  await page.getByRole("button", { name: "Não lidas", exact: true }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Bruno Lima");
  await expect(draft(page)).toHaveValue("Rascunho em andamento");
  await page.getByRole("button", { name: "Todas", exact: true }).click();
  await page.getByLabel("Buscar conversa", { exact: true }).fill("sem-correspondencia");
  await expect(page.getByText("Nenhuma conversa encontrada", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
  await expect(draft(page)).toHaveValue("Rascunho em andamento");
  await page.getByLabel("Buscar conversa", { exact: true }).fill("Carla");
  await page.getByLabel("Buscar conversa", { exact: true }).press("Enter");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText("Carla Santos");
  await expect(draft(page)).toHaveValue("Rascunho em andamento");
  expect(await page.evaluate(() => window.attendanceFixture.state.sends.length)).toBe(0);
  expect(errors).toEqual([]);
});

test("filter drafts apply explicitly, cancellation discards them, and sort affects real rows", async ({
  page,
}) => {
  const errors = await open(page);
  await selectAna(page);
  await draft(page).fill("Rascunho enquanto ajusto os filtros");
  await page.getByRole("button", { name: "Filtrar e ordenar conversas", exact: true }).click();
  await choose(page, "Tipo de conversa", "Não lidas");
  await expect(rows(page)).toHaveCount(4);
  await page.getByRole("button", { name: "Cancelar", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(rows(page)).toHaveCount(4);
  await expect(draft(page)).toHaveValue("Rascunho enquanto ajusto os filtros");
  expect(await page.evaluate(() => window.attendanceFixture.state.sends.length)).toBe(0);
  await page.getByRole("button", { name: "Filtrar e ordenar conversas", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Tipo de conversa", { exact: true })).toHaveText(
    "Todas",
  );
  await choose(page, "Ordenar por", "Data de início");
  await choose(page, "Ordem", "Crescente");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(rows(page).first()).toContainText("Diego Alves");
  await expect(rows(page).last()).toContainText("Ana Souza");
  expect(errors).toEqual([]);
});

test("conversation actions do not open the chat and pinning moves the row first", async ({
  page,
}) => {
  const errors = await open(page);
  await page
    .getByRole("button", { name: "Mais ações da conversa de Carla Santos", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Fixar conversa", exact: true }).click();
  await expect(rows(page).first()).toContainText("Carla Santos");
  await expect(draft(page)).toHaveCount(0);
  await rows(page).first().focus();
  await page.keyboard.press("Enter");
  await expect(draft(page)).toBeVisible();
  expect(errors).toEqual([]);
});

test("real composer accepts consecutive sends and retains a newer draft after confirmation", async ({
  page,
}) => {
  const errors = await open(page);
  await selectAna(page);
  await draft(page).fill("Primeira mensagem simulada");
  await draft(page).press("Enter");
  await expect(draft(page)).toHaveValue("");
  await expect.poll(() => page.evaluate(() => window.attendanceFixture.state.sends.length)).toBe(1);
  await draft(page).fill("Segunda mensagem simulada");
  await draft(page).press("Enter");
  await expect(draft(page)).toHaveValue("");
  await draft(page).fill("Novo rascunho preservado");
  await page.evaluate(() => window.attendanceFixture.resolveSend(0));
  await expect.poll(() => page.evaluate(() => window.attendanceFixture.state.sends.length)).toBe(2);
  await page.evaluate(() => window.attendanceFixture.resolveSend(1));
  await expect(draft(page)).toHaveValue("Novo rascunho preservado");
  await expect(page.locator('[id="800"]')).toContainText("Primeira mensagem simulada");
  await expect(page.locator('[id="801"]')).toContainText("Segunda mensagem simulada");
  await expect(page.locator("[data-pending-send-id]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("message quotation and attachment cancellation retain the current text", async ({ page }) => {
  const errors = await open(page);
  await selectAna(page);
  const message = page.locator('[id="77"]');
  await message.hover();
  await message.getByRole("button", { name: /^Mais opções da mensagem/ }).click();
  await page.getByRole("menuitem", { name: "Responder", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remover citação", exact: true })).toBeVisible();
  await draft(page).fill("Resposta com contexto");
  await page.getByRole("button", { name: "Remover citação", exact: true }).click();
  await expect(draft(page)).toHaveValue("Resposta com contexto");
  await page.locator('input[type="file"]').setInputFiles({
    name: "documento-ficticio.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Apenas dados de teste"),
  });
  await expect(page.getByRole("button", { name: "Enviar anexo", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Legenda do anexo", exact: true })).toHaveValue(
    "Resposta com contexto",
  );
  await page.getByRole("button", { name: "Remover anexo", exact: true }).first().click();
  await expect(draft(page)).toHaveValue("Resposta com contexto");
  expect(await page.evaluate(() => window.attendanceFixture.state.sends.length)).toBe(0);
  expect(errors).toEqual([]);
});

test("Enter in the channel menu does not send the draft and Shift Enter creates a line break", async ({
  page,
}) => {
  const errors = await open(page);
  await selectAna(page);
  await draft(page).fill("Rascunho aberto durante seleção de canal");
  await page
    .getByRole("button", { name: "Canal de envio: Canal de demonstração", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Canal de demonstração", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(draft(page)).toHaveValue("Rascunho aberto durante seleção de canal");
  expect(await page.evaluate(() => window.attendanceFixture.state.sends.length)).toBe(0);
  await draft(page).press("End");
  await draft(page).press("Shift+Enter");
  await expect(draft(page)).toHaveValue("Rascunho aberto durante seleção de canal\n");
  expect(await page.evaluate(() => window.attendanceFixture.state.sends.length)).toBe(0);
  expect(errors).toEqual([]);
});

test("the attachment preview accepts the quote and caption exactly once", async ({ page }) => {
  const errors = await open(page);
  await selectAna(page);
  const message = page.locator('[id="77"]');
  await message.hover();
  await message.getByRole("button", { name: /^Mais opções da mensagem/ }).click();
  await page.getByRole("menuitem", { name: "Responder", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "documento-ficticio.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Apenas dados de teste"),
  });
  await page
    .getByRole("textbox", { name: "Legenda do anexo", exact: true })
    .fill("Segue o documento solicitado");
  await page.getByRole("textbox", { name: "Legenda do anexo", exact: true }).press("Enter");
  await expect.poll(() => page.evaluate(() => window.attendanceFixture.state.sends.length)).toBe(1);
  const submitted = await page.evaluate(() => {
    const { data } = window.attendanceFixture.state.sends[0];
    return {
      text: data.text,
      quotedId: data.quotedId,
      fileName: data.file?.name,
      chatId: data.chatId,
      clientId: data.clientId,
    };
  });
  expect(submitted).toEqual({
    text: "Segue o documento solicitado",
    quotedId: 77,
    fileName: "documento-ficticio.txt",
    chatId: 1,
    clientId: 23,
  });
  await expect(draft(page)).toBeVisible();
  await draft(page).fill("Novo rascunho após o anexo");
  await page.evaluate(() => window.attendanceFixture.resolveSend());
  await expect(draft(page)).toHaveValue("Novo rascunho após o anexo");
  expect(await page.evaluate(() => window.attendanceFixture.state.sends.length)).toBe(1);
  expect(errors).toEqual([]);
});

test("UNKNOWN stays uncertain and the new draft is never restored or resent automatically", async ({
  page,
}) => {
  const errors = await open(page);
  await selectAna(page);
  await draft(page).fill("Mensagem com resposta incerta");
  await draft(page).press("Enter");
  await expect.poll(() => page.evaluate(() => window.attendanceFixture.state.sends.length)).toBe(1);
  await page.evaluate(() => window.attendanceFixture.rejectUnknown());
  await expect(page.getByRole("button", { name: "Verificar envio", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Recuperar mensagem", exact: true })).toHaveCount(
    0,
  );
  await draft(page).fill("Novo texto após conferir a conversa");
  await page.getByRole("button", { name: "Verificar envio", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.attendanceFixture.state.lookups.length))
    .toBe(1);
  expect(await page.evaluate(() => window.attendanceFixture.state.sends.length)).toBe(1);
  await expect(draft(page)).toHaveValue("Novo texto após conferir a conversa");
  expect(errors).toEqual([]);
});

test("mobile selection and browser back restore the conversation list", async ({ page }) => {
  const errors = await open(page, 390, 844);
  await page.screenshot({
    path: resolve(artifacts, "attendance-sidebar-390x844.png"),
    animations: "disabled",
  });
  await selectAna(page);
  await expect(page.getByLabel("Painel de atendimento", { exact: true })).toBeHidden();
  await expect(page.locator('section[aria-label="Telefone web"]:visible')).toHaveCount(1);
  await page.goBack();
  await expect(page.getByLabel("Painel de atendimento", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("an active phone leaves the real composer reachable on desktop and mobile", async ({
  page,
}) => {
  const errors = await open(page, 1280, 540);
  await selectAna(page);
  const phone = page.locator('section[aria-label="Telefone web"]:visible');
  const section = page.getByRole("region", { name: "Telefonia e próximas ligações", exact: true });
  await section.getByRole("button", { name: "Abrir telefone", exact: true }).click();
  await section.getByRole("button", { name: "Conectar telefonia", exact: true }).click();
  await phone.getByLabel("Telefone ou ramal", { exact: true }).fill("102");
  await phone.getByRole("button", { name: "Ligar", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.phoneHarness.session !== null)).toBe(true);
  await page.evaluate(() => window.phoneHarness.session?.emit("confirmed"));
  for (const [width, height] of [
    [1280, 540],
    [390, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(phone).toHaveCount(1);
    await expect(phone.getByRole("button", { name: "Desligar", exact: true })).toBeVisible();
    await draft(page).fill("Atendimento durante ligação");
    await page.getByRole("button", { name: "Enviar mensagem", exact: true }).click({ trial: true });
    await noOverflow(page);
    const box = await draft(page).boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
    await page.screenshot({
      path: resolve(artifacts, `attendance-active-phone-${width}x${height}.png`),
      animations: "disabled",
    });
  }
  await phone.getByRole("button", { name: "Desligar", exact: true }).click();
  expect(errors).toEqual([]);
});

test("real attendance fits seven dimensions and both themes with a reachable composer", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = await open(page);
  for (const mode of ["light", "dark"] as const) {
    await page.evaluate((mode) => window.attendanceFixture.theme(mode), mode);
    await expect(page.locator("[data-ui-theme]").first()).toHaveAttribute("data-ui-theme", mode);
    for (const [width, height] of [
      [1440, 900],
      [1280, 720],
      [1024, 768],
      [768, 600],
      [390, 844],
      [320, 844],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      await noOverflow(page);
      if (!(await draft(page).isVisible())) await selectAna(page);
      await draft(page).fill("Conferindo o atendimento");
      const send = page.getByRole("button", { name: "Enviar mensagem", exact: true });
      await expect(send).toBeVisible();
      await send.click({ trial: true });
      const box = await draft(page).boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
      await noOverflow(page);
      await page.screenshot({
        path: resolve(artifacts, `attendance-${mode}-${width}x${height}.png`),
        animations: "disabled",
      });
    }
  }
  expect(errors).toEqual([]);
});
