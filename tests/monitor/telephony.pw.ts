import { expect, test, type Page } from "@playwright/test";
import { setupTelephony, telephonyItem } from "./telephony-fixtures";

const openFilters = (page: Page) => page.getByRole("button", { name: /^Filtros/ }).click();

test("telefonia aplica seleções múltiplas paginadas apenas após confirmar e aplicar", async ({
  page,
}) => {
  const { queries, optionQueries, errors } = await setupTelephony(page);
  await expect(
    page.getByRole("button", { name: "Ver cliente Cliente telefonia 1", exact: true }),
  ).toBeVisible();
  await openFilters(page);
  await page.getByRole("button", { name: "Selecionar campanhas", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "Campanha 1", exact: true }).check();
  await dialog.getByRole("button", { name: "Go to page 2", exact: true }).click();
  await dialog.getByRole("checkbox", { name: "Campanha 21", exact: true }).check();
  await expect(dialog.getByText("2 de 100 selecionados", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar seleção" }).click();
  expect(queries.at(-1)?.filters.campaignIds).toEqual([]);
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.filters.campaignIds).toEqual([1, 21]);
  expect(optionQueries.some((query) => query.kind === "campaigns" && query.page === 2)).toBe(true);

  for (const [label, name, key] of [
    ["grupos de clientes", "Grupo", "groupIds"],
    ["segmentos", "Segmento", "segmentIds"],
    ["origens", "Origem", "originIds"],
    ["produtos", "Produto", "productIds"],
  ]) {
    await openFilters(page);
    await page.getByRole("button", { name: `Selecionar ${label}`, exact: true }).click();
    await dialog.getByRole("checkbox", { name: `${name} 1`, exact: true }).check();
    await dialog.getByRole("checkbox", { name: `${name} 2`, exact: true }).check();
    await dialog.getByRole("button", { name: "Confirmar seleção" }).click();
    await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await expect
      .poll(() => queries.at(-1)?.filters[key])
      .toEqual(key === "productIds" ? ["1", "2"] : [1, 2]);
  }
  await openFilters(page);
  await page.getByRole("button", { name: "Selecionar campanhas", exact: true }).click();
  await dialog.getByRole("checkbox", { name: "Campanha 2", exact: true }).check();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  expect(queries.at(-1)?.filters.campaignIds).toEqual([1, 21]);
  expect(errors).toEqual([]);
});

test("telefonia encadeia geografia multisseleção sem confundir cidades homônimas", async ({
  page,
}) => {
  const { queries, optionQueries } = await setupTelephony(page);
  await openFilters(page);
  await expect(
    page.getByRole("button", { name: "Selecionar cidades", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Selecionar estados", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "SP", exact: true }).check();
  await dialog.getByRole("checkbox", { name: "RJ", exact: true }).check();
  await dialog.getByRole("button", { name: "Confirmar seleção" }).click();
  await page.getByRole("button", { name: "Selecionar cidades", exact: true }).click();
  await dialog.getByRole("checkbox", { name: "Centro urbano / SP", exact: true }).check();
  await dialog.getByRole("checkbox", { name: "Centro urbano / RJ", exact: true }).check();
  await dialog.getByRole("button", { name: "Confirmar seleção" }).click();
  await page.getByRole("button", { name: "Selecionar bairros", exact: true }).click();
  await dialog.getByRole("checkbox", { name: "Centro / Centro urbano / SP", exact: true }).check();
  await dialog.getByRole("button", { name: "Confirmar seleção" }).click();
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect
    .poll(() => queries.at(-1)?.filters.cities)
    .toEqual(['["SP","Centro urbano"]', '["RJ","Centro urbano"]']);
  expect(optionQueries.find((query) => query.kind === "cities")?.states).toEqual(["SP", "RJ"]);
  await openFilters(page);
  await page.getByRole("button", { name: "Selecionar estados", exact: true }).click();
  await dialog.getByRole("checkbox", { name: "SP", exact: true }).uncheck();
  await dialog.getByRole("button", { name: "Confirmar seleção" }).click();
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.filters.cities).toEqual(['["RJ","Centro urbano"]']);
  expect(queries.at(-1)?.filters.neighborhoods).toEqual([]);
});

test("telefonia envia dias completos, mês de referência e filtros de cliente", async ({ page }) => {
  const { queries } = await setupTelephony(page);
  await openFilters(page);
  await page.getByLabel("Data do agendamento: de", { exact: true }).fill("2026-09-25");
  await page.getByLabel("Data do agendamento: até", { exact: true }).fill("2026-09-25");
  await page.getByLabel("Previsão de recompra: de", { exact: true }).fill("2026-10-01");
  await page.getByLabel("Previsão de recompra: até", { exact: true }).fill("2026-10-31");
  await page.getByLabel(/Mês de referência/).fill("2026-09");
  await page.getByRole("checkbox", { name: "Nunca trabalhados", exact: true }).check();
  await page.getByRole("combobox", { name: /^Atividade no mês/ }).click();
  await page.getByRole("option", { name: "Menos de 2 ligações no mês", exact: true }).click();
  await page.getByRole("button", { name: "Selecionar operador do cliente", exact: true }).click();
  await page.getByRole("radio", { name: "Operador 2", exact: true }).check();
  await page.getByRole("button", { name: "Confirmar seleção" }).click();
  await page.getByLabel("Última compra: de", { exact: true }).fill("2026-09-01");
  await page.getByLabel("Último contato (qualquer canal): até", { exact: true }).fill("2026-09-24");
  await page.getByRole("button", { name: "Selecionar cliente", exact: true }).click();
  await page.getByRole("radio", { name: "Cliente 1", exact: true }).check();
  await page.getByRole("button", { name: "Confirmar seleção" }).click();
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.filters.customerId).toBe(1);
  expect(queries.at(-1)?.filters).toMatchObject({
    customerOperatorId: 2,
    neverWorked: true,
    monthlyActivity: "calls_lt2",
    scheduledAt: { from: "2026-09-25T03:00:00.000Z", to: "2026-09-26T02:59:59.999Z" },
    referencePeriod: { from: "2026-09-01T03:00:00.000Z", to: "2026-10-01T02:59:59.999Z" },
    repurchaseAt: { from: "2026-10-01T03:00:00.000Z", to: "2026-11-01T02:59:59.999Z" },
    lastPurchaseAt: { from: "2026-09-01T03:00:00.000Z", to: null },
    lastContactAt: { from: null, to: "2026-09-25T02:59:59.999Z" },
  });
});

test("telefonia descarta resposta lenta e fecha detalhes ao trocar instância", async ({ page }) => {
  let release: (() => void) | undefined;
  const { queries, errors } = await setupTelephony(page, {
    search: async (route, query) => {
      if (query.filters.searchText !== "lenta") return false;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route
        .fulfill({
          json: {
            data: {
              items: [telephonyItem(99, "schedules", "Resposta telefonia antiga")],
              totalCount: 1,
              page: 1,
              pageSize: 20,
              summary: { customerCount: 1, overdueCount: 0 },
            },
          },
        })
        .catch(() => {});
      return true;
    },
  });
  await page.getByLabel("Pesquisar cliente ou telefone", { exact: true }).fill("lenta");
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByLabel("Pesquisar cliente ou telefone", { exact: true }).fill("recente");
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ver cliente recente", exact: true }),
  ).toBeVisible();
  release?.();
  await expect(page.getByText("Resposta telefonia antiga", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver cliente recente", exact: true }).click();
  await expect(page.getByText("Cliente 1 · Somente leitura", { exact: true })).toBeVisible();
  await page.evaluate(() => window.monitorHarness.switchTenant("tenant-b"));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Telefonia", exact: true }).click();
  await expect(page.getByLabel("Pesquisar cliente ou telefone", { exact: true })).toHaveValue("");
  await expect.poll(() => queries.at(-1)?.filters.searchText).toBe("");
  expect(errors).toEqual([]);
});

test("telefonia conserva erro, respeita Retry-After e recupera consulta", async ({ page }) => {
  let failed = false;
  const { queries } = await setupTelephony(page, {
    search: async (route) => {
      if (failed) return false;
      failed = true;
      await route.fulfill({
        status: 429,
        headers: { "Retry-After": "2" },
        json: { message: "Limite de consultas" },
      });
      return true;
    },
  });
  await expect(page.getByRole("alert")).toBeVisible();
  const count = queries.length;
  await page.evaluate(() => window.monitorHarness.emit());
  expect(queries).toHaveLength(count);
  await expect(page.getByRole("button", { name: /Tentar novamente/i })).toBeEnabled({
    timeout: 5000,
  });
  await page.getByRole("button", { name: /Tentar novamente/i }).click();
  await expect(
    page.getByRole("button", { name: "Ver cliente Cliente telefonia 1", exact: true }),
  ).toBeVisible();
});

test("telefonia tem layout desktop e móvel sem overflow de página", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { errors } = await setupTelephony(page);
  await expect(
    page.getByRole("button", { name: "Ver cliente Cliente telefonia 1", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/monitor-telephony-desktop.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1440, height: 800 });
  const pagination = await page
    .getByRole("navigation", { name: "Paginação da telefonia" })
    .boundingBox();
  expect(pagination!.y + pagination!.height).toBeLessThanOrEqual(800);
  const resultArea = await page
    .getByLabel("Resultados da telefonia", { exact: true })
    .boundingBox();
  expect(resultArea!.height).toBeGreaterThan(400);
  await openFilters(page);
  const filterDialog = await page.getByRole("dialog").boundingBox();
  expect(filterDialog!.y + filterDialog!.height).toBeLessThanOrEqual(800);
  await expect(page.getByRole("button", { name: "Aplicar filtros", exact: true })).toBeInViewport();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => window.monitorHarness.dark());
  await expect(page.getByRole("table").locator("..")).toHaveCSS(
    "background-color",
    "rgb(30, 41, 59)",
  );
  await expect(
    page.locator("label").filter({ hasText: "Pesquisar cliente ou telefone" }),
  ).toHaveCSS("color", "rgba(255, 255, 255, 0.7)");
  await page.screenshot({ path: "test-results/monitor-telephony-dark.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Ver cliente Cliente telefonia 1", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await openFilters(page);
  await page.getByRole("button", { name: "Selecionar campanhas", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Campanha 1", exact: true })).toBeVisible();
  await expect(page.locator(".MuiDialog-container").last()).toHaveCSS("opacity", "1");
  await page.screenshot({ path: "test-results/monitor-telephony-mobile.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

test("telefonia separa modos e preserva rascunhos em memória sem gravar texto privado", async ({
  page,
}) => {
  const { queries } = await setupTelephony(page);
  await page.getByRole("button", { name: "Próxima página da telefonia" }).click();
  await expect.poll(() => queries.at(-1)?.page).toBe(2);
  await page.getByLabel("Pesquisar cliente ou telefone", { exact: true }).fill("rascunho privado");
  await page.getByRole("button", { name: "Ligações", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.filters.mode).toBe("calls");
  await expect(page.getByLabel("Pesquisar cliente ou telefone", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Sem agendamento", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.filters.mode).toBe("unscheduled");
  await openFilters(page);
  await expect(page.getByLabel("Data do agendamento: de", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Data da ligação: de", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Agendamentos", exact: true }).click();
  await expect(page.getByLabel("Pesquisar cliente ou telefone", { exact: true })).toHaveValue(
    "rascunho privado",
  );
  await expect.poll(() => queries.at(-1)?.page).toBe(2);
  expect(queries.at(-1)?.filters.searchText).toBe("");
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.filters.searchText).toBe("rascunho privado");
  expect(queries.at(-1)?.page).toBe(1);
  const stored = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("monitor_telephony:"))
      .map((key) => localStorage.getItem(key))
      .join("\n"),
  );
  expect(stored).not.toContain("rascunho privado");
  await page.reload();
  await expect(page.getByRole("tab", { name: "Telefonia", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("Pesquisar cliente ou telefone", { exact: true })).toHaveValue("");
});

test("telefonia pausa eventos, atualiza manualmente e limpa listeners da aba inativa", async ({
  page,
}) => {
  const { queries, conversationQueries } = await setupTelephony(page);
  await expect(
    page.getByRole("button", { name: "Ver cliente Cliente telefonia 1", exact: true }),
  ).toBeVisible();
  await page.clock.install();
  const listenerCount = await page.evaluate(() => window.monitorHarness.listeners());
  const initialConversations = conversationQueries();
  await page.getByRole("button", { name: "Pausar atualização automática da telefonia" }).click();
  const pausedCount = queries.length;
  await page.evaluate(() => window.monitorHarness.emit());
  await page.clock.runFor(61_000);
  expect(queries).toHaveLength(pausedCount);
  expect(conversationQueries()).toBe(initialConversations);
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await page.clock.runFor(50);
  await expect.poll(() => queries.length).toBe(pausedCount + 1);
  await page.evaluate(() => window.monitorHarness.refreshToken());
  await page.clock.runFor(50);
  await expect.poll(() => queries.length).toBe(pausedCount + 2);
  expect(await page.evaluate(() => window.monitorHarness.listeners())).toBe(listenerCount);
  await page.getByRole("tab", { name: "Conversas", exact: true }).click();
  const inactiveCount = queries.length;
  await page.evaluate(() => window.monitorHarness.emit());
  await page.clock.runFor(61_000);
  expect(queries).toHaveLength(inactiveCount);
  await page.evaluate(() => window.monitorHarness.setRole("USER"));
  await expect(page.getByRole("alert")).toContainText("apenas para administradores");
  expect(await page.evaluate(() => window.monitorHarness.listeners())).toBe(0);
});

test("remover filtro aplicado não submete rascunho de outro campo", async ({ page }) => {
  const { queries } = await setupTelephony(page);
  await openFilters(page);
  await page.getByRole("button", { name: "Selecionar campanhas", exact: true }).click();
  await page.getByRole("checkbox", { name: "Campanha 1", exact: true }).check();
  await page.getByRole("button", { name: "Confirmar seleção" }).click();
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.filters.campaignIds).toEqual([1]);
  await page.getByLabel("Pesquisar cliente ou telefone", { exact: true }).fill("não aplicar ainda");
  await page.getByRole("button", { name: /Filtro aplicado Campanhas: 1/ }).press("Delete");
  await expect.poll(() => queries.at(-1)?.filters.campaignIds).toEqual([]);
  expect(queries.at(-1)?.filters.searchText).toBe("");
  await expect(page.getByLabel("Pesquisar cliente ou telefone", { exact: true })).toHaveValue(
    "não aplicar ainda",
  );
});

test("opções avançadas recuperam erro e preservam seleção durante nova pesquisa", async ({
  page,
}) => {
  let failed = false;
  const { queries } = await setupTelephony(page, {
    options: async (route) => {
      if (failed) return false;
      failed = true;
      await route.fulfill({ status: 503, json: { message: "Catálogo indisponível" } });
      return true;
    },
  });
  await openFilters(page);
  await page.getByRole("button", { name: "Selecionar produtos", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("Não foi possível carregar");
  await dialog.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await dialog.getByRole("checkbox", { name: "Produto 1", exact: true }).check();
  await dialog.getByLabel("Pesquisar produtos", { exact: true }).fill("nenhum produto");
  await dialog.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    dialog.getByText("Nenhuma opção encontrada para esta pesquisa.", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("1 de 100 selecionado", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar seleção", exact: true }).click();
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.filters.productIds).toEqual(["1"]);
});

test("telefonia oculta suspende consultas e preserva pedido manual para o retorno", async ({
  page,
}) => {
  const { queries } = await setupTelephony(page);
  await expect(
    page.getByRole("button", { name: "Ver cliente Cliente telefonia 1", exact: true }),
  ).toBeVisible();
  await page.clock.install();
  await page.getByRole("button", { name: "Pausar atualização automática da telefonia" }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    window.monitorHarness.emit();
  });
  const count = queries.length;
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await page.clock.runFor(61_000);
  expect(queries).toHaveLength(count);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(50);
  await expect.poll(() => queries.length).toBe(count + 1);
});

test("ligação sem início conhecido mostra finalização sem inventar duração", async ({ page }) => {
  await setupTelephony(page, {
    search: async (route, query) => {
      if (query.filters.mode !== "calls") return false;
      const item = telephonyItem(77, "calls");
      await route.fulfill({
        json: {
          data: {
            items: [{ ...item, call: { ...item.call, startedAt: null, durationSeconds: null } }],
            totalCount: 1,
            page: 1,
            pageSize: 20,
            summary: { customerCount: 1, overdueCount: null },
          },
        },
      });
      return true;
    },
  });
  await page.getByRole("button", { name: "Ligações", exact: true }).click();
  const table = page.getByRole("table");
  await expect(
    table.getByText("Data de finalização; início não informado.", { exact: true }),
  ).toBeVisible();
  await expect(table.getByText(/Duração não informada/)).toBeVisible();
  await expect(table.getByText("0 min 0 s", { exact: true })).toHaveCount(0);
});

test("telefonia alterna entre cartões e lista compacta e lembra a escolha", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupTelephony(page);
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Exibir cartões", exact: true }).click();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(
    page.getByRole("list", { name: "Agendamentos", exact: true }).getByRole("listitem"),
  ).toHaveCount(20);
  await page.getByRole("button", { name: "Ligações", exact: true }).click();
  await expect(page.getByRole("list", { name: "Ligações", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Exibir cartões", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("button", { name: "Exibir lista compacta", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
});
