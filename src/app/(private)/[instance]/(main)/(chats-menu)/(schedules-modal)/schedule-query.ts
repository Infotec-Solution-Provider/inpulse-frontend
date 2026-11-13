import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { MyScheduleFilters, UnifiedSchedule } from "@/lib/sdk-local";

dayjs.extend(utc);
dayjs.extend(timezone);
export const SCHEDULE_TIME_ZONE = "America/Sao_Paulo";
export const periodOptions = [
  { value: "all", label: "Todos pendentes" },
  { value: "overdue", label: "Atrasados" },
  { value: "today", label: "Hoje" },
  { value: "next7", label: "Próximos 7 dias" },
  { value: "custom", label: "Personalizado" },
] as const;
export type SchedulePeriod = (typeof periodOptions)[number]["value"];
export interface ScheduleFilters {
  search: string;
  period: SchedulePeriod;
  dateFrom: string;
  dateTo: string;
  channels: string;
  sortOrder: "asc" | "desc";
  customerCampaignIds: string[];
  profileLevel: string;
  interactionLevel: string;
  purchaseLevel: string;
  ageLevel: string;
  purchaseInterestLevel: string;
  repurchaseStatuses: string[];
}
export interface ScheduleQuery {
  filters: ScheduleFilters;
  page: number;
  perPage: number;
}
export const commercialOptions = {
  profileLevel: {
    label: "Perfil do cliente",
    options: [
      ["potencial_de_compra", "Potencial de compra"],
      ["consolidado", "Consolidado"],
      ["precisa_mais_interacao", "Precisa mais interação"],
      ["em_observacao", "Em observação"],
    ],
  },
  interactionLevel: {
    label: "Interação",
    options: [
      ["sem_interacao", "Sem interação"],
      ["pouca_interacao", "Pouca interação"],
      ["interacao_media", "Interação média"],
      ["interacao_alta", "Interação alta"],
    ],
  },
  purchaseLevel: {
    label: "Compras",
    options: [
      ["sem_compras", "Sem compras"],
      ["poucas_compras", "Poucas compras"],
      ["compras_medias", "Compras médias"],
      ["muitas_compras", "Muitas compras"],
    ],
  },
  ageLevel: {
    label: "Tempo de cadastro",
    options: [
      ["sem_data_cadastro", "Sem data de cadastro"],
      ["cliente_novo", "Cliente novo"],
      ["ate_6_meses", "Até 6 meses"],
      ["ate_12_meses", "Até 12 meses"],
      ["mais_de_12_meses", "Mais de 12 meses"],
    ],
  },
  purchaseInterestLevel: {
    label: "Interesse de compra",
    options: [
      ["nao_analisado", "Não analisado"],
      ["baixo_interesse", "Baixo interesse"],
      ["interesse_moderado", "Interesse moderado"],
      ["alto_interesse", "Alto interesse"],
      ["pronto_para_compra", "Pronto para compra"],
    ],
  },
} as const;
export const repurchaseOptions = [
  ["green", "Pronto para comprar"],
  ["yellow", "Próximo da recompra"],
  ["red", "Longe da recompra"],
  ["neutral", "Sem histórico suficiente"],
] as const;
export function emptyScheduleFilters(): ScheduleFilters {
  return {
    search: "",
    period: "all",
    dateFrom: "",
    dateTo: "",
    channels: "",
    sortOrder: "asc",
    customerCampaignIds: [],
    profileLevel: "",
    interactionLevel: "",
    purchaseLevel: "",
    ageLevel: "",
    purchaseInterestLevel: "",
    repurchaseStatuses: [],
  };
}
export const initialScheduleQuery = (): ScheduleQuery => ({
  filters: emptyScheduleFilters(),
  page: 1,
  perPage: 10,
});

function validDay(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function validateScheduleFilters(filters: ScheduleFilters): string | null {
  if (filters.search.trim().length > 200) return "Use até 200 caracteres na busca.";
  if (filters.period !== "custom") return null;
  if (!validDay(filters.dateFrom) || !validDay(filters.dateTo))
    return "Informe as duas datas válidas do período.";
  if (filters.dateFrom > filters.dateTo)
    return "A data final deve ser igual ou posterior à inicial.";
  return null;
}
export function serializeScheduleQuery(query: ScheduleQuery): MyScheduleFilters {
  const f = query.filters;
  const error = validateScheduleFilters(f);
  if (error) throw new Error(error);
  return {
    page: String(query.page),
    perPage: String(query.perPage),
    period: f.period,
    sortOrder: f.sortOrder,
    ...(f.search.trim() ? { search: f.search.trim() } : {}),
    ...(f.channels ? { channels: f.channels } : {}),
    ...(f.period === "custom"
      ? {
          scheduledFrom: dayjs.tz(`${f.dateFrom}T00:00:00`, SCHEDULE_TIME_ZONE).toISOString(),
          scheduledTo: dayjs
            .tz(
              `${dayjs.utc(`${f.dateTo}T00:00:00Z`).add(1, "day").format("YYYY-MM-DD")}T00:00:00`,
              SCHEDULE_TIME_ZONE,
            )
            .toISOString(),
        }
      : {}),
    ...(f.customerCampaignIds.length
      ? { customerCampaignIds: f.customerCampaignIds.join(",") }
      : {}),
    ...(f.repurchaseStatuses.length ? { repurchaseStatuses: f.repurchaseStatuses.join(",") } : {}),
    ...(f.profileLevel
      ? { profileLevel: f.profileLevel as MyScheduleFilters["profileLevel"] }
      : {}),
    ...(f.interactionLevel
      ? { interactionLevel: f.interactionLevel as MyScheduleFilters["interactionLevel"] }
      : {}),
    ...(f.purchaseLevel
      ? { purchaseLevel: f.purchaseLevel as MyScheduleFilters["purchaseLevel"] }
      : {}),
    ...(f.ageLevel ? { ageLevel: f.ageLevel as MyScheduleFilters["ageLevel"] } : {}),
    ...(f.purchaseInterestLevel
      ? {
          purchaseInterestLevel:
            f.purchaseInterestLevel as MyScheduleFilters["purchaseInterestLevel"],
        }
      : {}),
  };
}
export function formatScheduleDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: SCHEDULE_TIME_ZONE,
  }).format(date);
}
export function scheduleTimeLabel(
  schedule: Pick<UnifiedSchedule, "scheduleAt">,
  referenceAt?: string,
): string {
  const at = new Date(schedule.scheduleAt).getTime(),
    reference = referenceAt ? new Date(referenceAt).getTime() : NaN;
  if (!Number.isFinite(at) || !Number.isFinite(reference)) return "Horário a confirmar";
  if (at < reference) return "Atrasado";
  const day = (ms: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: SCHEDULE_TIME_ZONE }).format(ms);
  return day(at) === day(reference) ? "Hoje" : "Futuro";
}
