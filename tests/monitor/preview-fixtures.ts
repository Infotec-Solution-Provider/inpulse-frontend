/**
 * Browser-only, fictional data for the local design preview.
 * This adapter must be installed before dynamically importing the real harness.
 * No request falls back to a tenant, CRM, WhatsApp or telephony service.
 */
import axios, { AxiosError, CanceledError, type AxiosAdapter } from "axios";
import type { MonitorFiltersState } from "../../src/app/(private)/[instance]/monitor/types";
import type {
  TelephonyLookupOption,
  TelephonyLookupParams,
  TelephonyMonitorFilters,
  TelephonyMonitorMode,
  TelephonyScheduleDetail,
  TelephonySchedulePatch,
} from "../../src/app/(private)/[instance]/monitor/telephony/types";

const origin = "http://127.0.0.1:4190";
const bootTime = Date.now();
const minute = 60_000;
const iso = (minutesAgo: number) => new Date(bootTime - minutesAgo * minute).toISOString();
const dateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date(bootTime));
const datePart = (type: string) => dateParts.find((part) => part.type === type)!.value;
const localDate = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
function civil(index: number) {
  const date = new Date(`${localDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (index % 5 === 0 ? -1 : index % 3 === 0 ? 1 : 0));
  return `${date.toISOString().slice(0, 10)}T${String(9 + (index % 8)).padStart(2, "0")}:30:00`;
}
const customers = [
  ["Mariana Freitas", "Ateliê Aurora", "Porto Alegre", "RS"],
  ["Rafael Costa", "Casa Horizonte — Materiais e Acabamentos", "Canoas", "RS"],
  ["Beatriz Nogueira de Albuquerque", "Distribuidora Vale Sereno", "Campinas", "SP"],
  ["Lucas Azevedo", "Mercado Alameda", "Florianópolis", "SC"],
  ["Camila Duarte", "Estúdio Lume", "Curitiba", "PR"],
  ["Henrique Martins", "Oficina do Bairro", "Joinville", "SC"],
  ["Paula Ribeiro", "", "São Paulo", "SP"],
  ["Gabriel Moreira", "Jardim & Casa", "Bento Gonçalves", "RS"],
  ["Isabela Fernandes", "Armazém Semente", "Curitiba", "PR"],
  ["Thiago Almeida", "Comercial Brisa Norte", "Novo Hamburgo", "RS"],
  ["Sofia Cardoso", "Papelaria Ipê", "Campinas", "SP"],
  ["Daniela Vieira", "Clínica Bem Viver", "Caxias do Sul", "RS"],
  ["Pedro Macedo", "Fábrica de Ideias e Soluções para Ambientes", "Florianópolis", "SC"],
  ["Ana Clara Teixeira", "Loja Ponto de Encontro", "Canoas", "RS"],
  ["Bruno Oliveira", "Empório Recanto", "Joinville", "SC"],
  ["Larissa Gomes", "Livraria Caminhos", "Porto Alegre", "RS"],
] as const;
const messages = [
  "Vocês conseguem confirmar o prazo de entrega do meu pedido?",
  "Obrigado pelo retorno. Vou conferir a proposta e aviso por aqui.",
  "Gostaria de conversar sobre as condições para a próxima compra.",
  "Recebi o catálogo. Podemos agendar uma ligação para amanhã?",
  "Pode enviar a segunda via, por favor?",
  "Conferi os dados e está tudo certo para continuar.",
];
const operators = [
  { id: "1", label: "Supervisor", description: "Supervisão · demonstração" },
  { id: "2", label: "Ana", description: "Atendimento · demonstração" },
  { id: "3", label: "Bruno", description: "Comercial · demonstração" },
  { id: "4", label: "Camila", description: "Relacionamento · demonstração" },
];
const campaigns = ["Relacionamento", "Reposição de estoque", "Novos clientes", "Pós-venda"];
const conversations = customers.map(([name, company], index) => {
  const waitingAgent = index % 3 !== 1;
  const waitMinutes = [42, 8, 67, 3, 21, 12, 5, 34][index % 8];
  return {
    id: index + 1,
    instance: "tenant-a",
    chatType: "wpp" as const,
    contactId: index + 101,
    userId: index % 4 === 0 ? 1 : 2,
    sectorId: 1,
    isFinished: false,
    startedAt: iso(80 + index * 11),
    finishedAt: null,
    contact: { id: index + 101, name, phone: index === 8 ? null : "5511000000000" },
    customer: company
      ? { RAZAO: company, CPF_CNPJ: index % 2 ? "00000000000100" : "00000000000" }
      : null,
    operational: {
      status: waitingAgent ? "waiting_agent" : "waiting_customer",
      lastMessageAt: iso(waitMinutes),
      lastMessagePreview: messages[index % messages.length],
      waitingSince: iso(waitMinutes),
      unreadCount: waitingAgent ? (index % 3) + 1 : 0,
      channel: index % 3 ? "WhatsApp · WABA" : "WhatsApp · sessão conectada",
      deliveryStatus: index === 1 ? "UNKNOWN" : index === 5 ? "FAILED" : null,
      slaBreached: waitingAgent && waitMinutes > 30,
    },
  };
});
const details = new Map<number, TelephonyScheduleDetail>(
  customers.map(([name], index) => [
    index + 1,
    {
      id: index + 1,
      customer: { id: index + 1, name },
      campaign: { id: (index % 4) + 1, name: campaigns[index % 4] },
      scheduledAt: civil(index),
      operatorId: index % 2 ? 2 : 3,
      operatorName: index % 2 ? "Ana" : "Bruno",
      version: "preview-v1",
      editable: index !== 14,
      blockedReason:
        index === 14 ? "Agendamento indisponível para edição nesta demonstração." : null,
      capabilities: { priority: false, validity: false },
    },
  ]),
);
const receipts = new Map<string, TelephonyScheduleDetail>();
const requests: { method: string; path: string; simulated: boolean }[] = [];

function page<T>(items: T[], query: { page?: number; pageSize?: number }) {
  const current = Math.max(1, Math.trunc(query.page || 1));
  const pageSize = Math.max(1, Math.min(100, Math.trunc(query.pageSize || 20)));
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    totalCount: items.length,
    page: current,
    pageSize,
  };
}
const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const hasText = (values: unknown[], search = "") =>
  normalize(values.join(" ")).includes(normalize(search));
function rangeMatch(value: string | null, range?: { from?: string | null; to?: string | null }) {
  if (!range?.from && !range?.to) return true;
  if (!value) return false;
  return (!range.from || value >= range.from) && (!range.to || value <= range.to);
}
function conversationRows(filters: Partial<MonitorFiltersState>) {
  return conversations
    .filter((item) => {
      if (filters.categories?.showCustomerChats === false || filters.showOngoing === false)
        return false;
      if (filters.user && filters.user !== "all" && item.userId !== filters.user) return false;
      if (filters.showOnlyScheduled) return false;
      if (filters.showUnreadOnly && !item.operational.unreadCount) return false;
      if (filters.showPendingResponseOnly && item.operational.status !== "waiting_agent")
        return false;
      if (!rangeMatch(item.startedAt, filters.startedAt) || !rangeMatch(null, filters.finishedAt))
        return false;
      const status = filters.operationalStatus;
      if (status && status !== "all" && status !== "in_progress") {
        if (
          status === "unread"
            ? !item.operational.unreadCount
            : status === "overdue"
              ? !item.operational.slaBreached
              : item.operational.status !== status
        )
          return false;
      }
      const columns = {
        name: [item.contact.name],
        phone: [item.contact.phone],
        customer: [item.customer?.RAZAO],
        message: [item.operational.lastMessagePreview],
        all: [
          item.contact.name,
          item.contact.phone,
          item.customer?.RAZAO,
          item.operational.lastMessagePreview,
        ],
      };
      return hasText(columns[filters.searchColumn || "all"], filters.searchText);
    })
    .sort((a, b) => {
      const direction = filters.sortOrder === "asc" ? 1 : -1;
      if (filters.sortBy === "name")
        return a.contact.name.localeCompare(b.contact.name) * direction;
      if (filters.sortBy === "startedAt") return a.startedAt.localeCompare(b.startedAt) * direction;
      if (filters.sortBy === "lastMessage")
        return a.operational.lastMessageAt.localeCompare(b.operational.lastMessageAt) * direction;
      return a.operational.waitingSince.localeCompare(b.operational.waitingSince) * -direction;
    });
}
function telephonyRows(mode: TelephonyMonitorMode, filters: Partial<TelephonyMonitorFilters>) {
  return customers
    .map(([name, tradeName, city, state], index) => {
      const id = index + 1;
      const detail = details.get(id)!;
      return {
        id: `${mode}:${id}`,
        kind: mode,
        customer: {
          id,
          name,
          tradeName: tradeName || null,
          document: index % 2 ? "00000000000100" : "00000000000",
          phone: index === 8 ? null : "1100000000",
          operatorId: index % 4 === 0 ? null : 2,
          operatorName: index % 4 === 0 ? null : "Ana",
          state,
          city,
          neighborhood: "Centro",
        },
        schedule:
          mode === "schedules"
            ? {
                id,
                at: detail.scheduledAt
                  ? new Date(`${detail.scheduledAt}-03:00`).toISOString()
                  : null,
                campaignId: detail.campaign?.id ?? null,
                campaignName: detail.campaign?.name ?? null,
                operatorName: detail.operatorName,
              }
            : null,
        call:
          mode === "calls"
            ? {
                id: `history:${id}`,
                startedAt: iso(20 + index * 30),
                finishedAt: iso(17 + index * 30),
                durationSeconds: index % 4 === 0 ? 0 : 180,
                result: index % 4 === 0 ? "Não atendeu" : "Contato efetivo",
                phone: "1100000000",
                operatorName: index % 2 ? "Ana" : "Bruno",
                source: "historico_cli",
              }
            : null,
        metrics: {
          lastPurchaseAt: index % 5 === 0 ? null : iso(60 * 24 * (2 + index)),
          lastContactAt: index % 5 === 0 ? null : iso(60 * 24 * (index + 1)),
          nextRepurchaseAt: new Date(bootTime + (index + 1) * 86_400_000).toISOString(),
          monthCalls: index % 4,
          monthContacts: index % 5,
          neverWorked: index % 5 === 0,
        },
      };
    })
    .filter((item) => {
      const { customer, schedule, metrics } = item;
      const index = customer.id - 1;
      if (
        !hasText(
          [customer.name, customer.tradeName, customer.phone, customer.document],
          filters.searchText,
        )
      )
        return false;
      if (filters.customerId && filters.customerId !== customer.id) return false;
      if (filters.customerOperatorId && filters.customerOperatorId !== customer.operatorId)
        return false;
      if (filters.neverWorked && !metrics.neverWorked) return false;
      if (filters.monthlyActivity === "calls_lt2" && metrics.monthCalls >= 2) return false;
      if (filters.monthlyActivity === "contacts_lt2" && metrics.monthContacts >= 2) return false;
      if (filters.campaignIds?.length && !filters.campaignIds.includes(schedule?.campaignId ?? -1))
        return false;
      if (filters.states?.length && !filters.states.includes(customer.state)) return false;
      if (
        filters.cities?.length &&
        !filters.cities.includes(JSON.stringify([customer.state, customer.city]))
      )
        return false;
      if (
        filters.neighborhoods?.length &&
        !filters.neighborhoods.includes(
          JSON.stringify([customer.state, customer.city, customer.neighborhood]),
        )
      )
        return false;
      for (const field of ["groupIds", "segmentIds", "originIds"] as const)
        if (filters[field]?.length && !filters[field]!.includes((index % 3) + 1)) return false;
      if (filters.productIds?.length && !filters.productIds.includes(String((index % 3) + 1)))
        return false;
      return (
        rangeMatch(schedule?.at ?? null, filters.scheduledAt) &&
        rangeMatch(item.call?.startedAt ?? null, filters.calledAt) &&
        rangeMatch(metrics.nextRepurchaseAt, filters.repurchaseAt) &&
        rangeMatch(metrics.lastPurchaseAt, filters.lastPurchaseAt) &&
        rangeMatch(metrics.lastContactAt, filters.lastContactAt)
      );
    });
}
function choices(query: TelephonyLookupParams): TelephonyLookupOption[] {
  const named = (names: readonly string[]) =>
    names.map((label, index) => ({ id: String(index + 1), label }));
  const cities = [...new Set(customers.map(([, , city, state]) => JSON.stringify([state, city])))];
  const catalog: Record<TelephonyLookupParams["kind"], TelephonyLookupOption[]> = {
    customers: customers.map(([label, company], index) => ({
      id: String(index + 1),
      label,
      description: company || "Sem empresa associada",
    })),
    operators,
    campaigns: named(campaigns),
    groups: named(["Varejo", "Distribuição", "Serviços"]),
    segments: named(["Casa e decoração", "Comércio", "Serviços"]),
    origins: named(["Indicação", "Site", "Prospecção"]),
    products: named(["Linha Essencial", "Linha Profissional", "Linha Premium"]),
    states: ["RS", "SC", "PR", "SP"].map((id) => ({ id, label: id })),
    cities: cities
      .filter((id) => !query.states?.length || query.states.includes(JSON.parse(id)[0]))
      .map((id) => {
        const [state, city] = JSON.parse(id);
        return { id, label: `${city} / ${state}` };
      }),
    neighborhoods: cities
      .filter((id) => !query.cities?.length || query.cities.includes(id))
      .map((id) => {
        const [state, city] = JSON.parse(id);
        return {
          id: JSON.stringify([state, city, "Centro"]),
          label: `Centro / ${city} / ${state}`,
        };
      }),
  };
  return catalog[query.kind].filter((item) =>
    hasText([item.label, item.description], query.search),
  );
}

type RequestBody = Record<string, unknown>;
function respond(method: string, url: URL, body: RequestBody): { status: number; data: unknown } {
  const path = url.pathname;
  const ok = (data: unknown) => ({ status: 200, data: { data } });
  if (method === "POST" && path === "/api/whatsapp/monitor/search")
    return ok(page(conversationRows((body.filters ?? {}) as Partial<MonitorFiltersState>), body));
  if (method === "POST" && path === "/api/whatsapp/monitor/summary") {
    const rows = conversationRows({
      ...(body.filters as Partial<MonitorFiltersState>),
      operationalStatus: "all",
    });
    return ok({
      inProgress: rows.length,
      waitingAgent: rows.filter((r) => r.operational.status === "waiting_agent").length,
      waitingCustomer: rows.filter((r) => r.operational.status === "waiting_customer").length,
      unread: rows.filter((r) => r.operational.unreadCount).length,
      overdue: rows.filter((r) => r.operational.slaBreached).length,
      scheduled: 0,
      slaMinutes: 30,
    });
  }
  if (
    method === "GET" &&
    /^\/api\/whatsapp\/monitor\/chats\/(wpp|internal)\/\d+\/messages$/.test(path)
  ) {
    return ok({
      messages: [
        {
          id: 1,
          from: "customer",
          body: "Olá! Gostaria de confirmar o prazo de entrega do pedido.",
          timestamp: String(bootTime - 60 * minute),
          type: "chat",
          status: "RECEIVED",
        },
        {
          id: 2,
          from: "operator",
          body: "Olá! Vou conferir com a nossa equipe e retorno por aqui.",
          timestamp: String(bootTime - 50 * minute),
          type: "chat",
          status: "READ",
        },
        {
          id: 3,
          from: "customer",
          body: "Combinado, obrigada pela ajuda.",
          timestamp: String(bootTime - 42 * minute),
          type: "chat",
          status: "RECEIVED",
        },
      ],
      nextCursor: null,
    });
  }
  if (method === "POST" && path === "/api/customers/monitor/telephony/search") {
    const filters = body.filters as Partial<TelephonyMonitorFilters>;
    const mode = filters.mode ?? "schedules";
    const rows = telephonyRows(mode, filters);
    return ok({
      ...page(rows, body),
      summary: {
        customerCount: rows.length,
        overdueCount:
          mode === "schedules"
            ? rows.filter((r) => r.schedule?.at && Date.parse(r.schedule.at) < bootTime).length
            : null,
      },
    });
  }
  if (method === "POST" && path === "/api/customers/monitor/telephony/options") {
    const query = body as unknown as TelephonyLookupParams;
    return ok(page(choices(query), query));
  }
  const schedule = path.match(
    /^\/api\/customers\/monitor\/telephony\/schedules\/(\d+)(?:\/(operators|operations\/(.+)))?$/,
  );
  if (schedule) {
    const id = Number(schedule[1]);
    const detail = details.get(id);
    if (!detail) return { status: 404, data: { message: "Agendamento fictício não encontrado." } };
    if (method === "GET" && schedule[2] === "operators") {
      const query = {
        page: Number(url.searchParams.get("page")),
        pageSize: Number(url.searchParams.get("pageSize")),
      };
      return ok(
        page(
          operators.filter((item) => hasText([item.label], url.searchParams.get("search") || "")),
          query,
        ),
      );
    }
    if (method === "GET" && schedule[3]) {
      const saved = receipts.get(`${id}:${decodeURIComponent(schedule[3])}`);
      return ok(saved ? { status: "applied", detail: saved } : { status: "not_confirmed" });
    }
    if (method === "GET" && !schedule[2]) return ok(detail);
    if (method === "PATCH" && !schedule[2]) {
      const patch = body as unknown as TelephonySchedulePatch;
      const key = `${id}:${patch.operationId}`;
      const prior = receipts.get(key);
      if (prior)
        return {
          status: 200,
          data: { data: prior, operationId: patch.operationId, status: "replayed" },
        };
      if (!detail.editable || patch.version !== detail.version)
        return {
          status: 409,
          data: { message: "Os dados fictícios mudaram. Reabra o agendamento." },
        };
      const next = {
        ...detail,
        ...patch.changes,
        version: `preview-v${Number(detail.version.split("v").at(-1)) + 1}`,
        operatorName: patch.changes.operatorId
          ? (operators.find((o) => Number(o.id) === patch.changes.operatorId)?.label ??
            detail.operatorName)
          : detail.operatorName,
      };
      details.set(id, next);
      receipts.set(key, next);
      return {
        status: 200,
        data: { data: next, operationId: patch.operationId, status: "applied" },
      };
    }
  }
  return {
    status: 501,
    data: { message: "Consulta indisponível na prévia local; nenhum serviço real foi acessado." },
  };
}
function payload(value: unknown): RequestBody {
  if (typeof value === "string") return JSON.parse(value || "{}");
  return (value ?? {}) as RequestBody;
}
const adapter: AxiosAdapter = async (config) => {
  if (config.signal?.aborted) throw new CanceledError("Prévia cancelada");
  const url = new URL(config.url || "/", config.baseURL || origin);
  if (config.params)
    for (const [key, value] of Object.entries(config.params))
      url.searchParams.set(key, String(value));
  const method = (config.method || "GET").toUpperCase();
  const result =
    url.origin === origin
      ? respond(method, url, payload(config.data))
      : { status: 501, data: { message: "Rede externa bloqueada nesta prévia." } };
  requests.push({ method, path: url.pathname, simulated: result.status !== 501 });
  const response = {
    ...result,
    statusText: result.status < 400 ? "OK" : "Preview request blocked",
    headers: {},
    config,
  };
  if (result.status >= 400)
    throw new AxiosError(
      "Consulta simulada indisponível",
      "ERR_BAD_RESPONSE",
      config,
      undefined,
      response,
    );
  return response;
};
axios.defaults.adapter = adapter;
window.fetch = async (input, init) => {
  const request = input instanceof Request ? input : null;
  const url = new URL(request?.url || String(input), origin);
  const method = (init?.method || request?.method || "GET").toUpperCase();
  const raw = init?.body ?? (request ? await request.clone().text() : "{}");
  const result =
    url.origin === origin
      ? respond(method, url, payload(raw))
      : { status: 501, data: { message: "Rede externa bloqueada nesta prévia." } };
  requests.push({ method, path: url.pathname, simulated: result.status !== 501 });
  return new Response(JSON.stringify(result.data), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
};
Object.assign(window, { monitorPreview: { fictional: true, requests: () => [...requests] } });
