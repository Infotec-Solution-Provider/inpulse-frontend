import { expect, test, type Page, type Route } from "@playwright/test";
import type { UnifiedSchedule, UnifiedSchedulesResponse } from "../../src/lib/sdk-local";

const referenceAt = "2026-11-13T15:00:00.000Z";
function item(id: number): UnifiedSchedule {
  return {
    id: `WHATSAPP-${id}`,
    scheduleId: id,
    channel: "WHATSAPP",
    scheduleAt: "2026-11-13T16:30:00.000Z",
    scheduledBy: 1,
    scheduledFor: 1,
    description: "Retorno solicitado pelo cliente.",
    contactName: `Contato ${id}`,
    contactPhone: null,
    customerId: id,
    customerName: id === 21 ? "Zélia São João" : `Cliente ${id}`,
    customerFantasyName: null,
    customerCampaignId: 7,
    customerCampaignName: "Campanha Primavera",
    customerOriginId: 1,
    customerOriginDescription: "Indicação",
    telephonyCampaignId: null,
    telephonyCampaignName: null,
    profileSummary: null,
    repurchase: null,
    meta: {},
  };
}
function response(params: URLSearchParams): UnifiedSchedulesResponse {
  const all = Array.from({ length: 21 }, (_, index) => item(index + 1));
  const search = (params.get("search") || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const filtered = all.filter(
    (row) =>
      !search ||
      row
        .customerName!.normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .includes(search),
  );
  const perPage = Number(params.get("perPage") || 10),
    totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(Number(params.get("page") || 1), totalPages);
  return {
    message: "ok",
    data: filtered.slice((current - 1) * perPage, current * perPage),
    referenceAt,
    timeZone: "America/Sao_Paulo",
    warnings: [],
    capabilities: { channels: ["WHATSAPP", "TELEFONIA"], commercial: true },
    page: { current, totalRows: filtered.length },
    pagination: {
      current,
      perPage,
      totalRows: filtered.length,
      totalPages,
      hasNext: current < totalPages,
      hasPrev: current > 1,
    },
    filters: { customerCampaigns: [{ id: "7", label: "Campanha Primavera" }] },
  };
}
async function setup(
  page: Page,
  handler?: (route: Route, params: URLSearchParams) => Promise<boolean>,
  legacy = false,
) {
  const requests: URLSearchParams[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/whatsapp/schedules/mine?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    requests.push(params);
    if (handler && (await handler(route, params))) return;
    await route.fulfill({ json: response(params) });
  });
  await page.goto(`/tests/schedules/index.html${legacy ? "?legacy" : ""}`);
  return { requests, errors };
}
const dialog = (page: Page) => page.getByRole("dialog", { name: "Meus Agendamentos", exact: true });
const apply = (page: Page) =>
  dialog(page).getByRole("button", { name: "Aplicar filtros", exact: true });
const search = (page: Page) =>
  dialog(page).getByRole("textbox", { name: "Buscar agendamentos", exact: true });
async function choose(page: Page, label: string, option: string) {
  await dialog(page)
    .getByRole("combobox", { name: new RegExp(`^${label}`) })
    .click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("busca no servidor encontra item fora da primeira página e mantém navegação em resultado vazio", async ({
  page,
}) => {
  const state = await setup(page);
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
  await expect(dialog(page).getByText("Zélia São João", { exact: true })).toHaveCount(0);
  await search(page).fill("Zelia Sao Joao");
  await search(page).press("Enter");
  await expect(dialog(page).getByText("Zélia São João", { exact: true })).toBeVisible();
  expect(state.requests.at(-1)?.get("search")).toBe("Zelia Sao Joao");
  expect(state.requests.at(-1)?.has("userId")).toBe(false);
  expect(state.requests.at(-1)?.has("sectorId")).toBe(false);
  await expect(dialog(page).getByText("1 no total · Página 1 de 1")).toBeVisible();
  await search(page).fill("inexistente");
  await apply(page).click();
  await expect(dialog(page).getByText("Nenhum resultado para estes filtros")).toBeVisible();
  await expect(dialog(page).getByRole("combobox", { name: "Itens por página" })).toBeVisible();
  await expect(dialog(page).getByText("0 no total · Página 1 de 1")).toBeVisible();
  await dialog(page).getByRole("button", { name: "Limpar tudo", exact: true }).click();
  await expect(search(page)).toHaveValue("");
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
  expect(state.requests.at(-1)?.has("search")).toBe(false);
  expect(state.errors).toEqual([]);
});

test("rascunho não consulta e Aplicar envia a combinação em uma requisição", async ({ page }) => {
  const state = await setup(page);
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
  const initial = state.requests.length;
  await search(page).fill("Cliente");
  await choose(page, "Período", "Hoje");
  await choose(page, "Canal", "WhatsApp");
  await dialog(page)
    .getByRole("combobox", { name: "Campanha do cliente", exact: true })
    .fill("Primavera");
  await page.getByRole("option", { name: "Campanha Primavera", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  expect(state.requests).toHaveLength(initial);
  await apply(page).click();
  await expect.poll(() => state.requests.length).toBe(initial + 1);
  expect(Object.fromEntries(state.requests.at(-1)!)).toMatchObject({
    search: "Cliente",
    period: "today",
    channels: "WHATSAPP",
    customerCampaignIds: "7",
    page: "1",
  });
  await expect(page.getByRole("dialog")).toHaveCount(1);
  expect(state.errors).toEqual([]);
});

test("falha inicial mostra erro e permite tentar novamente sem mostrar agenda vazia", async ({
  page,
}) => {
  let fail = true;
  const state = await setup(page, async (route) => {
    if (!fail) return false;
    fail = false;
    await route.fulfill({ status: 503, json: { message: "CRM temporariamente indisponível" } });
    return true;
  });
  await expect(dialog(page).getByRole("alert")).toContainText("CRM temporariamente indisponível");
  await expect(dialog(page).getByText("Sem agendamentos pendentes")).toHaveCount(0);
  await expect(dialog(page).getByRole("combobox", { name: "Itens por página" })).toBeVisible();
  await dialog(page).getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
  expect(state.requests).toHaveLength(2);
  expect(state.errors).toEqual([]);
});

test("consulta nova falha sem exibir dados dos filtros anteriores; refresh conserva apenas a mesma consulta", async ({
  page,
}) => {
  let fail = false;
  const state = await setup(page, async (route) => {
    if (!fail) return false;
    await route.fulfill({ status: 503, json: { message: "Falha controlada" } });
    return true;
  });
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
  fail = true;
  await dialog(page).getByRole("button", { name: "Atualizar agendamentos" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText(
    "último resultado desta mesma consulta",
  );
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
  await search(page).fill("Zélia");
  await apply(page).click();
  await expect(dialog(page).getByRole("alert")).toContainText("Não foi possível carregar");
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toHaveCount(0);
  fail = false;
  await dialog(page).getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(dialog(page).getByText("Zélia São João", { exact: true })).toBeVisible();
  expect(state.errors).toEqual([]);
});

test("período personalizado valida intervalo e usa Brasília mesmo com navegador em UTC", async ({
  page,
}) => {
  const state = await setup(page);
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
  await choose(page, "Período", "Personalizado");
  await dialog(page).getByLabel("Agendado de", { exact: true }).fill("2026-11-14");
  await dialog(page).getByLabel("Agendado até", { exact: true }).fill("2026-11-13");
  await apply(page).click();
  await expect(dialog(page).getByRole("alert")).toContainText("data final");
  expect(state.requests).toHaveLength(1);
  await dialog(page).getByLabel("Agendado de", { exact: true }).fill("2026-11-13");
  await apply(page).click();
  await expect.poll(() => state.requests.length).toBe(2);
  expect(state.requests.at(-1)?.get("scheduledFrom")).toBe("2026-11-13T03:00:00.000Z");
  expect(state.requests.at(-1)?.get("scheduledTo")).toBe("2026-11-14T03:00:00.000Z");
  await expect(dialog(page).getByText("13/11/2026, 13:30", { exact: true }).first()).toBeVisible();
});

test("tamanho de página volta à primeira e consulta persiste ao reabrir sem vazar para outra sessão", async ({
  page,
}) => {
  const state = await setup(page);
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
  await dialog(page).getByRole("button", { name: "Go to page 2", exact: true }).click();
  await expect(dialog(page).getByText("Cliente 11", { exact: true })).toBeVisible();
  await choose(page, "Itens por página", "25");
  await expect.poll(() => state.requests.at(-1)?.get("perPage")).toBe("25");
  expect(state.requests.at(-1)?.get("page")).toBe("1");
  await search(page).fill("Zélia");
  await apply(page).click();
  await expect(dialog(page).getByText("Zélia São João", { exact: true })).toBeVisible();
  await dialog(page).getByRole("button", { name: "Fechar agendamentos" }).click();
  await page.getByRole("button", { name: "Consultar agendamentos" }).click();
  await expect(search(page)).toHaveValue("Zélia");
  await expect(dialog(page).getByText("Zélia São João", { exact: true })).toBeVisible();
  await page.evaluate(() => window.schedulesHarness.switchUser(2));
  await expect(search(page)).toHaveValue("");
  await expect.poll(() => state.requests.at(-1)?.has("search")).toBe(false);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain("Zélia");
  expect(state.errors).toEqual([]);
});

test("ignora resposta antiga após consulta nova e troca de tenant", async ({ page }) => {
  let release: (() => void) | undefined;
  const state = await setup(page, async (route, params) => {
    if (params.get("search") !== "Cliente") return false;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({ json: response(params) }).catch(() => {});
    return true;
  });
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
  await search(page).fill("Cliente");
  await apply(page).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.evaluate(() => window.schedulesHarness.switchTenant("tenant-b"));
  await expect(search(page)).toHaveValue("");
  await search(page).fill("Zélia");
  await apply(page).click();
  await expect(dialog(page).getByText("Zélia São João", { exact: true })).toBeVisible();
  release?.();
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test("remover chip não aplica outras alterações do rascunho e campanha selecionada permanece no vazio", async ({
  page,
}) => {
  const state = await setup(page, async (route, params) => {
    if (params.get("search") !== "inexistente") return false;
    const data = response(params);
    data.filters.customerCampaigns = [];
    await route.fulfill({ json: data });
    return true;
  });
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
  await dialog(page)
    .getByRole("combobox", { name: "Campanha do cliente", exact: true })
    .fill("Primavera");
  await page.getByRole("option", { name: "Campanha Primavera", exact: true }).click();
  await page.keyboard.press("Escape");
  await search(page).fill("inexistente");
  await apply(page).click();
  await expect(dialog(page).getByText("Nenhum resultado para estes filtros")).toBeVisible();
  await expect(dialog(page).getByText("Campanha Primavera", { exact: true })).toHaveCount(2);
  await choose(page, "Período", "Hoje");
  await dialog(page)
    .getByRole("button", {
      name: "Filtro aplicado Busca: inexistente. Pressione Delete para remover.",
      exact: true,
    })
    .press("Delete");
  await expect.poll(() => state.requests.at(-1)?.has("search")).toBe(false);
  expect(state.requests.at(-1)?.get("period")).toBe("all");
  await expect(dialog(page).getByRole("combobox", { name: /^Período/ })).toContainText("Hoje");
  expect(state.errors).toEqual([]);
});

test("operador sem acesso financeiro mantém campanha e oculta perfil e recompra", async ({
  page,
}) => {
  const state = await setup(page, async (route, params) => {
    const data = response(params);
    data.capabilities = { channels: ["WHATSAPP"], commercial: false };
    await route.fulfill({ json: data });
    return true;
  });
  await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
  await expect(
    dialog(page).getByRole("combobox", { name: "Campanha do cliente", exact: true }),
  ).toBeVisible();
  await expect(dialog(page).getByRole("button", { name: /Filtros avançados/ })).toHaveCount(0);
  await dialog(page)
    .getByRole("combobox", { name: "Campanha do cliente", exact: true })
    .fill("Primavera");
  await page.getByRole("option", { name: "Campanha Primavera", exact: true }).click();
  await page.keyboard.press("Escape");
  await apply(page).click();
  await expect.poll(() => state.requests.at(-1)?.get("customerCampaignIds")).toBe("7");
  expect(state.errors).toEqual([]);
});

for (const legacy of [false, true])
  test(`diálogo ${legacy ? "legado" : "moderno"} mantém rodapé e fechar visíveis no móvel, paisagem e desktop`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const state = await setup(page, undefined, legacy);
    await expect(dialog(page).getByText("Cliente 1", { exact: true })).toBeVisible();
    await expect(
      dialog(page).getByRole("button", { name: "Fechar agendamentos" }),
    ).toBeInViewport();
    await expect(dialog(page).getByRole("combobox", { name: "Itens por página" })).toBeInViewport();
    const name = legacy ? "legacy" : "modern";
    await page.screenshot({
      path: `test-results/schedules/${name}-mobile-light.png`,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: `test-results/schedules/${name}-desktop-light.png`,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.schedulesHarness.dark());
    await page.screenshot({
      path: `test-results/schedules/${name}-mobile-dark.png`,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(dialog(page).getByRole("combobox", { name: "Itens por página" })).toBeInViewport();
    const box = await dialog(page).boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: `test-results/schedules/${name}-landscape-dark.png`,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: `test-results/schedules/${name}-desktop-dark.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(state.errors).toEqual([]);
  });
