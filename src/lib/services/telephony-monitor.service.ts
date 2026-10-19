import ApiClient from "../sdk-local/api-client";
import { telephonyApiFilters } from "@/app/(private)/[instance]/monitor/telephony/api-filters";
import { civilScheduleValue } from "@/app/(private)/[instance]/monitor/telephony/schedule-edit";
import type { AuthRequestConfig } from "@/lib/auth-session";
import type {
  TelephonyMonitorFilters,
  TelephonyMonitorResult,
  TelephonyLookupParams,
  TelephonyLookupResult,
  TelephonyScheduleDetail,
  TelephonySchedulePatch,
  TelephonyScheduleSaveResult,
  TelephonyScheduleReceipt,
} from "@/app/(private)/[instance]/monitor/telephony/types";

function scheduleDetail(value: TelephonyScheduleDetail): TelephonyScheduleDetail {
  if (
    !value ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0 ||
    !value.customer ||
    !Number.isSafeInteger(value.customer.id) ||
    typeof value.customer.name !== "string" ||
    (value.campaign !== null &&
      (!value.campaign ||
        !Number.isSafeInteger(value.campaign.id) ||
        (value.campaign.name !== null && typeof value.campaign.name !== "string"))) ||
    (value.scheduledAt !== null &&
      (typeof value.scheduledAt !== "string" ||
        civilScheduleValue(value.scheduledAt) !== value.scheduledAt)) ||
    (value.operatorId !== null &&
      (!Number.isSafeInteger(value.operatorId) || value.operatorId <= 0)) ||
    (value.operatorName !== null && typeof value.operatorName !== "string") ||
    typeof value.version !== "string" ||
    !value.version ||
    typeof value.editable !== "boolean" ||
    (value.blockedReason !== null && typeof value.blockedReason !== "string") ||
    !value.capabilities ||
    typeof value.capabilities.priority !== "boolean" ||
    typeof value.capabilities.validity !== "boolean"
  )
    throw new Error("Resposta inválida do agendamento.");
  return value;
}

export class TelephonyMonitorService extends ApiClient {
  public async schedule(id: number, signal: AbortSignal): Promise<TelephonyScheduleDetail> {
    const response = await this.ax.get<{ data: TelephonyScheduleDetail }>(
      `/api/customers/monitor/telephony/schedules/${id}`,
      { signal },
    );
    const detail = scheduleDetail(response.data.data);
    if (detail.id !== id) throw new Error("Resposta de outro agendamento.");
    return detail;
  }

  public async scheduleOperators(
    id: number,
    params: { search: string; page: number; pageSize: number },
    signal: AbortSignal,
  ): Promise<TelephonyLookupResult> {
    const response = await this.ax.get<{ data: TelephonyLookupResult }>(
      `/api/customers/monitor/telephony/schedules/${id}/operators`,
      { params, signal },
    );
    const result = response.data.data;
    if (
      !result ||
      !Array.isArray(result.items) ||
      !Number.isSafeInteger(result.totalCount) ||
      result.totalCount < 0 ||
      !result.items.every(
        (item) =>
          typeof item.id === "string" &&
          /^[1-9]\d*$/.test(item.id) &&
          Number.isSafeInteger(Number(item.id)) &&
          typeof item.label === "string",
      )
    )
      throw new Error("Resposta inválida dos operadores elegíveis.");
    return result;
  }

  public async updateSchedule(
    id: number,
    patch: TelephonySchedulePatch,
    signal: AbortSignal,
  ): Promise<TelephonyScheduleSaveResult> {
    // A mutation is never automatically repeated, even by the 401 interceptor.
    const config: Partial<AuthRequestConfig> = { signal, skipAuthRefresh: true };
    const response = await this.ax.patch<TelephonyScheduleSaveResult>(
      `/api/customers/monitor/telephony/schedules/${id}`,
      patch,
      config,
    );
    const result = response.data;
    if (
      !result ||
      !["applied", "replayed"].includes(result.status) ||
      result.operationId !== patch.operationId ||
      scheduleDetail(result.data).id !== id
    )
      throw new Error("Não foi possível confirmar a gravação do agendamento.");
    return result;
  }

  public async scheduleReceipt(
    id: number,
    operationId: string,
    signal: AbortSignal,
  ): Promise<TelephonyScheduleReceipt> {
    const response = await this.ax.get<{ data: TelephonyScheduleReceipt }>(
      `/api/customers/monitor/telephony/schedules/${id}/operations/${encodeURIComponent(operationId)}`,
      { signal },
    );
    const result = response.data.data;
    if (
      !result ||
      (result.status !== "not_confirmed" &&
        (result.status !== "applied" ||
          (result.detail !== undefined && scheduleDetail(result.detail).id !== id)))
    )
      throw new Error("Resposta inválida da verificação de gravação.");
    return result;
  }

  public async search(
    params: { page: number; pageSize: number; filters: TelephonyMonitorFilters },
    signal: AbortSignal,
  ): Promise<TelephonyMonitorResult> {
    const response = await this.ax.post<{ data: TelephonyMonitorResult }>(
      "/api/customers/monitor/telephony/search",
      { ...params, filters: telephonyApiFilters(params.filters) },
      { signal },
    );
    const result = response.data.data;
    if (
      !result ||
      !Array.isArray(result.items) ||
      !Number.isSafeInteger(result.totalCount) ||
      result.totalCount < 0 ||
      !result.summary ||
      !Number.isSafeInteger(result.summary.customerCount) ||
      result.summary.customerCount < 0 ||
      (result.summary.overdueCount !== null &&
        (!Number.isSafeInteger(result.summary.overdueCount) || result.summary.overdueCount < 0))
    )
      throw new Error("Resposta inválida da monitoria de telefonia.");
    return result;
  }

  public async options(
    params: TelephonyLookupParams,
    signal: AbortSignal,
  ): Promise<TelephonyLookupResult> {
    const response = await this.ax.post<{ data: TelephonyLookupResult }>(
      "/api/customers/monitor/telephony/options",
      params,
      { signal },
    );
    const result = response.data.data;
    if (
      !result ||
      !Array.isArray(result.items) ||
      !Number.isSafeInteger(result.totalCount) ||
      result.totalCount < 0 ||
      !result.items.every((item) => typeof item.id === "string" && typeof item.label === "string")
    )
      throw new Error("Resposta inválida das opções de filtro.");
    return result;
  }
}

const telephonyMonitorService = new TelephonyMonitorService(
  process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002",
);
export default telephonyMonitorService;
