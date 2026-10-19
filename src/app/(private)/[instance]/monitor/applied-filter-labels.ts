import type { MonitorFiltersState } from "./types";

const quickLabels: Record<string, string> = {
  in_progress: "Em atendimento",
  waiting_agent: "Aguardando atendente",
  waiting_customer: "Aguardando cliente",
  unread: "Não lidas",
  overdue: "Fora do SLA",
  scheduled: "Agendamentos",
};
const categoryLabels = {
  showCustomerChats: "Clientes",
  showInternalChats: "Internas",
  showInternalGroups: "Grupos",
  showSchedules: "Agendamentos",
};

export function appliedFilterLabels(
  filters: MonitorFiltersState,
  userName: (id: number) => string,
  channelName: (id: number) => string = (id) => `#${id}`,
) {
  const items: { key: keyof MonitorFiltersState; label: string }[] = [];
  const add = (key: keyof MonitorFiltersState, label: string) => items.push({ key, label });
  if (filters.searchText.trim()) add("searchText", `Busca: ${filters.searchText.trim()}`);
  if (filters.operationalStatus !== "all")
    add("operationalStatus", `Filtro rápido: ${quickLabels[filters.operationalStatus]}`);
  if (filters.user !== "all") add("user", `Atendente: ${userName(filters.user)}`);
  if (filters.lastMessageChannelId !== "all")
    add("lastMessageChannelId", `Canal: ${channelName(filters.lastMessageChannelId)}`);
  if (filters.scheduledFor !== "all")
    add("scheduledFor", `Agendado para: ${userName(filters.scheduledFor)}`);
  if (filters.scheduledBy !== "all")
    add("scheduledBy", `Agendado por: ${userName(filters.scheduledBy)}`);
  if (filters.showBots) add("showBots", "Incluindo bots");
  if (!filters.showOngoing) add("showOngoing", "Sem conversas em andamento");
  if (!filters.showFinished) add("showFinished", "Sem finalizados");
  if (filters.showOnlyScheduled) add("showOnlyScheduled", "Apenas agendados");
  if (filters.showUnreadOnly) add("showUnreadOnly", "Apenas não lidas");
  if (filters.showPendingResponseOnly) add("showPendingResponseOnly", "Apenas sem resposta");
  if (Object.values(filters.categories).some((value) => !value)) {
    const enabled = (Object.keys(categoryLabels) as (keyof typeof categoryLabels)[])
      .filter((key) => filters.categories[key])
      .map((key) => categoryLabels[key]);
    add("categories", `Categorias: ${enabled.join(", ") || "nenhuma"}`);
  }
  for (const [key, label] of [
    ["startedAt", "Início"],
    ["finishedAt", "Finalização"],
    ["scheduledAt", "Criado em"],
    ["scheduledTo", "Agendado para"],
  ] as const) {
    const range = filters[key];
    if (range.from || range.to)
      add(key, `${label}: ${range.from || "qualquer data"} a ${range.to || "qualquer data"}`);
  }
  return items;
}
