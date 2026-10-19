import ApiClient from "../sdk-local/api-client";
import { monitorApiFilters } from "./monitor-api-filters";
import type {
  MonitorFiltersState,
  MonitorSearchResult,
  MonitorSummary,
} from "@/app/(private)/[instance]/monitor/types";

export class MonitorService extends ApiClient {
  public async channels(
    params: { page: number; search: string },
    signal: AbortSignal,
  ): Promise<MonitorChannelPage> {
    const response = await this.ax.get<{ data: MonitorChannelPage }>(
      "/api/whatsapp/monitor/channels",
      { params, signal },
    );
    const result = response.data.data;
    if (
      !result ||
      !Array.isArray(result.items) ||
      !Number.isSafeInteger(result.totalCount) ||
      result.totalCount < 0 ||
      result.items.some(
        (item) =>
          !Number.isSafeInteger(item.id) ||
          item.id < 1 ||
          typeof item.name !== "string" ||
          (item.phone !== null && typeof item.phone !== "string") ||
          typeof item.isActive !== "boolean",
      )
    )
      throw new Error("Resposta inválida dos canais da monitoria.");
    return result;
  }
  public async search(
    params: { page: number; pageSize: number; filters: MonitorFiltersState },
    signal: AbortSignal,
  ): Promise<MonitorSearchResult> {
    const response = await this.ax.post<{ data: MonitorSearchResult }>(
      "/api/whatsapp/monitor/search",
      { ...params, filters: monitorApiFilters(params.filters) },
      { signal },
    );
    const result = response.data.data;
    if (
      !result ||
      !Array.isArray(result.items) ||
      !Number.isSafeInteger(result.totalCount) ||
      result.totalCount < 0
    ) {
      throw new Error("Resposta inválida da monitoria.");
    }
    return result;
  }

  public async summary(filters: MonitorFiltersState, signal: AbortSignal): Promise<MonitorSummary> {
    const response = await this.ax.post<{ data: MonitorSummary }>(
      "/api/whatsapp/monitor/summary",
      {
        filters: monitorApiFilters({ ...filters, operationalStatus: "all" }),
      },
      { signal },
    );
    const result = response.data.data;
    if (
      !result ||
      ![
        result.inProgress,
        result.waitingAgent,
        result.waitingCustomer,
        result.unread,
        result.overdue,
        result.scheduled,
      ].every((value) => Number.isSafeInteger(value) && value >= 0)
    ) {
      throw new Error("Resposta inválida dos indicadores da monitoria.");
    }
    return result;
  }
}

export interface MonitorChannelOption {
  id: number;
  name: string;
  phone: string | null;
  isActive: boolean;
}
export interface MonitorChannelPage {
  items: MonitorChannelOption[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ApiClient installs the shared auth coordinator, including token refresh and the read limiter.
const monitorService = new MonitorService(
  process.env.NEXT_PUBLIC_WHATSAPP_URL || "http://localhost:8005",
);
export default monitorService;
