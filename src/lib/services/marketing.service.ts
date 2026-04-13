import axios from "axios";

const MARKETING_URL = process.env["NEXT_PUBLIC_MARKETING_URL"] || "http://localhost:8007";

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
    const response = await axios.get<CampaignListResponse>(
      this.base,
      {
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
      },
    );

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
    const response = await axios.post<{ data: { created: number; totalEligible: number; totalExisting: number } }>(
      `${this.base}/${campaignId}/dispatches/prepare`,
    );

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

export default new MarketingService();
