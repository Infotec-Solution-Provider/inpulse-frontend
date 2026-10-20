import { test, expect, type Page } from "@playwright/test";
const screens: Record<string, string> = {
  "tools/mass-messages": "Disparos",
  "reports/metrics": "Métricas",
  "reports/metrics/new": "Nova métrica",
  "reports/dashboards": "Dashboards",
  "reports/dashboards/1": "Painel demonstrativo",
  "reports/generated": "Relatórios gerados",
  "reports/report-generator": "Gerador de relatórios",
  contacts: "Contatos",
  "ready-messages": "Mensagens prontas",
  "internal-groups": "Grupos internos",
  "auto-response": "Resposta automática",
  "whatsapp-senders": "Identificar remetentes",
  "contact-requests": "Solicitações de contatos",
  "ai-agents": "Agentes",
  "ai-settings": "Configurações de IA",
  "ai-supervisor": "Assistente",
  wallets: "Carteiras",
  "sip-config": "Configuração SIP",
  funnel: "Pipelines",
  "funnel/1/config": "Configurar: Pipeline demonstrativo",
};
async function open(page: Page) {
  await page.goto("/tests/admin-cruds/index.html");
  await page
    .getByRole("heading", { name: "Mensagens prontas", exact: true })
    .waitFor({ state: "visible", timeout: 30000 });
}
async function go(page: Page, route: string) {
  await page.evaluate((route) => (window as any).adminCrudTest.navigate(route), route);
  await expect(page.getByRole("heading", { name: screens[route], exact: true })).toBeVisible();
}
for (const [width, height] of [
  [1440, 900],
  [1280, 720],
  [1024, 768],
  [390, 844],
  [320, 844],
  [844, 390],
]) {
  for (const theme of ["light", "dark"]) {
    test(`all resource pages reflow ${width}x${height} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await open(page);
      await page.evaluate((theme) => (window as any).adminCrudTest.theme(theme), theme);
      for (const route of Object.keys(screens)) {
        await go(page, route);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          route,
        ).toBe(true);
        await expect(page.locator(".ip-crud-page").first()).toHaveCSS("font-family", /Inter/);
      }
      expect(errors).toEqual([]);
    });
  }
}
test("filters cancel drafts, apply atomically and keep query on return", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título", { exact: true }).fill("Mensagem 23");
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByText("Mensagem 01", { exact: true })).toBeVisible();
  await expect(page.getByText("Título: Mensagem 23", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Título", { exact: true })).toHaveValue("");
  await dialog.getByLabel("Título", { exact: true }).fill("Mensagem 23");
  await dialog.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByText("Mensagem 23", { exact: true })).toBeVisible();
  await expect(page.getByText("Mensagem 01", { exact: true })).toHaveCount(0);
  await go(page, "internal-groups");
  await go(page, "ready-messages");
  await expect(page.getByText("Título: Mensagem 23", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
  await expect(page.getByText("Mensagem 01", { exact: true })).toBeVisible();
});
test("local pagination and actor/tenant query isolation", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /next page|próxima página/i }).click();
  await expect(page.getByText("Mensagem 11", { exact: true })).toBeVisible();
  await go(page, "contacts");
  await go(page, "ready-messages");
  await expect(page.getByText("Mensagem 11", { exact: true })).toBeVisible();
  await page.evaluate(() => (window as any).adminCrudTest.switchActor(2));
  await expect(page.getByText("Mensagem 01", { exact: true })).toBeVisible();
});
test("contact advanced filters support multiple sectors and cancel", async ({ page }) => {
  await open(page);
  await go(page, "contacts");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Setores", exact: true }).click();
  await page.getByRole("option", { name: "Atendimento", exact: true }).click();
  await page.getByRole("option", { name: "Comercial", exact: true }).click();
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByText(/Setores:/)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).adminCrudTest.calls().filter((x: any) => x.kind.startsWith("create"))
            .length,
      ),
    )
    .toBe(0);
});
test("failed message save preserves draft and can be cancelled", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Nova mensagem", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Rascunho preservado");
  await page.getByLabel("Texto da mensagem", { exact: true }).fill("Mensagem demonstrativa");
  await page.evaluate(() => (window as any).adminCrudTest.fail());
  await page.getByRole("button", { name: /Salvar|Cadastrar/, exact: true }).click();
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue("Rascunho preservado");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByLabel("Título", { exact: true })).toHaveCount(0);
});
for (const [route, action] of [
  ["tools/mass-messages", "Novo disparo"],
  ["contacts", "Novo contato"],
  ["internal-groups", "Novo grupo"],
  ["auto-response", "Nova regra"],
  ["ai-agents", "Novo agente"],
  ["wallets", "Nova carteira"],
  ["funnel", "Novo pipeline"],
]) {
  test(`creation form reflows on 320px: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await open(page);
    await go(page, route);
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(
      page.getByRole("button", { name: /Cancelar|Fechar/, exact: true }).last(),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const overflow = await page
      .locator(".MuiModal-root")
      .last()
      .evaluate((el) => el.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
    const content = page
      .locator(".MuiDialog-paper,.ip-crud-modal-host")
      .filter({ visible: true })
      .last();
    await expect.poll(() => content.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
}

test("mass dispatch lists never substitute demo data for an empty or failed response", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => (window as any).adminCrudTest.massState({ massEmpty: true }));
  await go(page, "tools/mass-messages");
  await expect(page.getByText("Nenhum disparo encontrado", { exact: false })).toBeVisible();
  await expect(page.getByText("Disparo demonstrativo", { exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as any).adminCrudTest.massState({ massReadFailure: true }));
  await page.getByRole("button", { name: "Atualizar lista", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Não foi possível atualizar os disparos" }),
  ).toBeVisible();
  await expect(page.getByText("Disparo demonstrativo", { exact: true })).toHaveCount(0);
});

test("uncertain mass dispatch creation preserves the draft and blocks a duplicate attempt", async ({
  page,
}) => {
  await open(page);
  await go(page, "tools/mass-messages");
  await page.getByRole("button", { name: "Novo disparo", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Titulo do disparo", { exact: false }).fill("Rascunho de disparo");
  await dialog.getByRole("combobox", { name: "WhatsApp", exact: true }).click();
  await page.getByRole("option", { name: /Canal demonstrativo/ }).click();
  await page.evaluate(() => (window as any).adminCrudTest.fail());
  await dialog.getByRole("button", { name: "Criar disparo", exact: true }).click();
  await expect(
    dialog.getByRole("alert").filter({ hasText: "Não foi possível confirmar o cadastro" }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Titulo do disparo", { exact: false })).toHaveValue(
    "Rascunho de disparo",
  );
  await expect(dialog.getByRole("button", { name: "Criar disparo", exact: true })).toBeDisabled();
  expect(
    await page.evaluate(
      () =>
        (window as any).adminCrudTest.calls().filter((x: any) => x.kind === "create-mass").length,
    ),
  ).toBe(1);
});

test("a delayed dispatch query cannot replace a newer applied filter", async ({ page }) => {
  await open(page);
  await go(page, "tools/mass-messages");
  await page.evaluate(() => (window as any).adminCrudTest.massState({ massDelay: true }));
  for (const status of ["Rascunho", "Concluido"]) {
    await page.getByRole("button", { name: /^Filtros/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: /^Status/ }).click();
    await page.getByRole("option", { name: status, exact: true }).click();
    await dialog.getByRole("button", { name: "Aplicar", exact: true }).click();
  }
  await expect(page.getByText("Disparo COMPLETED", { exact: true })).toBeVisible();
  await page.waitForTimeout(1300);
  await expect(page.getByText("Disparo COMPLETED", { exact: true })).toBeVisible();
  await expect(page.getByText("Disparo DRAFT", { exact: true })).toHaveCount(0);
});

test("real providers reject failed writes so editors cannot report false success", async ({
  page,
}) => {
  let failedRequests = 0;
  await page.route("**/api/ready-messages**", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { data: [] } });
    failedRequests++;
    return route.fulfill({ status: 500, json: { message: "Falha simulada" } });
  });
  await open(page);
  await page.evaluate(() => (window as any).adminCrudTest.navigate("provider-contracts"));
  for (const name of [
    "ready-create",
    "ready-delete",
    "group-create",
    "group-update",
    "group-image",
    "group-delete",
    "contact-delete",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByTestId(name)).toHaveText("rejected");
  }
  expect(failedRequests).toBe(2);
  expect(
    await page.evaluate(
      () =>
        (window as any).adminCrudTest.calls().filter((x: any) => x.kind.startsWith("real-")).length,
    ),
  ).toBe(5);
});
