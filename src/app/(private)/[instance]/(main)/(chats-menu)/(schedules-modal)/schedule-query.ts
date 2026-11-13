import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { MyScheduleFilters, UnifiedSchedule } from "@/lib/sdk-local";
import {
  createEmptyCustomerBusinessFilters,
  serializeCustomerBusinessFilters,
  type CustomerBusinessFilters,
} from "@/lib/types/customer-business-filters";

dayjs.extend(utc);
dayjs.extend(timezone);
export const SCHEDULE_TIME_ZONE = "America/Sao_Paulo";
export const scheduleQueryKey = (scope: string) => `operator-schedules:v2:${scope}`;
export const periodOptions = [
  { value: "all", label: "Todos pendentes" },
  { value: "overdue", label: "Atrasados" },
  { value: "today", label: "Hoje" },
  { value: "next7", label: "Próximos 7 dias" },
  { value: "custom", label: "Personalizado" },
] as const;
export const customerBasicFields = [
  "CODIGO",
  "CPF_CNPJ",
  "COD_ERP",
  "CIDADE",
  "ATIVO",
  "PESSOA",
] as const;
export type ScheduleCustomerFilters = Record<(typeof customerBasicFields)[number], string>;
export type SchedulePeriod = (typeof periodOptions)[number]["value"];
export interface ScheduleFilters {
  search: string;
  period: SchedulePeriod;
  dateFrom: string;
  dateTo: string;
  channels: string;
  sortOrder: "asc" | "desc";
  customerCampaignIds: string[];
  customer: ScheduleCustomerFilters;
  business: CustomerBusinessFilters;
}
export interface ScheduleQuery {
  filters: ScheduleFilters;
  page: number;
  perPage: number;
}
export function emptyScheduleFilters(): ScheduleFilters {
  return {
    search: "",
    period: "all",
    dateFrom: "",
    dateTo: "",
    channels: "",
    sortOrder: "asc",
    customerCampaignIds: [],
    customer: { CODIGO: "", CPF_CNPJ: "", COD_ERP: "", CIDADE: "", ATIVO: "", PESSOA: "" },
    business: createEmptyCustomerBusinessFilters(),
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
function validateRange(from: string, to: string, label: string): string | null {
  if ((from && !validDay(from)) || (to && !validDay(to)))
    return `Informe datas válidas de ${label}.`;
  if (from && to && from > to)
    return `A data final de ${label} deve ser igual ou posterior à inicial.`;
  return null;
}
export function validateScheduleFilters(filters: ScheduleFilters): string | null {
  if (filters.search.trim().length > 200) return "Use até 200 caracteres na busca.";
  if (filters.period === "custom") {
    if (!validDay(filters.dateFrom) || !validDay(filters.dateTo))
      return "Informe as duas datas válidas do período do agendamento.";
    if (filters.dateFrom > filters.dateTo)
      return "A data final do agendamento deve ser igual ou posterior à inicial.";
  }
  if (filters.customer.CODIGO.trim() && !/^-?\d+$/.test(filters.customer.CODIGO.trim()))
    return "Informe um código do cliente com dígitos.";
  const b = filters.business;
  if (b.phone.trim() && b.phone.replace(/\D/g, "").length < 3)
    return "Informe pelo menos três dígitos no telefone do cliente.";
  for (const value of [
    b.phone,
    b.email,
    filters.customer.CPF_CNPJ,
    filters.customer.COD_ERP,
    filters.customer.CIDADE,
  ]) {
    if (value.trim().length > 200) return "Use até 200 caracteres em cada filtro de cliente.";
  }
  for (const values of [
    b.segmentIds,
    b.loyaltyOperatorIds,
    b.groupIds,
    b.originIds,
    b.mediaIds,
    b.brandIds,
    b.unitIds,
    b.positionIds,
  ]) {
    if (
      values.length > 100 ||
      values.some((id) => !Number.isInteger(id) || id < -2147483648 || id > 2147483647)
    )
      return "Selecione até 100 opções válidas por filtro.";
  }
  return (
    validateRange(b.registeredFrom, b.registeredTo, "cadastro") ||
    (b.purchaseStatus !== "without_purchases"
      ? validateRange(b.purchaseFrom, b.purchaseTo, "compra")
      : null)
  );
}
export function serializeScheduleQuery(query: ScheduleQuery): MyScheduleFilters {
  const f = query.filters;
  const error = validateScheduleFilters(f);
  if (error) throw new Error(error);
  return {
    ...Object.fromEntries(
      customerBasicFields
        .filter((key) => f.customer[key].trim())
        .map((key) => [key, f.customer[key].trim()]),
    ),
    ...serializeCustomerBusinessFilters({ ...f.business, campaignIds: [] }),
    page: String(query.page),
    perPage: String(query.perPage),
    view: "crm",
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
