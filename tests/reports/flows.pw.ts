import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function fixture(page: Page) {
  const state = {
    messages: [] as URL[],
    sales: [] as URL[],
    options: [] as URL[],
    failMessages: false,
    failOptions: false,
    delay: 0,
  };
  const people = Array.from({ length: 52 }, (_, index) => ({
    CODIGO: index + 1,
    NOME: index === 50 ? "João sem vendas" : `Pessoa ${index + 1}`,
  }));
  await page.route(/^http:\/\/fixture-(whatsapp|marketing|users)\//, async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const respond = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "GET,OPTIONS",
        },
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (request.method() === "OPTIONS") return respond({});
    expect(request.headers().authorization).toMatch(/^(Bearer )?tenant-[ab]$/);
    if (url.hostname === "fixture-users") {
      state.options.push(url);
      if (state.failOptions) return respond({ message: "Opções indisponíveis" }, 503);
      const query = url.searchParams.get("NOME")?.toLowerCase() ?? "";
      const code = url.searchParams.get("CODIGO");
      const filtered = people.filter((person) =>
        code ? String(person.CODIGO) === code : person.NOME.toLowerCase().includes(query),
      );
      const start = (Number(url.searchParams.get("page")) - 1) * 50;
      return respond({
        data: filtered.slice(start, start + 50),
        page: { current: Number(url.searchParams.get("page")), totalRows: filtered.length },
      });
    }
    if (url.pathname.endsWith("messages-per-user")) {
      state.messages.push(url);
      if (state.delay) await new Promise((resolve) => setTimeout(resolve, state.delay));
      if (state.failMessages)
        return respond({ message: "Fonte temporariamente indisponível" }, 503);
      return respond({
        data: {
          messagesPerUser: Array.from({ length: 40 }, (_, index) => ({
            userId: index + 1,
            userName: `Operador ${index + 1}`,
            messagesCount: 30 + index,
            sentMessagesCount: 20 + index,
            receivedMessagesCount: 10,
          })),
        },
      });
    }
    if (url.pathname.endsWith("/dashboard")) {
      state.sales.push(url);
      const empty = url.searchParams.get("operadorId") === "51";
      return respond({
        data: {
          summary: {
            totalCompras: empty ? 0 : 4,
            totalFaturamento: empty ? 0 : 1000,
            ticketMedio: empty ? 0 : 250,
          },
          byOperator: empty
            ? []
            : [
                {
                  operadorId: 1,
                  operadorNome: "Pessoa 1",
                  totalCompras: 4,
                  totalFaturamento: 1000,
                  ticketMedio: 250,
                  propostasConvertidas: 1,
                },
              ],
          byPeriod: empty ? [] : [{ periodo: "2026-11", totalCompras: 4, totalFaturamento: 1000 }],
          byTipo: [],
          byFormaPgto: [],
          byPeriodByOperator: [],
          propostas: { comprasDePropostas: 1, faturamentoDePropostas: 250, taxaConversao: 25 },
          meta: { general: [], operators: [] },
          comparison: { totalCompras: 2, totalFaturamento: 500, ticketMedio: 250 },
        },
      });
    }
    return respond({ data: [] });
  });
  await page.goto("/tests/reports/index.html");
  await expect(page.getByRole("heading", { name: "Relatórios", exact: true })).toBeVisible();
  return state;
}

test("central searches by aliases and category without querying business data", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByLabel("Buscar relatório").fill("dashboard financeiro");
  await expect(page.getByRole("link", { name: /Vendas Faturamento/ })).toHaveAttribute(
    "href",
    "/tenant-a/reports/sales",
  );
  await expect(page.getByRole("status")).toContainText("1 relatório encontrado");
  await page.getByLabel("Buscar relatório").fill("origem");
  await expect(page.getByRole("link", { name: /Origem x Qualidade/ })).toBeVisible();
  await page.getByRole("button", { name: "Atendimento e WhatsApp", exact: true }).click();
  await expect(page.getByText("Nenhum relatório encontrado.", { exact: false })).toBeVisible();
  expect(state.messages).toHaveLength(0);
  expect(state.sales).toHaveLength(0);
  expect(state.options).toHaveLength(0);
});

test("messages require generation; search covers all pages and CSV uses the applied complete result", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "Mensagens", exact: true }).click();
  await expect(page.getByText(/Defina os filtros/)).toBeVisible();
  await page.getByLabel("Data inicial").fill("2026-11-01");
  await page.getByLabel("Data final").fill("2026-11-17");
  expect(state.messages).toHaveLength(0);
  await page.getByRole("button", { name: "Gerar relatório", exact: true }).click();
  await expect(page.getByLabel("Pesquisar nos resultados")).toBeVisible();
  expect(state.messages).toHaveLength(1);
  expect(state.messages[0].searchParams.get("date")).toBe("2026-11-01_2026-11-17");
  await page.getByLabel("Pesquisar nos resultados").fill("Operador 40");
  await expect(page.getByRole("cell", { name: "Operador 40 #40" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  const file = await download;
  const csv = await readFile((await file.path())!, "utf8");
  expect(csv.split("\r\n")).toHaveLength(41);
  expect(csv).toContain("Operador 1");
  expect(csv).toContain("Operador 40");
  await page.getByRole("button", { name: "Ontem", exact: true }).click();
  await expect(page.getByRole("button", { name: "Exportar CSV", exact: true })).toBeDisabled();
  expect(state.messages).toHaveLength(1);
  await page.getByRole("button", { name: "Descartar alterações" }).click();
  await expect(page.getByRole("button", { name: "Exportar CSV", exact: true })).toBeEnabled();
  state.failMessages = true;
  await page.getByRole("button", { name: "Gerar relatório", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("O resultado anterior foi mantido");
  await expect(page.getByRole("cell", { name: "Operador 40 #40" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar CSV", exact: true })).toBeDisabled();
});

test("invalid periods never call the API, in-flight filters are captured and tenant changes discard results", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "Mensagens", exact: true }).click();
  await page.getByLabel("Data inicial").fill("2026-11-20");
  await page.getByLabel("Data final").fill("2026-11-01");
  await page.getByRole("button", { name: "Gerar relatório", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("data inicial");
  expect(state.messages).toHaveLength(0);
  await page.getByLabel("Data inicial").fill("2026-11-01");
  await page.getByLabel("Data final").fill("2026-11-17");
  state.delay = 650;
  await page.getByRole("button", { name: "Gerar relatório", exact: true }).click();
  await expect(page.getByRole("button", { name: "Gerando relatório…" })).toBeDisabled();
  await page.getByLabel("Data inicial").fill("2026-11-02");
  await expect(page.getByLabel("Filtros aplicados")).toContainText("01/11/2026 a 17/11/2026");
  await expect(page.getByRole("button", { name: "Exportar CSV", exact: true })).toBeDisabled();
  expect(state.messages).toHaveLength(1);
  await page.getByRole("button", { name: "Gerar relatório", exact: true }).click();
  await page.getByRole("button", { name: "Trocar tenant" }).click();
  await expect(page.getByText(/Defina os filtros/)).toBeVisible();
  await expect(page.getByLabel("Pesquisar nos resultados")).toHaveCount(0);
});

test("sales search operators before generation, paginate options and preserve the selected ID", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "Vendas", exact: true }).click();
  await expect(page.getByText(/Defina os filtros/)).toBeVisible();
  expect(state.sales).toHaveLength(0);
  await page.getByRole("combobox", { name: "Operador", exact: true }).click();
  await page.getByRole("option", { name: "Carregar mais operadores", exact: true }).click();
  await page.getByRole("option", { name: "João sem vendas · #51", exact: true }).click();
  expect(state.options.some((url) => url.searchParams.get("page") === "2")).toBe(true);
  expect(state.sales).toHaveLength(0);
  await page.getByLabel("Data inicial").fill("2026-11-01");
  await page.getByLabel("Data final").fill("2026-11-17");
  await page.getByRole("button", { name: "Gerar relatório", exact: true }).click();
  await expect(page.getByText("Nenhuma venda encontrada para os filtros aplicados.")).toBeVisible();
  expect(state.sales).toHaveLength(1);
  expect(state.sales[0].searchParams.get("operadorId")).toBe("51");
  expect(state.sales[0].searchParams.get("compareStartDate")).toBe("2026-10-15");
  expect(state.sales[0].searchParams.get("compareEndDate")).toBe("2026-10-31");
  await expect(page.getByRole("combobox", { name: "Operador", exact: true })).toHaveValue(
    "João sem vendas · #51",
  );
  await page.getByRole("button", { name: "Ontem", exact: true }).click();
  expect(state.sales).toHaveLength(1);
  await expect(page.getByLabel("Filtros aplicados")).toContainText("João sem vendas #51");
});

test("operator search uses the supported name/code filters and exposes failures with retry", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "Vendas", exact: true }).click();
  const input = page.getByRole("combobox", { name: "Operador", exact: true });
  await input.fill("João");
  await page.getByRole("option", { name: "João sem vendas · #51", exact: true }).click();
  expect(state.options.at(-1)!.searchParams.get("NOME")).toBe("João");
  await input.fill("51");
  await expect.poll(() => state.options.at(-1)?.searchParams.get("CODIGO")).toBe("51");
  state.failOptions = true;
  await input.fill("inexistente");
  await expect(page.getByRole("option", { name: "Tentar carregar opções" })).toBeVisible();
  state.failOptions = false;
  await page.getByRole("option", { name: "Tentar carregar opções" }).click();
  await expect(page.getByRole("option", { name: "Tentar carregar opções" })).toHaveCount(0);
  expect(state.sales).toHaveLength(0);
});

test("sales result search preserves the execution, and draft dates disable exporting", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "Vendas", exact: true }).click();
  await page.getByRole("button", { name: "Gerar relatório", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Exportar CSV de vendas por operador" }),
  ).toBeEnabled();
  await page.getByLabel("Pesquisar operadores no resultado").fill("inexistente");
  await expect(page.getByText("0 de 1 operadores no resultado.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Ontem", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Exportar CSV de vendas por operador" }),
  ).toBeDisabled();
  expect(state.sales).toHaveLength(1);
  await page.getByRole("button", { name: "Descartar alterações" }).click();
  await expect(
    page.getByRole("button", { name: "Exportar CSV de vendas por operador" }),
  ).toBeEnabled();
});

test("catalog and pilots fit mobile and dark mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.screenshot({ path: "test-results-reports/catalog-mobile.png", fullPage: true, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Mensagens", exact: true }).click();
  await page.getByRole("button", { name: "Gerar relatório", exact: true }).click();
  await expect(page.getByLabel("Pesquisar nos resultados")).toBeVisible();
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await page.screenshot({ path: "test-results-reports/messages-mobile-dark.png", fullPage: true, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Vendas", exact: true }).click();
  await page.getByRole("button", { name: "Gerar relatório", exact: true }).click();
  await expect(page.getByLabel("Pesquisar operadores no resultado")).toBeVisible();
  await page.screenshot({ path: "test-results-reports/sales-mobile-dark.png", fullPage: true, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: `test-results-reports/sales-${width}-dark.png`, fullPage: true, animations: "disabled" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "Central", exact: true }).click();
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await page.screenshot({ path: "test-results-reports/catalog-desktop.png", fullPage: true, animations: "disabled" });
});
