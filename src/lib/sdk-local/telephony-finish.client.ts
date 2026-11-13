import ApiClient from "./api-client";
import { crmMutationConfig, type CrmRequestContext } from "./crm-request-context";
export interface FinishOptions {
  enabled: boolean;
  saleEnabled?: boolean;
  observationRequired?: boolean;
  phaseRequired?: boolean;
  priorityAllowed?: boolean;
  phases?: { id: number; name: string; observationRequired: string | null }[];
  results?: {
    id: number;
    name: string;
    COD_ACAO: number;
    PROPOSTA: string | null;
    CANCELAPROPOSTA: string | null;
    PESQUISA_SATISFACAO: string | null;
    EVENDA: string | null;
  }[];
  operators?: { id: number; name: string }[];
}
export interface FinishReceipt {
  operationId: string;
  scheduleId: number;
  successorScheduleId: number | null;
  historyId: number;
  saleId: number | null;
  finishedAt: string;
}
export default class TelephonyFinishClient extends ApiClient {
  private readonly context: Readonly<CrmRequestContext>;
  constructor(base: string, context: CrmRequestContext) {
    super(base);
    this.context = Object.freeze({ ...context });
  }
  async options(id: number) {
    return (
      await this.ax.get<{ data: FinishOptions }>(
        `/api/customers/schedules/telephony/${id}/finish-options`,
        crmMutationConfig(this.context),
      )
    ).data.data;
  }
  async finish(id: number, command: unknown) {
    return (
      await this.ax.patch<{ data: FinishReceipt }>(
        `/api/customers/schedules/telephony/${id}/finish-v2`,
        command,
        crmMutationConfig(this.context),
      )
    ).data.data;
  }
  async status(id: number, op: string) {
    return (
      await this.ax.get<{ data: { status: "applied" | "not_confirmed"; receipt?: FinishReceipt } }>(
        `/api/customers/schedules/telephony/${id}/finish-v2/${encodeURIComponent(op)}`,
        crmMutationConfig(this.context),
      )
    ).data.data;
  }
}
