import ApiClient from "./api-client";
import { crmMutationConfig, type CrmRequestContext } from "./crm-request-context";
import type { DataResponse, PaginatedResponse } from "./types/response.types";
import type { CrmPurchaseInput, CrmPurchaseLookup, CrmPurchaseLookupFilters, CrmPurchasePatch, CrmPurchaseSnapshot, CrmPurchasesFilters, CrmPurchasesSchema } from "./types/crm-purchases.types";
/** One client belongs to one immutable session snapshot. A new session requires a new client. */
export default class CrmPurchasesClient extends ApiClient {
  private readonly context: Readonly<CrmRequestContext>;
  constructor(baseURL: string, context: CrmRequestContext) { super(baseURL); this.context = Object.freeze({ instance: context.instance, token: context.token }); }
  private config() { return crmMutationConfig(this.context); }
  async schema(): Promise<CrmPurchasesSchema> { return (await this.ax.get<DataResponse<CrmPurchasesSchema>>("/api/crm-purchases/schema", this.config())).data.data; }
  async list(filters: CrmPurchasesFilters = {}): Promise<PaginatedResponse<CrmPurchaseSnapshot>> { return (await this.ax.get<PaginatedResponse<CrmPurchaseSnapshot>>("/api/crm-purchases", { ...this.config(), params: filters })).data; }
  async get(id: number): Promise<CrmPurchaseSnapshot> { return (await this.ax.get<DataResponse<CrmPurchaseSnapshot>>(`/api/crm-purchases/${id}`, this.config())).data.data; }
  async create(fields: CrmPurchaseInput): Promise<CrmPurchaseSnapshot> { return (await this.ax.post<DataResponse<CrmPurchaseSnapshot>>("/api/crm-purchases", fields, this.config())).data.data; }
  async update(id: number, body: CrmPurchasePatch): Promise<CrmPurchaseSnapshot> { return (await this.ax.patch<DataResponse<CrmPurchaseSnapshot>>(`/api/crm-purchases/${id}`, body, this.config())).data.data; }
  async remove(id: number, body: { version: string }): Promise<void> { await this.ax.delete(`/api/crm-purchases/${id}`, { ...this.config(), data: body }); }
  async lookup(kind: "customers" | "operators", filters: CrmPurchaseLookupFilters = {}): Promise<PaginatedResponse<CrmPurchaseLookup>> { return (await this.ax.get<PaginatedResponse<CrmPurchaseLookup>>(`/api/crm-purchases/options/${kind}`, { ...this.config(), params: filters })).data; }
}
