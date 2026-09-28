import { expect, test, type Page, type Route } from "@playwright/test";
import type { MonitorFiltersState } from "../../src/app/(private)/[instance]/monitor/types";

interface Query {
  page: number;
  pageSize: number;
  filters: MonitorFiltersState;
}
function item(id: number, title: string, waiting = true) {
  return {
    id,
    instance: "tenant-a",
    chatType: "wpp",
    contactId: id + 100,
    userId: 2,
    sectorId: 1,
    isFinished: false,
    startedAt: "2026-09-25T09:00:00.000Z",
    finishedAt: null,
    contact: { id: id + 100, name: title, phone: "5511900000000" },
    customer: { RAZAO: "Empresa demonstrativa", CPF_CNPJ: "00000000000" },
    operational: {
      status: waiting ? "waiting_agent" : "waiting_customer",
      lastMessageAt: new Date().toISOString(),
      lastMessagePreview: waiting
        ? "Preciso de ajuda com o atendimento."
        : "Aguardamos sua confirmação.",
      waitingSince: new Date(Date.now() - 42 * 60_000).toISOString(),
      unreadCount: waiting ? 2 : 0,
      channel: "WhatsApp · WABA",
      deliveryStatus: waiting ? null : "UNKNOWN",
      slaBreached: waiting,
    },
  };
}
async function setup(page: Page, handler?: (route: Route, query: Query) => Promise<boolean>) {
  const queries: Query[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/whatsapp/monitor/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/messages")) {
      await route.fulfill({
        json: {
          data: {
            messages: [
              {
                id: 1,
                from: "customer",
                body: "Mensagem do histórico",
                timestamp: String(Date.now()),
                type: "chat",
                status: "RECEIVED",
              },
            ],
            nextCursor: null,
          },
        },
      });
    } else if (url.endsWith("/summary")) {
      await route.fulfill({
        json: {
          data: {
            inProgress: 35,
            waitingAgent: 20,
            waitingCustomer: 15,
            unread: 20,
            overdue: 5,
            scheduled: 3,
            slaMinutes: 30,
          },
        },
      });
    } else {
      const query = route.request().postDataJSON() as Query;
      queries.push(query);
      if (handler && (await handler(route, query))) return;
      const totalCount = query.filters.searchText ? 1 : 35;
      const start = (query.page - 1) * query.pageSize;
      const items = Array.from(
        { length: Math.max(0, Math.min(query.pageSize, totalCount - start)) },
        (_, index) =>
          item(
            start + index + 1,
            query.filters.searchText || `Contato ${start + index + 1}`,
            index % 2 === 0,
          ),
      );
      await route.fulfill({
        json: { data: { items, totalCount, page: query.page, pageSize: query.pageSize } },
      });
    }
  });
  await page.goto("/tests/monitor/index.html");
  await expect(page.getByRole("heading", { name: "Monitoria de conversas" })).toBeVisible();
  return { queries, errors };
}

test("aplica filtros, persiste preferências sem texto e pagina os resultados", async ({ page }) => {
  const { queries, errors } = await setup(page);
  await expect(page.getByRole("article")).toHaveCount(20);
  const before = queries.length;
  await page.getByLabel("Pesquisar", { exact: true }).fill("nova busca");
  await expect(page.getByText("Há alterações de filtros para aplicar.")).toBeVisible();
  expect(queries).toHaveLength(before);
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  expect(queries.at(-1)?.filters.searchText).toBe("nova busca");
  await page.getByRole("button", { name: "Exibir lista compacta" }).click();
  await page.reload();
  await expect(page.getByRole("list", { name: "Lista compacta de conversas" })).toBeVisible();
  await expect(page.getByLabel("Pesquisar", { exact: true })).toHaveValue("");
  await expect(page.getByRole("article")).toHaveCount(20);
  await page.getByRole("button", { name: "Próxima página" }).click();
  await expect(page.getByRole("article")).toHaveCount(15);
  expect(queries.at(-1)?.page).toBe(2);
  expect(errors).toEqual([]);
});

test("ignora resposta antiga e isola preferências/dados ao mudar instância", async ({ page }) => {
  let release: (() => void) | undefined;
  const { queries } = await setup(page, async (route, query) => {
    if (query.filters.searchText !== "lenta") return false;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route
      .fulfill({
        json: {
          data: { items: [item(99, "Resposta antiga")], totalCount: 1, page: 1, pageSize: 20 },
        },
      })
      .catch(() => {});
    return true;
  });
  await expect(page.getByRole("article")).toHaveCount(20);
  await page.getByLabel("Pesquisar", { exact: true }).fill("lenta");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect.poll(() => !!release).toBe(true);
  await page.getByLabel("Pesquisar", { exact: true }).fill("atual");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByRole("heading", { name: "atual", exact: true })).toBeVisible();
  release?.();
  await page.getByRole("button", { name: "Exibir lista compacta" }).click();
  await page.evaluate(() => window.monitorHarness.switchTenant("tenant-b"));
  await expect(page.getByLabel("Pesquisar", { exact: true })).toHaveValue("");
  await expect(page.getByRole("list", { name: "Lista de conversas", exact: true })).toBeVisible();
  await expect(page.getByText("Resposta antiga", { exact: true })).toHaveCount(0);
  expect(queries.at(-1)?.filters.searchText).toBe("");
});

test("erro mantém diagnóstico visível e retry recupera a lista", async ({ page }) => {
  let fails = true;
  const { errors } = await setup(page, async (route) => {
    if (!fails) return false;
    fails = false;
    await route.fulfill({ status: 503, json: { message: "Indisponível" } });
    return true;
  });
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar a monitoria");
  await expect(page.getByText("Nenhuma conversa encontrada")).toHaveCount(0);
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(20);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("pausa eventos, permite atualização manual e retoma sem duplicar listeners", async ({
  page,
}) => {
  await page.clock.install();
  const { queries } = await setup(page);
  await expect(page.getByRole("article")).toHaveCount(20);
  const listeners = await page.evaluate(() => window.monitorHarness.listeners());
  await page.getByRole("button", { name: "Pausar atualização automática" }).click();
  const initial = queries.length;
  await page.evaluate(() => window.monitorHarness.emit());
  await page.waitForTimeout(250);
  expect(queries).toHaveLength(initial);
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect.poll(() => queries.length).toBe(initial + 1);
  await expect(page.getByRole("button", { name: "Atualizar", exact: true })).toBeEnabled();
  await page.evaluate(() => window.monitorHarness.refreshToken());
  await expect.poll(() => queries.length).toBe(initial + 2);
  expect(await page.evaluate(() => window.monitorHarness.listeners())).toBe(listeners);
  await page.getByRole("button", { name: "Retomar atualização automática" }).click();
  await page.clock.runFor(5_100);
  await expect.poll(() => queries.length).toBe(initial + 3);
});

test("respeita Retry-After mesmo após tentativa manual", async ({ page }) => {
  await page.clock.install();
  let fail = true;
  const { queries } = await setup(page, async (route) => {
    if (!fail) return false;
    fail = false;
    await route.fulfill({
      status: 429,
      headers: { "Retry-After": "10" },
      json: { code: "READ_REQUEST_LIMIT", retryAfterSeconds: 10 },
    });
    return true;
  });
  await expect(page.getByRole("alert")).toContainText("Aguarde 10 segundos");
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await page.clock.runFor(5_000);
  expect(queries).toHaveLength(1);
  await page.clock.runFor(5_200);
  await expect(page.getByRole("article")).toHaveCount(20);
  expect(queries).toHaveLength(2);
});

test("aba oculta não consulta por socket e recupera ao voltar", async ({ page }) => {
  await page.clock.install();
  const { queries } = await setup(page);
  await expect(page.getByRole("article")).toHaveCount(20);
  const initial = queries.length;
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    window.monitorHarness.emit();
  });
  await page.clock.runFor(65_000);
  expect(queries).toHaveLength(initial);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => queries.length).toBe(initial + 1);
});

test("filtro rápido não aplica rascunho e acesso direto exige administrador", async ({ page }) => {
  const { queries } = await setup(page);
  await expect(page.getByRole("article")).toHaveCount(20);
  await page.getByLabel("Pesquisar", { exact: true }).fill("rascunho");
  await page.getByRole("button", { name: /^Aguardando atendente/ }).click();
  await expect.poll(() => queries.at(-1)?.filters.operationalStatus).toBe("waiting_agent");
  expect(queries.at(-1)?.filters.searchText).toBe("");
  await expect(page.getByLabel("Pesquisar", { exact: true })).toHaveValue("rascunho");
  await page.evaluate(() => window.monitorHarness.setRole("OPERADOR"));
  await expect(page.getByRole("alert")).toContainText("apenas para administradores");
  await expect(page.getByRole("article")).toHaveCount(0);
  expect(await page.evaluate(() => window.monitorHarness.listeners())).toBe(0);
});

test("finalização aguarda confirmação e atualiza só após sucesso", async ({ page }) => {
  const { queries, errors } = await setup(page);
  await expect(page.getByRole("article")).toHaveCount(20);
  const applyBounds = await page.getByRole("button", { name: "Aplicar filtros" }).boundingBox();
  expect(applyBounds!.y + applyBounds!.height).toBeLessThanOrEqual(1000);
  const initial = queries.length;
  await page.getByRole("button", { name: /Finalizar.*Contato 1$/ }).click();
  const dialog = page.getByRole("dialog", { name: "Finalizar conversa" });
  await dialog.getByRole("combobox", { name: "Resultado" }).click();
  await page.getByRole("option", { name: "Concluído" }).click();
  await dialog.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Finalizando..." })).toBeDisabled();
  expect(queries).toHaveLength(initial);
  expect(await page.evaluate(() => window.monitorHarness.actions())).toEqual([
    { type: "finish", chatId: 1 },
  ]);
  await page.evaluate(() => window.monitorHarness.complete());
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => queries.length).toBeGreaterThan(initial);
  expect(errors).toEqual([]);
});

test("transferência com falha mantém modal e troca de tenant fecha ação antiga", async ({
  page,
}) => {
  const { queries } = await setup(page);
  await expect(page.getByRole("article")).toHaveCount(20);
  const initial = queries.length;
  await page.getByRole("button", { name: /Transferir.*Contato 1$/ }).click();
  const dialog = page.getByRole("dialog", { name: "Transferir conversa" });
  await dialog.getByRole("combobox", { name: "Usuário" }).click();
  await page.getByRole("option", { name: "Ana", exact: true }).click();
  await dialog.getByRole("button", { name: "Transferir", exact: true }).click();
  await page.evaluate(() => window.monitorHarness.fail());
  await expect(dialog.getByRole("alert")).toContainText(
    "Não foi possível confirmar a transferência",
  );
  expect(queries).toHaveLength(initial);
  await page.evaluate(() => window.monitorHarness.switchTenant("tenant-b"));
  await expect(dialog).toHaveCount(0);
});

test("visualiza histórico sem leitura automática e só abre envio por ação explícita", async ({
  page,
}) => {
  const { errors } = await setup(page);
  await expect(page.getByRole("article")).toHaveCount(20);
  await page.getByRole("button", { name: /Visualizar.*Contato 1$/ }).click();
  const dialog = page.getByRole("dialog", { name: "Contato 1", exact: true });
  await expect(dialog.getByText("Mensagem do histórico")).toBeVisible();
  expect(await page.evaluate(() => window.monitorHarness.opened())).toEqual([]);
  await dialog.getByRole("button", { name: "Responder nesta conversa" }).click();
  await expect(dialog.getByRole("textbox", { name: "Mensagem" })).toBeVisible();
  expect(await page.evaluate(() => window.monitorHarness.opened())).toEqual([false]);
  expect(errors).toEqual([]);
});

test("datas incluem todo o dia escolhido no fuso do navegador", async ({ page }) => {
  const { queries } = await setup(page);
  await expect(page.getByRole("article")).toHaveCount(20);
  await page.getByText("Período da conversa", { exact: true }).click();
  await page.getByLabel("Data de início: de", { exact: true }).fill("2026-09-25");
  await page.getByLabel("Data de início: até", { exact: true }).fill("2026-09-25");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect
    .poll(() => queries.at(-1)?.filters.startedAt)
    .toEqual({ from: "2026-09-25T03:00:00.000Z", to: "2026-09-26T02:59:59.999Z" });
});

test("layout desktop/mobile sem overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { errors } = await setup(page);
  await expect(page.getByRole("article")).toHaveCount(20);
  await expect(page.getByRole("button", { name: "Atualizar", exact: true })).toBeEnabled();
  const pagination = await page
    .getByRole("navigation", { name: "Paginação da monitoria" })
    .boundingBox();
  expect(pagination!.y + pagination!.height).toBeLessThanOrEqual(1000);
  await page.screenshot({ path: "test-results/monitor-desktop.png" });
  await page.getByRole("button", { name: "Exibir lista compacta" }).click();
  await page.evaluate(() => window.monitorHarness.dark());
  await expect(
    page.getByRole("region", { name: "Indicadores da monitoria" }).getByRole("button").first(),
  ).toHaveCSS("background-color", "rgb(30, 41, 59)");
  await page.screenshot({ path: "test-results/monitor-compact-dark.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await expect(page.getByRole("button", { name: "Aplicar filtros" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.screenshot({ path: "test-results/monitor-mobile.png" });
  expect(errors).toEqual([]);
});
