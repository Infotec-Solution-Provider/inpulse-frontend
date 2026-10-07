import ApiClient from "../sdk-local/api-client";
import { telephonyApiFilters } from "@/app/(private)/[instance]/monitor/telephony/api-filters";
import type {
  TelephonyMonitorFilters,
  TelephonyMonitorResult,
  TelephonyLookupParams,
  TelephonyLookupResult,
} from "@/app/(private)/[instance]/monitor/telephony/types";

export class TelephonyMonitorService extends ApiClient {
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
