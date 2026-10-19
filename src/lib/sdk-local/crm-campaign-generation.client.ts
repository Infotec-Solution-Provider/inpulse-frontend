import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
export interface CrmGenerationExpected {
  SQL_CAMPANHA: string | null;
  GERADO_LISTA: "SIM" | "NAO" | null;
}
export interface CrmGenerationInput {
  operatorId: number;
  scheduledAt: string;
}
export interface CrmGenerationPreview extends CrmGenerationInput {
  eligibleCount: number;
  alreadyLinkedCount: number;
  limit: number;
  expected: CrmGenerationExpected;
}
export default class CrmCampaignGenerationClient {
  public readonly ax: AxiosInstance;
  constructor(
    baseURL: string,
    private readonly token: string,
    private readonly instance: string,
  ) {
    this.ax = axios.create({ baseURL, timeout: 45_000 });
  }
  private pinned(): AxiosRequestConfig & { skipAuthInjection: true; skipAuthRefresh: true } {
    return {
      headers: { Authorization: `Bearer ${this.token}`, "x-crm-instance": this.instance },
      skipAuthInjection: true,
      skipAuthRefresh: true,
    };
  }
  async preview(id: number, input: CrmGenerationInput) {
    return (
      await this.ax.post<{ data: CrmGenerationPreview }>(
        `/api/crm/campaigns/${encodeURIComponent(id)}/generation-preview`,
        input,
        this.pinned(),
      )
    ).data.data;
  }
  async generate(
    id: number,
    input: CrmGenerationInput & { expectedCount: number; expected: CrmGenerationExpected },
  ) {
    return (
      await this.ax.post<{ data: { insertedCount: number } }>(
        `/api/crm/campaigns/${encodeURIComponent(id)}/generate`,
        input,
        this.pinned(),
      )
    ).data.data;
  }
}
