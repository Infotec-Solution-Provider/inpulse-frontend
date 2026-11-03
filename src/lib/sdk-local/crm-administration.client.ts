import ApiClient from "./api-client";
import { crmMutationConfig, type CrmRequestContext } from "./crm-request-context";
export interface AdminOption {
  id: number;
  name: string;
  active?: string;
}
export interface AdminCustomer {
  id: number;
  name: string;
  operatorId: number | null;
  campaignId: number | null;
}
export interface BlockRequest {
  id: number;
  blocked: string;
  createdAt: string;
  scheduleId: number;
  customerId: number;
  customerName: string;
  campaignId: number;
  campaignName: string | null;
  result: number | null;
}
export interface AdminPage<T> {
  items: T[];
  hasMore: boolean;
  nextAfter: number | null;
}
export type AdminRow = Record<string, string | number | null>;
export interface AdminPreview {
  mode?: "transfer" | "release";
  customerIds?: number[];
  source?: number;
  destination?: number;
  version?: string;
  executionAvailable: boolean;
  blockedReason: string | null;
  scope?: string;
  preserved?: string[];
  snapshot?: {
    customers: AdminRow[];
    schedules: AdminRow[];
    loyalties: AdminRow[];
    operators: AdminRow[];
  };
  effects: Record<string, AdminRow[] | string>;
  items?: BlockRequest[];
  decision?: "approve" | "reject";
}
export interface TransferRequest {
  operationId: string;
  version: string;
  source: number;
  destination: number;
  customerIds: number[];
}
export interface AdminReceipt {
  operationId: string;
  status: "applied" | "unconfirmed";
  transferId?: number;
  actorId?: number;
  createdAt?: string;
  message?: string;
}
export interface TransferHistory {
  id: number;
  occurredAt: string;
  actorId: number;
  sourceId: number;
  sourceName: string | null;
  destinationId: number;
  destinationName: string | null;
}
/** Credentials and tenant are immutable. No retry or session refresh for administration commands. */
export default class CrmAdministrationClient extends ApiClient {
  private readonly context: Readonly<CrmRequestContext>;
  constructor(baseURL: string, context: CrmRequestContext) {
    super(baseURL);
    this.context = Object.freeze({ ...context });
  }
  private config() {
    return crmMutationConfig(this.context);
  }
  async options(
    kind: "operators" | "campaigns",
    search: string,
    activeOnly = false,
  ): Promise<AdminPage<AdminOption>> {
    return (
      await this.ax.get(`/api/crm-administration/options/${kind}`, {
        ...this.config(),
        params: { search, ...(kind === "operators" ? { activeOnly: String(activeOnly) } : {}) },
      })
    ).data.data;
  }
  async customers(filters: Record<string, string | number>): Promise<AdminPage<AdminCustomer>> {
    return (
      await this.ax.get("/api/crm-administration/customers", { ...this.config(), params: filters })
    ).data.data;
  }
  async blocks(filters: Record<string, string | number>): Promise<AdminPage<BlockRequest>> {
    return (
      await this.ax.get("/api/crm-administration/blocks", { ...this.config(), params: filters })
    ).data.data;
  }
  async preview(
    mode: "transfer" | "release",
    input: { customerIds: number[]; source?: number; destination?: number },
  ): Promise<AdminPreview> {
    return (
      await this.ax.post(
        `/api/crm-administration/${mode === "transfer" ? "transfers" : "releases"}/preview`,
        input,
        this.config(),
      )
    ).data.data;
  }
  async blockPreview(requestIds: number[], decision: "approve" | "reject"): Promise<AdminPreview> {
    return (
      await this.ax.post(
        "/api/crm-administration/blocks/preview",
        { requestIds, decision },
        this.config(),
      )
    ).data.data;
  }
  async transfer(input: TransferRequest): Promise<AdminReceipt> {
    return (await this.ax.post("/api/crm-administration/transfers", input, this.config())).data
      .data;
  }
  async receipt(operationId: string): Promise<AdminReceipt> {
    return (
      await this.ax.get(
        `/api/crm-administration/transfers/operations/${encodeURIComponent(operationId)}`,
        this.config(),
      )
    ).data.data;
  }
  async history(filters: Record<string, string | number>): Promise<AdminPage<TransferHistory>> {
    return (
      await this.ax.get("/api/crm-administration/transfers", { ...this.config(), params: filters })
    ).data.data;
  }
  async historyItems(
    id: number,
    after?: number,
  ): Promise<AdminPage<AdminOption & { campaignId: number | null }>> {
    return (
      await this.ax.get(`/api/crm-administration/transfers/${id}/items`, {
        ...this.config(),
        params: after ? { after } : {},
      })
    ).data.data;
  }
}
