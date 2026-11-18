import axios from "axios";
import type {
  EntityOption,
  EntityOptionsLoader,
} from "@/components/reports/SearchableEntityFilter";
import { defaultReportPeriod, validateReportPeriod, type ReportPeriod } from "./filters";

export const callAbcMetrics = {
  outbound: "Ligações efetuadas",
  contacts: "Contatos",
  inbound: "Ligações recebidas",
  sales: "Vendas",
};

export const callAbcGroups = {
  customer: "Cliente por campanha",
  campaignType: "Tipo de campanha",
  campaign: "Campanha",
};

export const callAbcCampaignTypes: Record<string, string> = {
  ATIVOS: "Ativos",
  INAT_R: "Inativos recentes",
  INAT_A: "Inativos antigos",
  PROSPE: "Prospects",
};

type Counts = Record<keyof typeof callAbcMetrics, number>;

interface CallAbcRow extends Counts {
  customerId?: number;
  customer?: string | null;
  erp?: string | null;
  segment?: string | null;
  campaignId?: number;
  campaign?: string | null;
  campaignType: string | null;
}

export interface CallAbcResult {
  rows: CallAbcRow[];
  totals: Counts;
}

export interface CallAbcFilters {
  period: ReportPeriod;
  operator: EntityOption | null;
  campaign: EntityOption | null;
  campaignType: string;
  group: keyof typeof callAbcGroups;
  metric: keyof typeof callAbcMetrics;
  limit: string;
  brands: EntityOption[];
}

export function defaultCallAbcFilters(): CallAbcFilters {
  return {
    period: defaultReportPeriod(),
    operator: null,
    campaign: null,
    campaignType: "",
    group: "customer",
    metric: "outbound",
    limit: "10",
    brands: [],
  };
}

export function validateCallAbcFilters(filters: CallAbcFilters) {
  const periodError = validateReportPeriod(filters.period);
  if (periodError) return periodError;
  if (!/^\d{1,4}$/.test(filters.limit) || +filters.limit < 1 || +filters.limit > 1000)
    return "Informe um limite entre 1 e 1.000 registros.";
  if (filters.brands.length > 50) return "Selecione até 50 marcas.";
  return null;
}

const BASE = `${process.env.NEXT_PUBLIC_REPORTS_URL || "http://localhost:8006"}/api/reports/call-abc`;

export function callAbcApi(instance: string, token: string) {
  const headers = {
    Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}`,
    "x-crm-instance": instance,
  };
  async function get<T>(suffix: string, params: Record<string, unknown>, signal: AbortSignal) {
    try {
      const response = await axios.get<{ data: T }>(BASE + suffix, { headers, params, signal });
      return response.data.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      throw new Error(message || "Não foi possível consultar a Curva ABC de ligações.");
    }
  }
  return {
    execute(filters: CallAbcFilters, signal: AbortSignal) {
      return get<CallAbcResult>(
        "",
        {
          ...filters.period,
          operatorId: filters.operator?.id,
          campaignId: filters.campaign?.id,
          campaignType: filters.campaignType || undefined,
          group: filters.group,
          metric: filters.metric,
          limit: filters.limit,
          brandIds: filters.brands.length
            ? filters.brands.map((brand) => brand.id).join(",")
            : undefined,
        },
        signal,
      );
    },
    brandsEnabled: (signal: AbortSignal) => get<boolean>("/brands-enabled", {}, signal),
    options(kind: "campaign" | "brand"): EntityOptionsLoader {
      return (search, page, signal) =>
        get<{ options: EntityOption[]; hasMore: boolean }>(
          "/options",
          { kind, search, page },
          signal,
        );
    },
  };
}
