import { expect, type Page, type Route } from "@playwright/test";

export type Mode = "schedules" | "calls" | "unscheduled";
export interface TelephonyQuery {
  page: number;
  pageSize: number;
  filters: { mode: Mode; searchText: string; [key: string]: unknown };
}
export interface OptionsQuery {
  kind: string;
  search: string;
  page: number;
  pageSize: number;
  states?: string[];
  cities?: string[];
}

export function telephonyItem(id: number, kind: Mode, name = `Cliente telefonia ${id}`) {
  return {
    id: `${kind}:${id}`,
    kind,
    customer: {
      id,
      name,
      tradeName: `Loja ${id}`,
      document: "00000000000",
      phone: "11900000000",
      operatorId: 2,
      operatorName: "Ana",
      state: "SP",
      city: "Campinas",
      neighborhood: "Centro",
    },
    schedule:
      kind === "schedules"
        ? {
            id,
            at: "2026-09-25T09:00:00.000Z",
            campaignId: 1,
            campaignName: "Campanha demonstrativa",
            operatorName: "Bruno",
          }
        : null,
    call:
      kind === "calls"
        ? {
            id: `history:${id}`,
            startedAt: "2026-09-25T09:00:00.000Z",
            finishedAt: "2026-09-25T09:03:00.000Z",
            durationSeconds: 180,
            result: "Contato efetivo",
            phone: "11900000000",
            operatorName: "Bruno",
            source: "historico_cli",
          }
        : null,
    metrics: {
      lastPurchaseAt: "2026-09-01T12:00:00.000Z",
      lastContactAt: "2026-09-20T12:00:00.000Z",
      nextRepurchaseAt: "2026-10-01T12:00:00.000Z",
      monthCalls: 1,
      monthContacts: 1,
      neverWorked: false,
    },
  };
}

const optionNames: Record<string, string> = {
  customers: "Cliente",
  campaigns: "Campanha",
  groups: "Grupo",
  segments: "Segmento",
  origins: "Origem",
  products: "Produto",
  operators: "Operador",
};

export async function setupTelephony(
  page: Page,
  handlers: {
    search?: (route: Route, query: TelephonyQuery) => Promise<boolean>;
    options?: (route: Route, query: OptionsQuery) => Promise<boolean>;
  } = {},
) {
  const queries: TelephonyQuery[] = [];
  const optionQueries: OptionsQuery[] = [];
  const errors: string[] = [];
  let conversationQueries = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/whatsapp/monitor/**", async (route) => {
    conversationQueries++;
    const data = route.request().url().endsWith("/summary")
      ? {
          inProgress: 0,
          waitingAgent: 0,
          waitingCustomer: 0,
          unread: 0,
          overdue: 0,
          scheduled: 0,
          slaMinutes: null,
        }
      : { items: [], totalCount: 0, page: 1, pageSize: 20 };
    await route.fulfill({ json: { data } });
  });
  await page.route("**/api/customers/monitor/telephony/**", async (route) => {
    if (route.request().url().endsWith("/options")) {
      const query = route.request().postDataJSON() as OptionsQuery;
      optionQueries.push(query);
      if (handlers.options && (await handlers.options(route, query))) return;
      let choices: { id: string; label: string; description?: string }[];
      if (query.kind === "states") {
        choices = [
          { id: "SP", label: "SP" },
          { id: "RJ", label: "RJ" },
        ];
      } else if (query.kind === "cities") {
        choices = (query.states?.length ? query.states : ["SP", "RJ"]).map((state) => ({
          id: JSON.stringify([state, "Centro urbano"]),
          label: `Centro urbano / ${state}`,
        }));
      } else if (query.kind === "neighborhoods") {
        choices = (
          query.cities?.length ? query.cities : [JSON.stringify(["SP", "Centro urbano"])]
        ).map((city) => {
          const [state, name] = JSON.parse(city) as string[];
          return {
            id: JSON.stringify([state, name, "Centro"]),
            label: `Centro / ${name} / ${state}`,
          };
        });
      } else {
        choices = Array.from({ length: 45 }, (_, index) => ({
          id: String(index + 1),
          label: `${optionNames[query.kind] ?? query.kind} ${index + 1}`,
          description: `Código ${index + 1}`,
        }));
      }
      choices = choices.filter(
        (choice) =>
          !query.search || choice.label.toLowerCase().includes(query.search.toLowerCase()),
      );
      const start = (query.page - 1) * query.pageSize;
      await route.fulfill({
        json: {
          data: {
            items: choices.slice(start, start + query.pageSize),
            totalCount: choices.length,
            page: query.page,
            pageSize: query.pageSize,
          },
        },
      });
      return;
    }
    const query = route.request().postDataJSON() as TelephonyQuery;
    queries.push(query);
    if (handlers.search && (await handlers.search(route, query))) return;
    const totalCount = query.filters.searchText ? 1 : 35;
    const start = (query.page - 1) * query.pageSize;
    const items = Array.from(
      { length: Math.max(0, Math.min(query.pageSize, totalCount - start)) },
      (_, index) =>
        telephonyItem(start + index + 1, query.filters.mode, query.filters.searchText || undefined),
    );
    await route.fulfill({
      json: {
        data: {
          items,
          totalCount,
          page: query.page,
          pageSize: query.pageSize,
          summary: {
            customerCount: totalCount,
            overdueCount: query.filters.mode === "schedules" ? 3 : null,
          },
        },
      },
    });
  });
  await page.goto("/tests/monitor/index.html");
  await page.getByRole("tab", { name: "Telefonia", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Monitoria.*telefonia/i })).toBeVisible();
  return { queries, optionQueries, errors, conversationQueries: () => conversationQueries };
}
