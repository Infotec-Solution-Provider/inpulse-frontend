import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type {
  CrmMarketingCatalog,
  CrmMarketingField,
  CrmMarketingRecord,
  CrmMarketingPage,
  CrmMarketingListParams,
  CrmMarketingPatch,
  CrmExceptionKind,
  CrmExceptionRecord,
  CrmSelectionCriteria,
  CrmCampaignConfiguration,
  CrmSelectionPreview,
  CrmOrdering,
  CrmOrderingSnapshot,
  CrmOrderCriterion,
  CrmMarketingValue,
  CrmCampaignMember,
  CrmCampaignMemberOption,
  CrmCampaignMemberExpected,
} from "./types/crm-marketing.types";
/** Administrative writes deliberately have no authentication retry interceptor. */
export default class CrmMarketingClient {
  public readonly ax: AxiosInstance;
  private readonly root = "/api/marketing/crm";
  constructor(
    baseURL: string,
    private readonly token?: string,
    private readonly instance?: string,
  ) {
    this.ax = axios.create({
      baseURL,
      timeout: 30_000,
      headers: { "Content-Type": "application/json" },
      ...this.pinned(),
    });
  }
  private pinned(): AxiosRequestConfig & { skipAuthInjection: true; skipAuthRefresh: true } {
    return {
      headers: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(this.instance ? { "x-crm-instance": this.instance } : {}),
      },
      skipAuthInjection: true,
      skipAuthRefresh: true,
    };
  }
  async schema(catalog: CrmMarketingCatalog) {
    return (
      await this.ax.get<{ data: { fields: CrmMarketingField[] } }>(`${this.root}/${catalog}/schema`)
    ).data.data;
  }
  async list(catalog: CrmMarketingCatalog, params: CrmMarketingListParams = {}) {
    return (
      await this.ax.get<CrmMarketingPage<CrmMarketingRecord>>(`${this.root}/${catalog}`, { params })
    ).data;
  }
  async detail(catalog: CrmMarketingCatalog, id: number) {
    return (
      await this.ax.get<{ data: CrmMarketingRecord }>(
        `${this.root}/${catalog}/${encodeURIComponent(id)}`,
      )
    ).data.data;
  }
  async create(catalog: CrmMarketingCatalog, data: Record<string, CrmMarketingValue>) {
    return (
      await this.ax.post<{ data: CrmMarketingRecord }>(
        `${this.root}/${catalog}`,
        data,
        this.pinned(),
      )
    ).data.data;
  }
  async patch(catalog: CrmMarketingCatalog, id: number, data: CrmMarketingPatch) {
    return (
      await this.ax.patch<{ data: CrmMarketingRecord }>(
        `${this.root}/${catalog}/${encodeURIComponent(id)}`,
        data,
        this.pinned(),
      )
    ).data.data;
  }
  async remove(
    catalog: CrmMarketingCatalog,
    id: number,
    expected: Record<string, CrmMarketingValue>,
  ) {
    await this.ax.delete(`${this.root}/${catalog}/${encodeURIComponent(id)}`, {
      ...this.pinned(),
      data: { expected },
    });
  }
  async actions() {
    return (
      await this.ax.get<{ supported: boolean; data: { CODIGO: number; NOME: string }[] }>(
        `${this.root}/results/actions`,
      )
    ).data;
  }
  async options(
    kind: "units" | "groups" | "segments" | "origins" | "operators" | "cities" | "states",
    search = "",
    page = 1,
  ) {
    return (
      await this.ax.get<{
        data: { id: string; label: string | null }[];
        page: { current: number; hasNext: boolean };
        supported: boolean;
      }>(`${this.root}/options/${kind}`, { params: { search, page, perPage: 30 } })
    ).data;
  }
  async exceptions(
    kind: CrmExceptionKind,
    params: { page?: number; perPage?: number; search?: string } = {},
  ) {
    return (
      await this.ax.get<CrmMarketingPage<CrmExceptionRecord>>(`${this.root}/exceptions/${kind}`, {
        params,
      })
    ).data;
  }
  async createException(kind: CrmExceptionKind, data: CrmExceptionRecord) {
    return (
      await this.ax.post<{ data: CrmExceptionRecord }>(
        `${this.root}/exceptions/${kind}`,
        data,
        this.pinned(),
      )
    ).data.data;
  }
  async inspectException(kind: CrmExceptionKind, data: CrmExceptionRecord) {
    return (
      await this.ax.post<{ data: CrmExceptionRecord[] }>(
        `${this.root}/exceptions/${kind}/inspect`,
        data,
        this.pinned(),
      )
    ).data.data;
  }
  async patchException(
    kind: CrmExceptionKind,
    changes: CrmExceptionRecord,
    expected: CrmExceptionRecord,
  ) {
    return (
      await this.ax.patch<{ data: CrmExceptionRecord }>(
        `${this.root}/exceptions/${kind}`,
        { changes, expected },
        this.pinned(),
      )
    ).data.data;
  }
  async removeException(kind: CrmExceptionKind, expected: CrmExceptionRecord) {
    await this.ax.delete(`${this.root}/exceptions/${kind}`, {
      ...this.pinned(),
      data: { expected },
    });
  }
  async configuration(id: number) {
    return (
      await this.ax.get<{ data: CrmCampaignConfiguration }>(
        `${this.root}/campaigns/${encodeURIComponent(id)}/configuration`,
      )
    ).data.data;
  }
  async campaignMembers(id: number) {
    return (await this.ax.get<{ data: CrmCampaignMember[] }>(`${this.root}/campaigns/${encodeURIComponent(id)}/members`, this.pinned())).data;
  }
  async campaignMemberOptions(id: number, search = "", page = 1) {
    return (await this.ax.get<{ data: CrmCampaignMemberOption[]; page: { current: number; hasNext: boolean } }>(`${this.root}/campaigns/${encodeURIComponent(id)}/members/options`, { ...this.pinned(), params: { search, page, perPage: 20 } })).data;
  }
  async addCampaignMember(id: number, data: { CODIGO: number; OPERADOR: number }) {
    return (await this.ax.post<{ data: CrmCampaignMember }>(`${this.root}/campaigns/${encodeURIComponent(id)}/members`, data, this.pinned())).data;
  }
  async removeCampaignMember(id: number, linkId: number, expected: CrmCampaignMemberExpected) {
    await this.ax.delete(`${this.root}/campaigns/${encodeURIComponent(id)}/members/${encodeURIComponent(linkId)}`, { ...this.pinned(), data: { expected } });
  }
  async preview(criteria: CrmSelectionCriteria) {
    return (
      await this.ax.post<{ data: CrmSelectionPreview }>(
        `${this.root}/selection/preview`,
        { criteria },
        this.pinned(),
      )
    ).data.data;
  }
  async configure(
    id: number,
    criteria: CrmSelectionCriteria,
    expected: Pick<CrmCampaignConfiguration, "SQL_CAMPANHA" | "GERADO_LISTA">,
  ) {
    return (
      await this.ax.patch<{ data: CrmCampaignConfiguration }>(
        `${this.root}/campaigns/${encodeURIComponent(id)}/configuration`,
        { criteria, expected },
        this.pinned(),
      )
    ).data.data;
  }
  async ordering() {
    return (await this.ax.get<CrmOrdering>(`${this.root}/ordering`)).data;
  }
  async saveOrdering(criteria: CrmOrderCriterion[], expected: CrmOrderingSnapshot) {
    return (
      await this.ax.patch<CrmOrdering>(
        `${this.root}/ordering`,
        { criteria, expected },
        this.pinned(),
      )
    ).data;
  }
}
