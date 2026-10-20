import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const contacts = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Contato ${String(i + 1).padStart(2, "0")}`,
  phone: i === 0 ? null : `551199999${String(i).padStart(4, "0")}`,
  isBlocked: i === 1,
  customerId: i % 3 ? 100 + i : null,
  conversationExpiration: "2026-10-20T12:00:00Z",
  customer:
    i % 3
      ? {
          COD_CAMPANHA: 1,
          CAMPANHA_NOME: "Campanha fictícia",
          CODIGO: 100 + i,
          RAZAO: `Cliente ${i}`,
          CIDADE: i % 2 ? "Canoas" : "Porto Alegre",
        }
      : null,
  sectorIds: [i % 2 ? 1 : 2],
}));
function filtered(body: any) {
  const c = body.contactFilters ?? {},
    f = body.customerFilters ?? {};
  return contacts.filter(
    (row) =>
      (!c.id || row.id === c.id) &&
      (!c.ids?.length || c.ids.includes(row.id)) &&
      (!c.name || row.name.toLowerCase().includes(c.name.toLowerCase())) &&
      (!c.phone || row.phone?.includes(c.phone)) &&
      (c.hasCustomer === undefined || Boolean(row.customerId) === c.hasCustomer) &&
      (!c.sectorIds?.length || row.sectorIds.some((id) => c.sectorIds.includes(id))) &&
      (!Object.keys(f).length || Boolean(row.customerId)) &&
      (!f.RAZAO || row.customer?.RAZAO.includes(f.RAZAO)) &&
      (!f.CIDADE || row.customer?.CIDADE === f.CIDADE),
  );
}
async function fixture(page: Page) {
  const requests: Array<{ path: string; method: string; body: any }> = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      body = request.postDataJSON();
    requests.push({ path, method: request.method(), body });
    if (path === "/api/whatsapp/contacts/customer/search") {
      const rows = filtered(body),
        { page: current, perPage } = body.pagination;
      const eligible = rows.filter((row) => !row.isBlocked && row.phone).length,
        blocked = rows.filter((row) => row.isBlocked).length;
      return route.fulfill({
        json: {
          data: rows.slice((current - 1) * perPage, current * perPage),
          pagination: {
            page: current,
            perPage,
            total: rows.length,
            totalPages: Math.ceil(rows.length / perPage),
            hasNext: current * perPage < rows.length,
            hasPrev: current > 1,
          },
          summary: {
            total: rows.length,
            eligible,
            blocked,
            skipped: rows.length - eligible - blocked,
          },
        },
      });
    }
    if (path === "/api/marketing/campaigns/with-audience") {
      const definition = body.audienceDefinition,
        mode = definition.filtersJson.selectionMode;
      const selected = (
        mode === "MANUAL"
          ? contacts.filter((row) => definition.manualIncludeJson.contactIds.includes(row.id))
          : filtered(definition.filtersJson)
      ).filter((row) => !definition.manualExcludeJson.contactIds.includes(row.id));
      const eligible = selected.filter((row) => !row.isBlocked && row.phone).length,
        blocked = selected.filter((row) => row.isBlocked).length;
      return route.fulfill({
        status: 201,
        json: {
          data: { id: 10, name: body.name },
          summary: {
            selected: selected.length,
            eligible,
            blocked,
            skipped: selected.length - eligible - blocked,
            skippedReasons: {
              CONTACT_NOT_FOUND: 0,
              MISSING_PHONE: selected.length - eligible - blocked,
            },
          },
        },
      });
    }
    if (path === "/api/marketing/campaigns")
      return route.fulfill({ json: { data: [], page: { totalRows: 0, current: 1 } } });
    if (/\/search-options\//.test(path))
      return route.fulfill({
        json: {
          data: [{ id: path.endsWith("/states") ? "RS" : "1", label: "Opção fictícia" }],
          page: { current: 1, hasNext: false },
        },
      });
    if (/\/api\/customers\/(campaigns|segments|operators)$/.test(path))
      return route.fulfill({ json: { data: [{ CODIGO: 1, NOME: "Opção fictícia" }] } });
    return route.fulfill({ status: 500, json: { message: "Unexpected API request", path } });
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:4206)/, (route) => route.abort());
  return requests;
}
async function open(page: Page) {
  await page.goto("/tests/mass-audience/index.html");
  await page.getByRole("button", { name: "Novo disparo", exact: true }).click();
  await expect(page.getByTestId("audience-summary")).toHaveText(/25 resultados/);
  await expect(page.locator('input[type="file"]')).toHaveCSS("display", "none");
  await expect(page.locator('div[class*="lg:grid-cols-"]')).toHaveCSS("display", "grid");
}
async function configure(page: Page) {
  await page
    .getByRole("textbox", { name: "Titulo do disparo", exact: true })
    .fill("Campanha fictícia");
  await page.getByRole("combobox", { name: "WhatsApp", exact: true }).click();
  await page.getByRole("option", { name: /^Canal fictício/ }).click();
}

test("manual page selections persist across pages and searches and create only explicit IDs", async ({
  page,
}) => {
  const requests = await fixture(page);
  await open(page);
  await configure(page);
  const create = page.getByRole("button", { name: "Criar disparo", exact: true });
  await expect(create).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "Selecionar página de contatos elegíveis", exact: true })
    .check();
  await expect(page.getByText("6 selecionados", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Go to next page", exact: true }).last().click();
  await page.getByRole("checkbox", { name: "Selecionar Contato 09", exact: true }).check();
  await page.getByRole("textbox", { name: "Buscar contato por nome", exact: true }).fill("25");
  await page.getByRole("button", { name: "Buscar", exact: true }).last().click();
  await expect(page.getByTestId("audience-summary")).toHaveText(/1 resultados/);
  await expect(page.getByText("7 selecionados", { exact: true })).toBeVisible();
  await create.click();
  await expect.poll(() => requests.filter((r) => r.path.endsWith("/with-audience")).length).toBe(1);
  const audience = requests.find((r) => r.path.endsWith("/with-audience"))!.body.audienceDefinition;
  expect(audience.filtersJson.selectionMode).toBe("MANUAL");
  expect(audience.manualIncludeJson.contactIds).toEqual([3, 4, 5, 6, 7, 8, 9]);
  expect(requests.some((r) => /profile|summary|prepare|launch/.test(r.path))).toBe(false);
});

test("all filtered stores exceptions and counts selected separately from eligible", async ({
  page,
}) => {
  const requests = await fixture(page);
  await open(page);
  await configure(page);
  await page
    .getByRole("button", { name: "Selecionar todos os 25 resultados", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "Selecionar Contato 03", exact: true }).uncheck();
  await expect(page.getByText("24 selecionados", { exact: true })).toBeVisible();
  await expect(page.getByText("22 elegíveis selecionados", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Criar disparo", exact: true }).click();
  await expect(
    page.getByText(/Público fixado: 24 selecionados, 22 elegíveis, 1 bloqueados e 1 ignorados/),
  ).toBeVisible();
  const audience = requests.find((r) => r.path.endsWith("/with-audience"))!.body.audienceDefinition;
  expect(audience.filtersJson).toEqual({
    version: 2,
    selectionMode: "ALL_FILTERED",
    contactFilters: {},
    customerFilters: {},
  });
  expect(audience.manualIncludeJson.contactIds).toEqual([]);
  expect(audience.manualExcludeJson.contactIds).toEqual([3]);
});

test("filter drafts cancel, apply atomically, clear all-mode, and combine no-client with client criteria", async ({
  page,
}) => {
  const requests = await fixture(page);
  await open(page);
  const searches = () => requests.filter((r) => r.path.endsWith("/customer/search"));
  await page
    .getByRole("button", { name: "Selecionar todos os 25 resultados", exact: true })
    .click();
  await page.getByRole("button", { name: "Filtros do público", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros do público", exact: true });
  await dialog.getByLabel("Cidade", { exact: true }).fill("Canoas");
  expect(searches()).toHaveLength(1);
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByText("25 selecionados", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Filtros do público", exact: true }).click();
  await expect(dialog.getByLabel("Cidade", { exact: true })).toHaveValue("");
  await dialog.getByLabel("Cidade", { exact: true }).fill("Canoas");
  await dialog.getByRole("combobox", { name: "Vínculo com cliente", exact: true }).click();
  await page.getByRole("option", { name: "Sem cliente", exact: true }).click();
  await expect(dialog.getByText(/não retorna contatos/)).toBeVisible();
  await dialog.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(page.getByText("0 selecionados", { exact: true })).toBeVisible();
  await expect(page.getByTestId("audience-summary")).toHaveText(/0 resultados/);
  expect(searches().at(-1)!.body).toMatchObject({
    contactFilters: { hasCustomer: false },
    customerFilters: { CIDADE: "Canoas" },
    pagination: { page: 1 },
  });
  await expect(page.getByRole("button", { name: "Criar disparo", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Limpar filtros do público", exact: true }).click();
  await expect(page.getByTestId("audience-summary")).toHaveText(/25 resultados/);
});

test("loading, read error, and zero eligible results block writes", async ({ page }) => {
  await fixture(page);
  await open(page);
  await page.getByRole("checkbox", { name: "Selecionar Contato 03", exact: true }).check();
  let finish: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/whatsapp/contacts/customer/search", async (route) => {
    await pending;
    await route.fulfill({ status: 503, json: { message: "Fixture unavailable" } });
  });
  await page.getByRole("button", { name: "Atualizar público", exact: true }).click();
  await expect(page.getByLabel("Carregando público", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar disparo", exact: true })).toBeDisabled();
  finish!();
  await expect(page.getByText(/Não foi possível consultar o público/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar disparo", exact: true })).toBeDisabled();
});

test("an invalid HTTP 201 creation envelope preserves draft and prevents a duplicate write", async ({
  page,
}) => {
  const requests = await fixture(page);
  await open(page);
  await configure(page);
  let writes = 0;
  await page.route("**/api/marketing/campaigns/with-audience", (route) => {
    writes++;
    return route.fulfill({ status: 201, json: { data: { id: 10 } } });
  });
  await page.getByRole("checkbox", { name: "Selecionar Contato 03", exact: true }).check();
  await page.getByRole("button", { name: "Criar disparo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Criar disparo", exact: true })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Titulo do disparo", exact: true })).toHaveValue(
    "Campanha fictícia",
  );
  await expect(page.getByText(/O rascunho foi preservado/)).toBeVisible();
  expect(writes).toBe(1);
  expect(requests.some((r) => r.path === "/api/marketing/campaigns" && r.method === "POST")).toBe(
    false,
  );
});

test("mobile light and dark keep controls visible and tenant changes discard selections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await fixture(page);
  await open(page);
  await page.getByRole("checkbox", { name: "Selecionar Contato 03", exact: true }).check();
  await expect(page.getByText("1 selecionados", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Filtros do público", exact: true }).click();
  const filters = page.getByRole("dialog", { name: "Filtros do público", exact: true });
  await expect(filters.getByRole("button", { name: "Aplicar filtros", exact: true })).toBeVisible();
  await expect(filters.getByLabel("Telefone cadastrado no cliente", { exact: true })).toBeVisible();
  await filters.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Trocar tema", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Trocar tenant", exact: true }).click();
  await page.getByRole("button", { name: "Novo disparo", exact: true }).click();
  await expect(page.getByText("0 selecionados", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar disparo", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar disparo", exact: true })).toBeDisabled();
});

test("refresh revalidates matching and eligibility of exclusions outside the visible page", async ({
  page,
}) => {
  const requests = await fixture(page);
  await open(page);
  await page
    .getByRole("button", { name: "Selecionar todos os 25 resultados", exact: true })
    .click();
  await page.getByRole("button", { name: "Go to next page", exact: true }).last().click();
  await page.getByRole("checkbox", { name: "Selecionar Contato 09", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Selecionar Contato 10", exact: true }).uncheck();
  await page.getByRole("button", { name: "Go to previous page", exact: true }).last().click();
  await expect(
    page.getByRole("checkbox", { name: "Selecionar Contato 03", exact: true }),
  ).toBeVisible();
  const checks: number[][] = [];
  await page.route("**/api/whatsapp/contacts/customer/search", async (route) => {
    const body = route.request().postDataJSON(),
      { page: current, perPage } = body.pagination;
    const rows = contacts
      .filter((row) => row.id !== 9)
      .map((row) => (row.id === 10 ? { ...row, isBlocked: true } : row))
      .filter((row) => !body.contactFilters.ids || body.contactFilters.ids.includes(row.id));
    if (body.contactFilters.ids) checks.push(body.contactFilters.ids);
    const eligible = rows.filter((row) => !row.isBlocked && row.phone).length,
      blocked = rows.filter((row) => row.isBlocked).length;
    await route.fulfill({
      json: {
        data: rows.slice((current - 1) * perPage, current * perPage),
        pagination: {
          page: current,
          perPage,
          total: rows.length,
          totalPages: Math.ceil(rows.length / perPage),
          hasNext: current * perPage < rows.length,
          hasPrev: current > 1,
        },
        summary: {
          total: rows.length,
          eligible,
          blocked,
          skipped: rows.length - eligible - blocked,
        },
      },
    });
  });
  await page.getByRole("button", { name: "Atualizar público", exact: true }).click();
  await expect(page.getByTestId("audience-summary")).toHaveText(
    /24 resultados · 21 elegíveis · 2 bloqueados/,
  );
  await expect(page.getByText("23 selecionados", { exact: true })).toBeVisible();
  await expect(page.getByText("21 elegíveis selecionados", { exact: true })).toBeVisible();
  expect(checks).toEqual([[9, 10]]);
  await configure(page);
  await page.getByRole("button", { name: "Criar disparo", exact: true }).click();
  await expect
    .poll(() => requests.some((request) => request.path.endsWith("/with-audience")))
    .toBe(true);
  expect(
    requests.find((request) => request.path.endsWith("/with-audience"))!.body.audienceDefinition
      .manualExcludeJson.contactIds,
  ).toEqual([9, 10]);
});

test("zero eligible selection remains blocked and full filter controls serialize through the dedicated route", async ({
  page,
}) => {
  const requests = await fixture(page);
  await open(page);
  await page.getByRole("button", { name: "Filtros do público", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros do público", exact: true });
  for (const label of [
    "Nome do cliente",
    "Código do cliente",
    "CPF/CNPJ",
    "Código ERP",
    "Cidade",
    "Telefone cadastrado no cliente",
    "E-mail contém",
    "Cadastro de",
    "Cadastro até",
    "Compra de",
    "Compra até",
  ])
    await expect(dialog.getByLabel(label, { exact: true })).toBeVisible();
  for (const label of [
    "Campanhas",
    "Segmentos",
    "Usuários fidelizados",
    "Grupos de clientes",
    "Origens",
    "Mídias CRM",
    "Marcas",
    "Unidades",
    "Cargos dos contatos",
    "Estados",
  ])
    await expect(dialog.getByRole("combobox", { name: label, exact: true })).toBeVisible();
  await dialog.getByLabel("Código do contato", { exact: true }).fill("2");
  await dialog.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(page.getByTestId("audience-summary")).toHaveText(
    /1 resultados · 0 elegíveis · 1 bloqueados/,
  );
  await expect(page.getByRole("button", { name: "Criar disparo", exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Selecionar todos os 1 resultados", exact: true }),
  ).toBeDisabled();
  expect(
    requests.filter((request) => request.path.endsWith("/customer/search")).at(-1)!.body
      .contactFilters,
  ).toEqual({ id: 2 });
});

test("capture desktop mobile and landscape with fictitious data in both themes", async ({
  page,
}) => {
  const folder = process.env.MASS_AUDIENCE_ARTIFACTS ?? test.info().outputPath("screenshots");
  await mkdir(folder, { recursive: true });
  await fixture(page);
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
    { name: "landscape", width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: "light" });
    await open(page);
    await page
      .getByRole("button", { name: "Selecionar todos os 25 resultados", exact: true })
      .click();
    if (viewport.name === "desktop") {
      await expect(page.locator('div[class*="lg:grid-cols-"]')).toHaveCSS(
        "grid-template-columns",
        /^320px /,
      );
      await page
        .getByRole("dialog")
        .locator(".MuiDialogContent-root")
        .evaluate((element) => {
          element.scrollTop = 0;
        });
    } else
      await page
        .getByRole("region", { name: "Público do disparo", exact: true })
        .evaluate((element) => element.scrollIntoView({ block: "start" }));
    await expect(page.getByRole("button", { name: "Criar disparo", exact: true })).toBeVisible();
    await page.screenshot({
      path: `${folder}/mass-audience-${viewport.name}-light.png`,
      animations: "disabled",
    });
    if (viewport.name !== "landscape") {
      await page.getByRole("button", { name: "Filtros do público", exact: true }).click();
      const filterDialog = page.getByRole("dialog", { name: "Filtros do público", exact: true });
      await expect(
        filterDialog.getByRole("button", { name: "Aplicar filtros", exact: true }),
      ).toBeVisible();
      await expect(filterDialog.locator("..")).toHaveCSS("opacity", "1");
      await page.screenshot({
        path: `${folder}/mass-audience-filters-${viewport.name}.png`,
        animations: "disabled",
      });
      await filterDialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    }
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.getByRole("button", { name: "Trocar tema", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Novo disparo", exact: true }).click();
    await expect(page.getByTestId("audience-summary")).toBeVisible();
    if (viewport.name === "desktop")
      await page
        .getByRole("dialog")
        .locator(".MuiDialogContent-root")
        .evaluate((element) => {
          element.scrollTop = 0;
        });
    else
      await page
        .getByRole("region", { name: "Público do disparo", exact: true })
        .evaluate((element) => element.scrollIntoView({ block: "start" }));
    await page.screenshot({
      path: `${folder}/mass-audience-${viewport.name}-dark.png`,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.getByRole("button", { name: "Trocar tema", exact: true }).click();
  }
});
