import { test, expect, type Page } from "@playwright/test";
import type { ImportJob } from "../../src/lib/sdk-local/types/crm-imports.types";
const path = "/tests/crm-imports/index.html";
async function fixture(page: Page, uncertain = false, delayed = false, phoneEnabled = false) {
  const writes: { rows: number[]; tenant?: string; authorization?: string }[] = [];
  let job: ImportJob;
  await page.route("**/api/crm-imports/**", async (route) => {
    const request = route.request(),
      url = request.url();
    if (url.endsWith("/capabilities"))
      return route.fulfill({
        json: {
          data: {
            limits: {
              bytes: 1048576,
              rows: 500,
              columns: 64,
              cell: 4096,
              batch: 25,
              ttlMs: 1800000,
            },
            fields: [
              { name: "RAZAO", label: "Razão social ou nome", type: "text" },
              { name: "CPF_CNPJ", label: "CPF ou CNPJ", type: "text" },
              { name: "COD_ERP", label: "Código ERP", type: "text" },
              { name: "AREA1", label: "DDD 1", type: "integer" },
              { name: "FONE1", label: "Telefone 1", type: "text" },
            ],
            createEnabled: phoneEnabled,
            phoneWritesEnabled: phoneEnabled,
            createReason: "Integração final N01",
            retention: "Prévias expiram após 30 minutos.",
          },
        },
      });
    if (url.endsWith("/preview")) {
      const input = request.postDataJSON();
      job = {
        id: "job-a",
        mode: input.mode,
        expiresAt: Date.now() + 1800000,
        running: false,
        headers: ["CODIGO", "RAZAO"],
        rows: [
          {
            row: 2,
            state: input.mode === "create" && !phoneEnabled ? "blocked" : "ready",
            errors: input.mode === "create" && !phoneEnabled ? ["Aguardando N01"] : [],
            values: ["10", "Novo nome"],
            changes: { RAZAO: "Novo nome" },
            before: { CODIGO: 10, RAZAO: "Nome anterior" },
            customerId: 10,
          },
          {
            row: 3,
            state: "invalid",
            errors: ["Documento inválido"],
            values: ["20", "Erro"],
            changes: {},
            before: null,
            customerId: null,
          },
        ],
        counts: {
          ready: input.mode === "create" && !phoneEnabled ? 0 : 1,
          invalid: 1,
          blocked: input.mode === "create" && !phoneEnabled ? 1 : 0,
          duplicate: 0,
          failed: 0,
          unknown: 0,
          succeeded: 0,
        },
      };
      if (delayed) await new Promise((resolve) => setTimeout(resolve, 300));
      return route.fulfill({ json: { data: job } });
    }
    if (url.endsWith("/execute")) {
      writes.push({
        ...request.postDataJSON(),
        tenant: request.headers()["x-crm-instance"],
        authorization: request.headers()["authorization"],
      });
      job.rows[0].state = uncertain ? "unknown" : "succeeded";
      job.rows[0].errors = uncertain ? ["Conferir cadastro"] : [];
      job.counts.ready = 0;
      job.counts[uncertain ? "unknown" : "succeeded"] = 1;
      return route.fulfill({ json: { data: job } });
    }
    if (url.endsWith("/errors.csv"))
      return route.fulfill({
        contentType: "text/csv",
        headers: { "Content-Disposition": 'attachment; filename="crm-import-errors.csv"' },
        body: "LINHA;ESTADO;ERROS\r\n3;invalid;Documento inválido",
      });
    return route.fulfill({ json: { data: job } });
  });
  return writes;
}
async function upload(page: Page, create = false, phones = false) {
  if (!create) {
    await page.getByRole("combobox", { name: /^Operação/ }).click();
    await page.getByRole("option", { name: "Atualizar clientes existentes" }).click();
  } else await page.getByLabel("Código da origem da lista").fill("1");
  await page.getByLabel("Arquivo CSV").setInputFiles({
    name: "clientes.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      create
        ? phones
          ? "RAZAO;CPF_CNPJ;AREA1;FONE1\nCliente;52998224725;11;999991234"
          : "RAZAO;CPF_CNPJ\nCliente;52998224725"
        : "CODIGO;RAZAO\n10;Novo nome",
    ),
  });
  await expect(page.getByText("2. Relacione as colunas")).toBeVisible();
  await page.getByRole("button", { name: "Validar e gerar prévia" }).click();
}
test("requires selection and confirmation, shows before/after and exports errors", async ({
  page,
}) => {
  const writes = await fixture(page);
  await page.goto(path);
  await upload(page);
  await expect(page.getByText("Nome anterior → Novo nome")).toBeVisible();
  await expect(page.getByRole("button", { name: "Processar seleção (0)" })).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: "Selecionar linha 3", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: "Selecionar linha 2", exact: true }).check();
  await expect(page.getByRole("button", { name: "Processar seleção (1)" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /Conferi a prévia/ }).check();
  await page.getByRole("button", { name: "Processar seleção (1)" }).click();
  await expect(page.getByText("Concluída: 1", { exact: true })).toBeVisible();
  expect(writes).toEqual([{ rows: [2], tenant: "tenant-a", authorization: "Bearer token-a" }]);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar erros CSV" }).click();
  expect((await download).suggestedFilename()).toBe("crm-import-errors.csv");
});
test("Mail List exposes preview while creation awaits N01", async ({ page }) => {
  const writes = await fixture(page);
  await page.goto(path);
  await expect(page.getByText(/inclusão aguarda/)).toBeVisible();
  await upload(page, true);
  await expect(page.getByText("Aguardando N01", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Selecionar linha 2", exact: true }),
  ).toBeDisabled();
  expect(writes).toHaveLength(0);
});
test("operator cannot open import APIs", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/crm-imports/**", (route) => {
    calls++;
    return route.abort();
  });
  await page.goto(`${path}?operator`);
  await expect(page.getByText("Acesso restrito a administradores.")).toBeVisible();
  expect(calls).toBe(0);
});
test("unknown outcome cannot be selected or retried", async ({ page }) => {
  const writes = await fixture(page, true);
  await page.goto(path);
  await upload(page);
  await page.getByRole("checkbox", { name: "Selecionar linha 2", exact: true }).check();
  await page.getByRole("checkbox", { name: /Conferi a prévia/ }).check();
  await page.getByRole("button", { name: "Processar seleção (1)" }).click();
  await expect(page.getByText(/Uma gravação precisa ser conferida/)).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Selecionar linha 2", exact: true }),
  ).toBeDisabled();
  expect(writes).toHaveLength(1);
});
test("tenant switch discards old preview even when its request finishes late", async ({ page }) => {
  await fixture(page, false, true);
  await page.goto(path);
  await page.getByRole("combobox", { name: /^Operação/ }).click();
  await page.getByRole("option", { name: "Atualizar clientes existentes" }).click();
  await page.getByLabel("Arquivo CSV").setInputFiles({
    name: "clientes.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("CODIGO;RAZAO\n10;Novo nome"),
  });
  await page.getByRole("button", { name: "Validar e gerar prévia" }).click();
  await page.getByRole("button", { name: "Trocar tenant" }).click();
  await expect(page.getByText("1. Escolha a operação e o arquivo")).toBeVisible();
  await expect(page.getByRole("table", { name: "Prévia da importação" })).toHaveCount(0);
  await expect(page.getByText("Nenhum arquivo selecionado")).toBeVisible();
});
for (const variant of [
  { width: 1440, height: 1000, dark: false },
  { width: 390, height: 844, dark: true },
])
  test(`preview layout ${variant.width}px ${variant.dark ? "dark" : "light"}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(variant);
    await fixture(page);
    await page.goto(`${path}${variant.dark ? "?dark" : ""}`);
    await upload(page);
    await expect(page.getByRole("table", { name: "Prévia da importação" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath("preview.png"), fullPage: true });
  });

test("Mail List uses N01 capabilities to enable reviewed creation without a fixed frontend gate", async ({
  page,
}) => {
  const writes = await fixture(page, false, false, true);
  await page.goto(path);
  await expect(page.getByText(/inclusão aguarda/)).toHaveCount(0);
  await upload(page, true, true);
  await expect(
    page.getByRole("checkbox", { name: "Selecionar linha 2", exact: true }),
  ).toBeEnabled();
  await page.getByRole("checkbox", { name: "Selecionar linha 2", exact: true }).check();
  await page.getByRole("checkbox", { name: /Conferi a prévia/ }).check();
  await page.getByRole("button", { name: "Processar seleção (1)" }).click();
  await expect(page.getByText("Concluída: 1", { exact: true })).toBeVisible();
  expect(writes).toEqual([{ rows: [2], tenant: "tenant-a", authorization: "Bearer token-a" }]);
});
