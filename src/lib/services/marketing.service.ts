import axios from "axios";

export const MARKETING_URL = process.env["NEXT_PUBLIC_MARKETING_URL"] || "http://localhost:8007";
export const MARKETING_BASE_URL = MARKETING_URL;

type CampaignStatus =
  | "DRAFT"
  | "READY"
  | "SCHEDULED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

type DispatchStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "CANCELLED"
  | "OPTED_OUT";

export interface DateRangeFilters {
  startDate: string;
  endDate: string;
  operatorId?: number | string;
  originId?: number | string;
  channel?: string;
  groupBy?: "day" | "month";
  compareStartDate?: string;
  compareEndDate?: string;
  situacao?: string;
}

export interface MarketingCampaign {
  id: number;
  name: string;
  campaignDefinitionId: number | null;
  campaignDefinitionName: string | null;
  description: string | null;
  status: CampaignStatus;
  senderClientId?: number | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  launchedAt: string | null;
  scheduleRule?: {
    startAt: string | null;
    endAt: string | null;
    sendMode: "IMMEDIATE" | "ONE_TIME" | "RECURRING";
    allowedWeekdaysJson?: unknown;
    timeRangesJson?: unknown;
  } | null;
}

export interface CampaignListResponse {
  data: MarketingCampaign[];
  page: { totalRows: number; current: number };
}

export interface MonitoringSummary {
  audience: {
    totalSnapshots: number;
    eligibleSnapshots: number;
  };
  dispatches: Record<DispatchStatus, number>;
  lastAttempt: {
    startedAt: string;
    finishedAt: string;
    outcome: string;
  } | null;
}

export interface CampaignDispatchRow {
  id: number;
  status: DispatchStatus;
  updatedAt: string;
  lastError: string | null;
  audienceSnapshot?: {
    contactName: string | null;
    phoneE164: string | null;
    customerName: string | null;
  };
}

export interface LeadOriginQualityRow {
  originId: number | null;
  originName: string;
  leadsCount: number;
  customersWithPurchases: number;
  purchasesCount: number;
  convertedProposalsCount: number;
  revenue: number;
  averageTicket: number;
  revenuePerLead: number;
  conversionRate: number;
  qualityScore: number;
  qualityLabel: "Alta" | "Media" | "Baixa";
}

export interface LeadOriginQualityResult {
  periodStart: string;
  periodEnd: string;
  summary: {
    totalLeads: number;
    totalCustomersWithPurchases: number;
    totalPurchases: number;
    totalConvertedProposals: number;
    totalRevenue: number;
    averageTicket: number;
    revenuePerLead: number;
    conversionRate: number;
    bestOrigin: string | null;
  };
  origins: LeadOriginQualityRow[];
}

export interface LostReasonsResult {
  periodStart: string;
  periodEnd: string;
  summary: {
    totalFinishedAttendances: number;
    totalLosses: number;
    lossRate: number;
    topReason: string | null;
    operatorsImpacted: number;
  };
  byReason: Array<{ resultId: number | null; resultName: string; lossesCount: number; share: number }>;
  byOperator: Array<{ operatorName: string; lossesCount: number; share: number }>;
  byChannel: Array<{ channel: string; lossesCount: number; share: number }>;
  dailySeries: Array<{ date: string; lossesCount: number }>;
}

export interface FinancialSummary {
  totalCompras: number;
  totalFaturamento: number;
  ticketMedio: number;
}

export interface FinancialByOperator {
  operadorId: number | null;
  operadorNome: string | null;
  totalCompras: number;
  totalFaturamento: number;
  ticketMedio: number;
  propostasConvertidas: number;
}

export interface FinancialByPeriod {
  periodo: string;
  totalCompras: number;
  totalFaturamento: number;
}

export interface FinancialByPeriodByOperator {
  periodo: string;
  operadorId: number | null;
  operadorNome: string | null;
  totalVendas: number;
  totalFaturamento: number;
}

export interface FinancialByCategory {
  tipo?: string | null;
  formaPgto?: string | null;
  totalCompras: number;
  totalFaturamento: number;
}

export interface FinancialPropostas {
  comprasDePropostas: number;
  faturamentoDePropostas: number;
  taxaConversao: number;
}

export interface FinancialGeneralGoal {
  id: number;
  instance: string;
  year: number;
  month: number;
  targetRevenue: number | null;
  targetSalesCount: number | null;
  targetAvgTicket: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialOperatorGoal extends FinancialGeneralGoal {
  operadorId: number;
}

export interface FinancialGoalsResult {
  general: FinancialGeneralGoal | null;
  operators: FinancialOperatorGoal[];
}

export interface FinancialDashboardResult {
  summary: FinancialSummary;
  byOperator: FinancialByOperator[];
  byPeriod: FinancialByPeriod[];
  byPeriodByOperator: FinancialByPeriodByOperator[];
  byTipo: FinancialByCategory[];
  byFormaPgto: FinancialByCategory[];
  propostas: FinancialPropostas;
  meta: {
    general: FinancialGeneralGoal[];
    operators: FinancialOperatorGoal[];
  };
  comparison?: FinancialSummary;
}

export type FinancialDashboardData = FinancialDashboardResult;
export type GoalsForMonthData = FinancialGoalsResult;

export interface FinancialGoalPayload {
  year: number;
  month: number;
  operadorId?: number;
  targetRevenue: number | null;
  targetSalesCount: number | null;
  targetAvgTicket: number | null;
}

export type GoalPayload = FinancialGoalPayload;

interface ApiResponse<TData> {
  message: string;
  data: TData;
}

type MarketingParams = DateRangeFilters | Record<string, string | number | null | undefined>;

const authHeaders = (token: string | null | undefined) =>
  token ? { authorization: `Bearer ${token}` } : undefined;

const endpoint = (path: string) =>
  `${MARKETING_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

export async function fetchMarketing<TData>(
  path: string,
  token: string | null | undefined,
  params?: MarketingParams,
) {
  const response = await axios.get<ApiResponse<TData>>(endpoint(path), {
    headers: authHeaders(token),
    params,
  });
  return response.data.data;
}

export async function putMarketing<TData, TPayload extends object>(
  path: string,
  token: string | null | undefined,
  payload: TPayload,
) {
  const response = await axios.put<ApiResponse<TData>>(endpoint(path), payload, {
    headers: authHeaders(token),
  });
  return response.data.data;
}

class MarketingService {
  private readonly base = `${MARKETING_URL}/api/marketing/campaigns`;

  async listCampaigns(params: {
    page?: number;
    perPage?: number;
    campaignId?: number;
    search?: string;
    status?: string;
    senderClientId?: number;
    sendMode?: "IMMEDIATE" | "ONE_TIME" | "RECURRING";
    createdFrom?: string;
    createdTo?: string;
  } = {}) {
    const response = await axios.get<CampaignListResponse>(this.base, {
      params: {
        page: params.page || 1,
        perPage: params.perPage || 12,
        ...(params.campaignId ? { campaignId: params.campaignId } : {}),
        ...(params.search ? { search: params.search } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.senderClientId ? { senderClientId: params.senderClientId } : {}),
        ...(params.sendMode ? { sendMode: params.sendMode } : {}),
        ...(params.createdFrom ? { createdFrom: params.createdFrom } : {}),
        ...(params.createdTo ? { createdTo: params.createdTo } : {}),
      },
    });

    return response.data;
  }

  async createCampaign(payload: {
    name: string;
    campaignDefinitionId?: number;
    campaignDefinitionName?: string;
    description?: string;
    senderClientId?: number;
    content?: {
      messageBody?: string;
      templateName?: string;
      templateLanguage?: string;
    };
    audienceDefinition?: {
      manualIncludeJson?: {
        contactIds?: number[];
      };
      estimatedAudienceCount?: number;
    };
    scheduleRule?: {
      sendMode?: "IMMEDIATE" | "ONE_TIME" | "RECURRING";
      startAt?: string;
      allowedWeekdaysJson?: unknown;
      timeRangesJson?: unknown;
    };
  }) {
    const response = await axios.post<{ data: MarketingCampaign }>(this.base, payload);
    return response.data.data;
  }

  async previewAudience(campaignId: number) {
    const response = await axios.post<{ data: unknown[]; page: { totalRows: number; current: number } }>(
      `${this.base}/${campaignId}/audience/preview`,
      undefined,
      { params: { page: 1, perPage: 20 } },
    );

    return response.data;
  }

  async prepareDispatches(campaignId: number) {
    const response = await axios.post<{
      data: { created: number; totalEligible: number; totalExisting: number };
    }>(`${this.base}/${campaignId}/dispatches/prepare`);

    return response.data.data;
  }

  async launchCampaign(campaignId: number) {
    const response = await axios.post<{ data: MarketingCampaign }>(`${this.base}/${campaignId}/launch`);
    return response.data.data;
  }

  async getMonitoring(campaignId: number) {
    const response = await axios.get<{ data: MonitoringSummary }>(`${this.base}/${campaignId}/monitoring`);
    return response.data.data;
  }

  async getCampaignById(campaignId: number) {
    const response = await axios.get<{ data: MarketingCampaign }>(`${this.base}/${campaignId}`);
    return response.data.data;
  }

  async listDispatches(campaignId: number, page = 1, perPage = 12) {
    const response = await axios.get<{ data: CampaignDispatchRow[]; page: { totalRows: number; current: number } }>(
      `${this.base}/${campaignId}/dispatches`,
      {
        params: { page, perPage },
      },
    );

    return response.data;
  }

  async cancelCampaign(campaignId: number) {
    const response = await axios.post<{ data: MarketingCampaign }>(`${this.base}/${campaignId}/cancel`);
    return response.data.data;
  }
}

export const getLeadOriginQuality = (token: string | null | undefined, filters: DateRangeFilters) =>
  fetchMarketing<LeadOriginQualityResult>("/api/marketing/reports/lead-origin-quality", token, filters);

export const getLostReasons = (token: string | null | undefined, filters: DateRangeFilters) =>
  fetchMarketing<LostReasonsResult>("/api/marketing/reports/lost-reasons", token, filters);

export const getFinancialDashboard = (token: string | null | undefined, filters: DateRangeFilters) =>
  fetchMarketing<FinancialDashboardResult>("/api/marketing/financial/dashboard", token, filters);

export const getFinancialGoals = (token: string | null | undefined, year: number, month: number) =>
  fetchMarketing<FinancialGoalsResult>("/api/marketing/financial/goals", token, { year, month });

export const upsertGeneralGoal = (token: string | null | undefined, payload: FinancialGoalPayload) =>
  putMarketing<FinancialGeneralGoal, FinancialGoalPayload>("/api/marketing/financial/goals/general", token, payload);

export const upsertOperatorGoal = (
  token: string | null | undefined,
  payload: FinancialGoalPayload & { operadorId: number },
) =>
  putMarketing<FinancialOperatorGoal, FinancialGoalPayload & { operadorId: number }>(
    "/api/marketing/financial/goals/operator",
    token,
    payload,
  );

export default new MarketingService();
