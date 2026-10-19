import { expect, test, type Page, type Route } from "@playwright/test";
import { setupTelephony, telephonyItem } from "./telephony-fixtures";
import type {
  TelephonyScheduleDetail,
  TelephonySchedulePatch,
} from "../../src/app/(private)/[instance]/monitor/telephony/types";

const initialDetail = (): TelephonyScheduleDetail => ({
  id: 1,
  customer: { id: 1, name: "Cliente telefonia 1" },
  campaign: { id: 1, name: "Campanha demonstrativa" },
  scheduledAt: "2026-10-20T00:15:42",
  operatorId: 4,
  operatorName: "Bruno",
  version: "v1",
  editable: true,
  blockedReason: null,
  capabilities: { priority: false, validity: false },
});

async function setupEditing(
  page: Page,
  handlers: {
    detail?: TelephonyScheduleDetail;
    get?: (route: Route) => Promise<boolean>;
    patch?: (route: Route, patch: TelephonySchedulePatch) => Promise<boolean>;
    receipt?: (route: Route, operationId: string) => Promise<boolean>;
  } = {},
) {
  let detail = handlers.detail ?? initialDetail();
  const patches: TelephonySchedulePatch[] = [];
  const receipts: string[] = [];
  const operatorQueries: URLSearchParams[] = [];
  const base = await setupTelephony(page, {
    search: async (route, query) => {
      if (query.filters.mode !== "schedules") return false;
      const item = telephonyItem(1, "schedules");
      item.schedule!.operatorName = detail.operatorName ?? "";
      await route.fulfill({
        json: {
          data: {
            items: [item],
            totalCount: 1,
            page: 1,
            pageSize: 20,
            summary: { customerCount: 1, overdueCount: 0 },
          },
        },
      });
      return true;
    },
    schedules: async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === "PATCH") {
        const patch = request.postDataJSON() as TelephonySchedulePatch;
        patches.push(patch);
        if (handlers.patch && (await handlers.patch(route, patch))) return true;
        detail = {
          ...detail,
          ...patch.changes,
          version: `v${patches.length + 1}`,
          operatorName: patch.changes.operatorId
            ? `Operador ${patch.changes.operatorId}`
            : detail.operatorName,
        };
        await route.fulfill({
          json: { data: detail, operationId: patch.operationId, status: "applied" },
        });
      } else if (url.pathname.includes("/operations/")) {
        const operationId = url.pathname.split("/").at(-1)!;
        receipts.push(operationId);
        if (handlers.receipt && (await handlers.receipt(route, operationId))) return true;
        await route.fulfill({ json: { data: { status: "applied", detail } } });
      } else if (url.pathname.endsWith("/operators")) {
        operatorQueries.push(url.searchParams);
        const currentPage = Number(url.searchParams.get("page"));
        const pageSize = Number(url.searchParams.get("pageSize"));
        const search = url.searchParams.get("search") || "";
        const choices = Array.from({ length: 45 }, (_, index) => ({
          id: String(index + 1),
          label: `Operador ${index + 1}`,
        })).filter((item) => item.label.includes(search));
        await route.fulfill({
          json: {
            data: {
              items: choices.slice((currentPage - 1) * pageSize, currentPage * pageSize),
              totalCount: choices.length,
              page: currentPage,
              pageSize,
            },
          },
        });
      } else {
        if (handlers.get && (await handlers.get(route))) return true;
        await route.fulfill({ json: { data: detail } });
      }
      return true;
    },
  });
  return { ...base, patches, receipts, operatorQueries, current: () => detail };
}

const openEditor = (page: Page) =>
  page
    .getByRole("button", { name: "Editar agendamento 1 de Cliente telefonia 1", exact: true })
    .click();
const editor = (page: Page) => page.getByRole("dialog", { name: /^Editar agendamento/ });
const dateField = (page: Page) => page.getByLabel("Data e hora do agendamento", { exact: true });
const saveButton = (page: Page) =>
  editor(page).getByRole("button", { name: "Salvar agendamento", exact: true });

test("edita horário civil e operador da agenda, preservando carteira, paginação da seleção e filtro", async ({
  page,
}) => {
  const state = await setupEditing(page);
  await page.getByLabel("Pesquisar cliente ou telefone", { exact: true }).fill("Cliente");
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  await openEditor(page);
  await expect(dateField(page)).toHaveValue("2026-10-20T00:15:42");
  await expect(editor(page).getByText("Bruno", { exact: true })).toBeVisible();
  await expect(
    editor(page).getByText("Prioridade: edição indisponível para este agendamento."),
  ).toBeVisible();
  await expect(
    editor(page).getByText("Validade da campanha: edição indisponível para este agendamento."),
  ).toBeVisible();
  await dateField(page).fill("2026-10-21T00:05");
  await editor(page).getByRole("button", { name: "Alterar operador", exact: true }).click();
  const lookup = page.getByRole("dialog", { name: /^Operador do agendamento/ });
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await lookup.getByRole("button", { name: "Go to page 2", exact: true }).click();
  await lookup.getByRole("radio", { name: "Operador 21", exact: true }).check();
  await lookup.getByLabel("Pesquisar operador do agendamento", { exact: true }).fill("inexistente");
  await lookup.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(lookup.getByText("Nenhuma opção encontrada para esta pesquisa.")).toBeVisible();
  await expect(lookup.getByText("1 selecionado", { exact: true })).toBeVisible();
  await lookup.getByRole("button", { name: "Confirmar seleção", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(
    editor(page).getByRole("button", { name: "Alterar operador", exact: true }),
  ).toBeFocused();
  await expect(dateField(page)).toHaveValue("2026-10-21T00:05");
  await saveButton(page).press("Enter");
  await expect(editor(page)).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("Agendamento atualizado");
  expect(state.patches).toHaveLength(1);
  expect(state.patches[0]).toEqual({
    operationId: expect.stringMatching(/^[\da-f-]{36}$/),
    version: "v1",
    changes: { scheduledAt: "2026-10-21T00:05:00", operatorId: 21 },
  });
  expect(state.operatorQueries.some((query) => query.get("page") === "2")).toBe(true);
  await expect.poll(() => state.queries.at(-1)?.filters.searchText).toBe("Cliente");
  const registeredOperator = page
    .getByRole("table")
    .getByRole("cell")
    .filter({ hasText: "Cadastro do cliente" });
  await expect(registeredOperator).toContainText("Ana");
  await expect(page.getByRole("table").getByText(/Operador 21/)).toBeVisible();
  await openEditor(page);
  await expect(dateField(page)).toHaveValue("2026-10-21T00:05");
  await expect(editor(page).getByText("Operador 21", { exact: true })).toBeVisible();
  expect(state.errors).toEqual([]);
});

test("mantém data ausente e operador atual fora do resultado da pesquisa até escolher destino", async ({
  page,
}) => {
  const state = await setupEditing(page, {
    detail: {
      ...initialDetail(),
      scheduledAt: null,
      operatorId: 99,
      operatorName: "Operador legado",
    },
  });
  await openEditor(page);
  await expect(dateField(page)).toHaveValue("");
  await editor(page).getByRole("button", { name: "Alterar operador", exact: true }).click();
  const lookup = page.getByRole("dialog", { name: /^Operador do agendamento/ });
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(lookup.getByText("Operador legado", { exact: true })).toBeVisible();
  await lookup.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(
    editor(page).getByRole("button", { name: "Alterar operador", exact: true }),
  ).toBeFocused();
  await expect(editor(page).getByText("Operador legado", { exact: true })).toBeVisible();
  await saveButton(page).click();
  await expect(editor(page).getByRole("alert")).toContainText("Altere a data e hora ou o operador");
  expect(state.patches).toHaveLength(0);
  await editor(page).getByRole("button", { name: "Alterar operador", exact: true }).click();
  await lookup.getByRole("radio", { name: "Operador 2", exact: true }).check();
  await lookup.getByRole("button", { name: "Confirmar seleção", exact: true }).click();
  await saveButton(page).click();
  await expect.poll(() => state.patches.length).toBe(1);
  expect(state.patches[0].changes).toEqual({ operatorId: 2 });
});

test("conflito preserva rascunho e exige recarregar versão antes de uma nova edição", async ({
  page,
}) => {
  let gets = 0;
  const state = await setupEditing(page, {
    get: async (route) => {
      gets++;
      await route.fulfill({
        json: {
          data:
            gets === 1
              ? initialDetail()
              : { ...initialDetail(), version: "remote-v2", scheduledAt: "2026-10-25T14:30:00" },
        },
      });
      return true;
    },
    patch: async (route) => {
      await route.fulfill({
        status: 409,
        json: { message: "Agenda alterada por outro operador." },
      });
      return true;
    },
  });
  await openEditor(page);
  await dateField(page).fill("2026-10-21T00:05");
  await saveButton(page).click();
  await expect(
    editor(page).getByText("Agenda alterada por outro operador.", { exact: true }),
  ).toBeVisible();
  await expect(dateField(page)).toHaveValue("2026-10-21T00:05");
  await expect(saveButton(page)).toBeDisabled();
  expect(state.patches).toHaveLength(1);
  await editor(page).getByRole("button", { name: "Recarregar agendamento", exact: true }).click();
  await expect(dateField(page)).toHaveValue("2026-10-25T14:30");
  await dateField(page).fill("2026-10-26T15:30");
  await saveButton(page).click();
  await expect.poll(() => state.patches.length).toBe(2);
  expect(state.patches[1].version).toBe("remote-v2");
});

test("erro confirmado permite corrigir mantendo rascunho, e data inválida não dispara PATCH", async ({
  page,
}) => {
  let first = true;
  const state = await setupEditing(page, {
    patch: async (route) => {
      if (!first) return false;
      first = false;
      await route.fulfill({
        status: 400,
        json: { message: "Data não permitida para esta agenda." },
      });
      return true;
    },
  });
  await openEditor(page);
  await dateField(page).fill("");
  await saveButton(page).click();
  await expect(editor(page).getByRole("alert")).toContainText("não pode ser removida");
  expect(state.patches).toHaveLength(0);
  await dateField(page).fill("2026-10-21T00:05");
  await saveButton(page).click();
  await expect(editor(page).getByRole("alert")).toContainText("Data não permitida");
  await expect(dateField(page)).toHaveValue("2026-10-21T00:05");
  await dateField(page).fill("2026-10-22T01:05");
  await saveButton(page).click();
  await expect(editor(page)).toHaveCount(0);
  expect(state.patches).toHaveLength(2);
  expect(state.patches[1].operationId).not.toBe(state.patches[0].operationId);
});

test("resposta perdida congela rascunho e reconcilia por recibo sem repetir mutation", async ({
  page,
}) => {
  let receiptCount = 0;
  const state = await setupEditing(page, {
    patch: async (route) => {
      await route.abort("failed");
      return true;
    },
    receipt: async (route) => {
      receiptCount++;
      await route.fulfill({
        json: {
          data: receiptCount === 1 ? { status: "not_confirmed" } : { status: "applied" },
        },
      });
      return true;
    },
  });
  await openEditor(page);
  await dateField(page).fill("2026-10-21T00:05");
  await saveButton(page).click();
  await expect(editor(page).getByRole("alert")).toContainText("não foi confirmada");
  await expect(dateField(page)).toBeDisabled();
  await expect(dateField(page)).toHaveValue("2026-10-21T00:05");
  await expect(saveButton(page)).toHaveCount(0);
  await editor(page).getByRole("button", { name: "Verificar gravação", exact: true }).click();
  await expect(editor(page).getByRole("alert")).toContainText("não confirma que ela foi desfeita");
  await expect(dateField(page)).toBeDisabled();
  await editor(page).getByRole("button", { name: "Verificar gravação", exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  expect(state.patches).toHaveLength(1);
  expect(state.receipts).toEqual([state.patches[0].operationId, state.patches[0].operationId]);
});

for (const code of ["SCHEDULE_EDIT_UNAVAILABLE", "SCHEDULE_EDIT_NOT_COMMITTED"]) {
  test(`${code} 503 conserva rascunho e permite nova tentativa manual`, async ({ page }) => {
    let first = true;
    const state = await setupEditing(page, {
      patch: async (route) => {
        if (!first) return false;
        first = false;
        await route.fulfill({
          status: 503,
          json: { code, message: "A operação não gravou alterações." },
        });
        return true;
      },
    });
    await openEditor(page);
    await dateField(page).fill("2026-10-21T00:05");
    await saveButton(page).click();
    await expect(editor(page).getByRole("alert")).toContainText("não gravou alterações");
    await expect(dateField(page)).toBeEnabled();
    await expect(dateField(page)).toHaveValue("2026-10-21T00:05");
    await expect(saveButton(page)).toBeEnabled();
    await expect(
      editor(page).getByRole("button", { name: "Verificar gravação", exact: true }),
    ).toHaveCount(0);
    expect(state.patches).toHaveLength(1);
    await saveButton(page).click();
    await expect(editor(page)).toHaveCount(0);
    expect(state.patches).toHaveLength(2);
    expect(state.patches[1].operationId).not.toBe(state.patches[0].operationId);
  });
}

test("UNKNOWN 503 e falha de consulta permanecem sem confirmação, sem novo envio", async ({
  page,
}) => {
  const state = await setupEditing(page, {
    patch: async (route) => {
      await route.fulfill({ status: 503, json: { code: "UNKNOWN", message: "Outcome unknown" } });
      return true;
    },
    receipt: async (route) => {
      await route.fulfill({ status: 503, json: { message: "Sem conexão" } });
      return true;
    },
  });
  await openEditor(page);
  await dateField(page).fill("2026-10-21T00:05");
  await saveButton(page).click();
  await editor(page).getByRole("button", { name: "Verificar gravação", exact: true }).click();
  await expect(editor(page).getByRole("alert")).toContainText("continua sem confirmação");
  await expect(dateField(page)).toBeDisabled();
  await editor(page).getByRole("button", { name: "Fechar", exact: true }).click();
  expect(state.patches).toHaveLength(1);
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(storage).not.toContain(state.patches[0].operationId);
  expect(storage).not.toContain("2026-10-21T00:05");
});

test("bloqueia duplo envio e ignora resposta da mutation após troca de usuário", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const state = await setupEditing(page, {
    patch: async (route, patch) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route
        .fulfill({
          json: { data: initialDetail(), operationId: patch.operationId, status: "applied" },
        })
        .catch(() => {});
      return true;
    },
  });
  await openEditor(page);
  await dateField(page).fill("2026-10-21T00:05");
  await saveButton(page).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(() => Boolean(release)).toBe(true);
  await expect(editor(page).getByRole("button", { name: "Salvando…", exact: true })).toBeDisabled();
  await page.evaluate(() => window.monitorHarness.switchUser(2));
  await expect(editor(page)).toHaveCount(0);
  await page.getByRole("tab", { name: "Telefonia", exact: true }).click();
  await openEditor(page);
  await expect(dateField(page)).toHaveValue("2026-10-20T00:15:42");
  release?.();
  await expect(editor(page)).toBeVisible();
  await expect(page.getByText("Agendamento atualizado.", { exact: true })).toHaveCount(0);
  expect(state.patches).toHaveLength(1);
  expect(state.errors).toEqual([]);
});

test("ignora detalhe antigo após troca de tenant e remove edição fora de agendamentos", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  let first = true;
  const state = await setupEditing(page, {
    get: async (route) => {
      if (!first) return false;
      first = false;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route
        .fulfill({
          json: {
            data: { ...initialDetail(), customer: { id: 1, name: "Cliente do tenant antigo" } },
          },
        })
        .catch(() => {});
      return true;
    },
  });
  await openEditor(page);
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.evaluate(() => window.monitorHarness.switchTenant("tenant-b"));
  await expect(editor(page)).toHaveCount(0);
  release?.();
  await page.getByRole("tab", { name: "Telefonia", exact: true }).click();
  await openEditor(page);
  await expect(dateField(page)).toHaveValue("2026-10-20T00:15:42");
  await expect(page.getByText("Cliente do tenant antigo", { exact: true })).toHaveCount(0);
  // Programmatic click exercises an external mode change while the modal owns focus.
  await page
    .getByRole("button", { name: "Ligações", exact: true, includeHidden: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(editor(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Editar agendamento/ })).toHaveCount(0);
  expect(state.patches).toHaveLength(0);
});

test("pausa auto-refresh durante edição e respeita bloqueio de atendimento retornado pelo servidor", async ({
  page,
}) => {
  const state = await setupEditing(page, {
    detail: {
      ...initialDetail(),
      editable: false,
      blockedReason: "Existe atendimento em andamento.",
    },
  });
  await openEditor(page);
  await expect(editor(page).getByRole("alert")).toContainText("atendimento em andamento");
  await expect(saveButton(page)).toBeDisabled();
  await expect(dateField(page)).toBeDisabled();
  await page.clock.install();
  const count = state.queries.length;
  await page.evaluate(() => window.monitorHarness.emit());
  await page.clock.runFor(61_000);
  expect(state.queries).toHaveLength(count);
  await editor(page).getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.clock.runFor(61_000);
  await expect.poll(() => state.queries.length).toBeGreaterThan(count);
});

test("modal móvel, paisagem e escuro mantém ações alcançáveis e navegação por teclado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setupEditing(page);
  await page.evaluate(() => window.monitorHarness.dark());
  await openEditor(page);
  await expect(dateField(page)).toHaveValue("2026-10-20T00:15:42");
  await expect(saveButton(page)).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(editor(page).locator("..")).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: "test-results/schedule-edit-mobile-dark.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(saveButton(page)).toBeInViewport();
  const box = await editor(page).boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/schedule-edit-landscape.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(editor(page)).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openEditor(page);
  await dateField(page).focus();
  await page.keyboard.press("Tab");
  await expect(editor(page).locator("..")).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: "test-results/schedule-edit-desktop-dark.png",
    animations: "disabled",
  });
  expect(state.errors).toEqual([]);
});
