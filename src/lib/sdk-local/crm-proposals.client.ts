import ApiClient from "./api-client";
import { crmMutationConfig, type CrmRequestContext } from "./crm-request-context";
export interface Proposal {
  id: number;
  scheduleId: number;
  value: string;
  status: string;
  closed: number;
  version: string;
  customerId: number;
  customerName: string | null;
  erp: string | null;
  campaignName: string | null;
  operatorName: string | null;
  calledAt: string | null;
  resultName: string | null;
}
export interface ProposalFilters {
  from: string;
  to: string;
  customerId?: string;
  erp?: string;
  operatorId?: string;
  campaignId?: string;
  status?: string;
  page?: number;
}
export interface ProposalList {
  data: Proposal[];
  hasMore: boolean;
  page: number;
  capability: { writable: boolean; reason: string | null };
}
export interface ProposalEvent {
  operation_id: string;
  actor_id: number;
  action: string;
  old_value: string | null;
  new_value: string | null;
  old_status: string | null;
  new_status: string | null;
  reason: string;
  created_at: string;
}
export default class CrmProposalsClient extends ApiClient {
  private readonly context: Readonly<CrmRequestContext>;
  constructor(baseURL: string, context: CrmRequestContext) {
    super(baseURL);
    this.context = Object.freeze({ ...context });
  }
  async list(filters: ProposalFilters) {
    return (
      await this.ax.get<{ data: ProposalList }>("/api/crm-proposals", {
        ...crmMutationConfig(this.context),
        params: filters,
      })
    ).data.data;
  }
  async forSchedule(id: number) {
    return (
      await this.ax.get<{ data: Proposal[] }>(
        `/api/crm-proposals/for-schedule/${id}`,
        crmMutationConfig(this.context),
      )
    ).data.data;
  }
  async results() {
    return (
      await this.ax.get<{
        data: {
          id: number;
          name: string;
          COD_ACAO: number | null;
          PROPOSTA: string | null;
          CANCELAPROPOSTA: string | null;
        }[];
      }>("/api/crm-proposals/results", crmMutationConfig(this.context))
    ).data.data;
  }
  async history(id: number) {
    return (
      await this.ax.get<{ data: ProposalEvent[] }>(
        `/api/crm-proposals/${id}/history`,
        crmMutationConfig(this.context),
      )
    ).data.data;
  }
  async change(
    id: number,
    body: {
      operationId: string;
      version: string;
      action: "UPDATE" | "CANCEL" | "DELETE";
      value?: string;
      reason: string;
    },
  ) {
    return (
      await this.ax.post(`/api/crm-proposals/${id}/changes`, body, crmMutationConfig(this.context))
    ).data;
  }
  async report(baseURL: string, filters: ProposalFilters) {
    // Same immutable authorization snapshot; no token is placed in a URL.
    return (
      await this.ax.get<string>(`${baseURL.replace(/\/$/, "")}/api/reports/crm-proposals`, {
        ...crmMutationConfig(this.context),
        params: filters,
        responseType: "text",
      })
    ).data;
  }
}
