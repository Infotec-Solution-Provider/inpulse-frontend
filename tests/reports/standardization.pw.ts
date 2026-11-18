import { expect, test, type Route } from "@playwright/test";
import { readFile } from "node:fs/promises";

const base = "/tests/reports/index.html?expanded";
const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

function json(route: Route, data: unknown) {
  return route.fulfill({ headers, json: { data } });
}

test("Mailing searches portfolios and downloads the requested filters after generation", async ({
  page,
}) => {
  const reads: URL[] = [];
  let exportPayload: unknown;
  await page.route("http://fixture-reports/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") return json(route, null);
    if (url.pathname.endsWith("/filters"))
      return json(route, {
        campaigns: [
          { campanhaNome: "Regional Sul", carteiras: [{ codigo: 11, unidade: "São Paulo" }] },
          { campanhaNome: "Regional Norte", carteiras: [{ codigo: 20, unidade: "Belém" }] },
        ],
        operadores: [{ CODIGO: 77, NOME: "Lígia Teste" }],
      });
    if (url.pathname.endsWith("/export")) {
      exportPayload = request.postDataJSON();
      return route.fulfill({ headers, body: "resultado;quantidade\nProposta;12\n" });
    }
    reads.push(url);
    return json(route, {
      campanhas: [],
      operadores: [],
      summary: { totalClientes: 50, totalContatosTotal: 12 },
      ativo: [{ nome: "Proposta", quantidade: 12 }],
      receptivo: [],
      timeline: [{ data: "2026-11-01", resultado: "Proposta", quantidade: 12 }],
    });
  });
  await page.goto(base);
  await page.getByRole("button", { name: "Mailing", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Análise de Mailing" })).toBeVisible();
  await page.getByRole("combobox", { name: "Carteiras" }).fill("sao paulo");
  await page.getByRole("option", { name: /São Paulo/ }).click();
  await page.keyboard.press("Escape");
  expect(reads).toHaveLength(0);
  await page.getByRole("button", { name: "Gerar relatório" }).click();
  await expect(page.getByRole("heading", { name: "Resultados por dia" })).toBeVisible();
  expect(reads[0].searchParams.get("carteiras")).toBe("11");
  expect(reads[0].searchParams.get("campanhaNames")).toBe("Regional Sul");
  const exportButton = page.getByRole("button", { name: "Exportar CSV" });
  const pending = page.waitForEvent("download");
  await exportButton.click();
  expect(await readFile((await (await pending).path())!, "utf8")).toContain("Proposta;12");
  expect(exportPayload).toMatchObject({
    carteiras: [11],
    campanhaNames: ["Regional Sul"],
    format: "csv",
  });
  await page.getByLabel("Data inicial").fill("2025-01-01");
  await expect(exportButton).toBeDisabled();
});

test("Régua switches to the analytical view only after generation", async ({ page }) => {
  const modes: string[] = [];
  await page.route("http://fixture-reports/**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "OPTIONS") return json(route, null);
    if (url.pathname.endsWith("/filters"))
      return json(route, { carteiras: [{ CODIGO: 40, NOME: "Carteira Sul" }], operadores: [] });
    const mode = url.searchParams.get("modoRelatorio")!;
    modes.push(mode);
    const values = {
      quantidadeBase: 20,
      discadas: 5,
      contatosTelefonia: 2,
      conversasWhatsapp: 5,
      contatosWhatsapp: 3,
      contatosTotal: 5,
      sucessos: 1,
      aproveitamento: 25,
      conversao: 20,
    };
    return json(
      route,
      mode === "ANALITICO"
        ? {
            modoRelatorio: mode,
            tipos: ["Ativo"],
            rows: [{ operador: "Lígia Teste", totais: values, tipoMetrics: { Ativo: values } }],
          }
        : {
            modoRelatorio: mode,
            rows: [
              { ...values, tipo: "Ativo", clientesTrabalhados: 9, ligacoes: 5, clientesContato: 5 },
            ],
          },
    );
  });
  await page.goto(base);
  await page.getByRole("button", { name: "Régua", exact: true }).click();
  await page.getByRole("button", { name: "Gerar relatório" }).click();
  await expect(page.getByRole("heading", { name: "Resultados por carteira" })).toBeVisible();
  await page.getByRole("combobox", { name: "Visão do relatório" }).click();
  await page.getByRole("option", { name: "Analítico por operador" }).click();
  expect(modes).toEqual(["SINTETICO"]);
  await expect(page.getByRole("button", { name: "Exportar PDF" })).toBeDisabled();
  await page.getByRole("button", { name: "Gerar relatório" }).click();
  await expect(page.getByRole("heading", { name: "Totais por operador" })).toBeVisible();
  expect(modes).toEqual(["SINTETICO", "ANALITICO"]);
  await page
    .getByRole("region", { name: "Detalhamento por tipo de carteira" })
    .getByRole("textbox", { name: "Pesquisar nos resultados" })
    .fill("ligia");
  await expect(page.getByRole("cell", { name: "Lígia Teste" })).toHaveCount(2);
});

test("Performance applies the selected sector and preserves it through an empty result", async ({
  page,
}) => {
  const requests: URL[] = [];
  await page.route("http://fixture-whatsapp/**", async (route) => {
    if (route.request().method() === "OPTIONS") return json(route, null);
    requests.push(new URL(route.request().url()));
    return json(route, {
      summary: null,
      previousSummary: null,
      operatorPerformance: [],
      dailySeries: [],
    });
  });
  await page.goto(base);
  await page.getByRole("button", { name: "Performance", exact: true }).click();
  await page.getByRole("combobox", { name: "Setores" }).fill("vendas");
  await page.getByRole("option", { name: /Pós-vendas/ }).click();
  await page.keyboard.press("Escape");
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Gerar relatório" }).click();
  await expect(page.getByText(/Nenhum desempenho encontrado/)).toBeVisible();
  expect(requests[0].searchParams.get("SETORES")).toBe("8");
  expect(requests[0].searchParams.get("OPERADORES")).toBe("*");
});

test("Custom dashboard applies the full period and consumes the unwrapped metrics results", async ({
  page,
}) => {
  const executions: unknown[] = [];
  await page.route("http://fixture-reports/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return json(route, null);
    if (request.method() === "POST") {
      executions.push(request.postDataJSON());
      return json(route, [
        {
          metricId: "calls",
          status: "completed",
          data: { columns: ["value"], rows: [{ value: 47 }] },
        },
      ]);
    }
    return json(route, {
      name: "Painel de teste",
      items: [
        {
          id: "entry",
          metricId: "calls",
          position: 0,
          metric: {
            id: "calls",
            name: "Ligações efetivas",
            column: "CODIGO",
            aggregation: "count",
            visualizationType: "card",
          },
        },
      ],
    });
  });
  await page.goto(base);
  await page.getByRole("button", { name: "Painel", exact: true }).click();
  await expect(page.getByText("Aguardando geração.")).toBeVisible();
  expect(executions).toHaveLength(0);
  await page.getByLabel("Data inicial").fill("2026-11-01");
  await page.getByLabel("Data final").fill("2026-11-05");
  await page.getByRole("button", { name: "Gerar relatório" }).click();
  await expect(page.getByText("47", { exact: true })).toBeVisible();
  expect(executions).toEqual([
    {
      filters: {
        calls: { dateRange: { start: "2026-11-01 00:00:00", end: "2026-11-05 23:59:59" } },
      },
    },
  ]);
});

test("Generated reports load metadata before execution and validate required filters", async ({
  page,
}) => {
  const executions: unknown[] = [];
  const artifact = {
    id: "fixture-report",
    title: "Análise personalizada de teste",
    status: "SAVED",
    filters: [{ id: "description", label: "Descrição da carteira", type: "text", required: true }],
    blocks: [],
    findings: [],
    sources: [],
    limitations: [],
    datasets: [],
  };
  await page.route("http://fixture-reports/**", async (route) => {
    if (route.request().method() === "OPTIONS") return json(route, null);
    if (route.request().method() === "GET") return json(route, artifact);
    executions.push(route.request().postDataJSON());
    return json(route, {
      artifact,
      filterValues: {},
      datasets: [],
      durationMs: 1,
      executedAt: new Date().toISOString(),
    });
  });
  await page.goto(base);
  await page.getByRole("button", { name: "Personalizado", exact: true }).click();
  await expect(page.getByRole("heading", { name: artifact.title })).toBeVisible();
  const pdf = page.getByRole("button", { name: "Exportar PDF" });
  await expect(pdf).toBeDisabled();
  await page.getByRole("button", { name: "Gerar relatório" }).click();
  await expect(page.getByRole("alert")).toContainText("Preencha o filtro");
  expect(executions).toHaveLength(0);
  await page.getByRole("textbox", { name: "Descrição da carteira" }).fill("Regional Sul");
  await page.getByRole("button", { name: "Gerar relatório" }).click();
  await expect(pdf).toBeEnabled();
  expect(executions).toEqual([{ filters: { description: "Regional Sul" } }]);
});
