import CustomersClient from "./customers.client";
import type { DataResponse } from "./types/response.types";
import type { CustomerLookupOption } from "./types/customers.types";
import type {
  CustomerCrmBrandLink,
  CustomerCrmFormOptions,
  CustomerCrmLookupResponse,
  CustomerCrmPatch,
  CustomerCrmRecord,
  CustomerCrmSnapshot,
} from "./types/customer-crm.types";
export default class CustomerCrmClient extends CustomersClient {
  private registrationContext: { instance: string; token: string } | null = null;
  setRegistrationContext(instance: string, token: string): void {
    this.registrationContext = {
      instance: instance.trim(),
      token: token.replace(/^Bearer\s+/i, "").trim(),
    };
    this.setAuth(this.registrationContext.token);
    this.ax.defaults.headers.common["x-crm-instance"] = this.registrationContext.instance;
  }
  private registrationConfig() {
    const context = this.registrationContext;
    if (!context?.instance || !context.token)
      throw new Error("Recarregue sua sessão antes de abrir o cadastro.");
    return {
      skipAuthInjection: true,
      skipAuthRefresh: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${context.token}`,
        "x-crm-instance": context.instance,
      },
    };
  }
  override async getSegments(): Promise<CustomerLookupOption[]> {
    return (
      await this.ax.get<DataResponse<CustomerLookupOption[]>>(
        "/api/customers/segments",
        this.registrationConfig(),
      )
    ).data.data;
  }
  override async getOperators(): Promise<CustomerLookupOption[]> {
    return (
      await this.ax.get<DataResponse<CustomerLookupOption[]>>(
        "/api/customers/operators",
        this.registrationConfig(),
      )
    ).data.data;
  }
  override async getCampaigns(): Promise<CustomerLookupOption[]> {
    return (
      await this.ax.get<DataResponse<CustomerLookupOption[]>>(
        "/api/customers/campaigns",
        this.registrationConfig(),
      )
    ).data.data;
  }
  async getRegistrationOptions(): Promise<CustomerCrmFormOptions> {
    return (
      await this.ax.get<DataResponse<CustomerCrmFormOptions>>(
        "/api/crm-customers/options",
        this.registrationConfig(),
      )
    ).data.data;
  }
  async getRegistration(id: number): Promise<CustomerCrmSnapshot> {
    return (
      await this.ax.get<DataResponse<CustomerCrmSnapshot>>(
        `/api/crm-customers/${id}`,
        this.registrationConfig(),
      )
    ).data.data;
  }
  async createRegistration(data: CustomerCrmRecord): Promise<CustomerCrmSnapshot> {
    return (
      await this.ax.post<DataResponse<CustomerCrmSnapshot>>(
        "/api/crm-customers",
        data,
        this.registrationConfig(),
      )
    ).data.data;
  }
  async updateRegistration(id: number, data: CustomerCrmPatch): Promise<CustomerCrmSnapshot> {
    return (
      await this.ax.patch<DataResponse<CustomerCrmSnapshot>>(
        `/api/crm-customers/${id}`,
        data,
        this.registrationConfig(),
      )
    ).data.data;
  }
  async listRegistrationContacts(id: number): Promise<CustomerCrmSnapshot[]> {
    return (
      await this.ax.get<DataResponse<CustomerCrmSnapshot[]>>(
        `/api/crm-customers/${id}/contacts`,
        this.registrationConfig(),
      )
    ).data.data;
  }
  async createRegistrationContact(
    id: number,
    data: CustomerCrmRecord,
  ): Promise<CustomerCrmSnapshot> {
    return (
      await this.ax.post<DataResponse<CustomerCrmSnapshot>>(
        `/api/crm-customers/${id}/contacts`,
        data,
        this.registrationConfig(),
      )
    ).data.data;
  }
  async updateRegistrationContact(
    id: number,
    contactId: number,
    data: CustomerCrmPatch,
  ): Promise<CustomerCrmSnapshot> {
    return (
      await this.ax.patch<DataResponse<CustomerCrmSnapshot>>(
        `/api/crm-customers/${id}/contacts/${contactId}`,
        data,
        this.registrationConfig(),
      )
    ).data.data;
  }
  async deleteRegistrationContact(id: number, contactId: number, version: string): Promise<void> {
    await this.ax.delete(`/api/crm-customers/${id}/contacts/${contactId}`, {
      ...this.registrationConfig(),
      data: { version },
    });
  }
  async listRegistrationBrands(id: number): Promise<CustomerCrmBrandLink[]> {
    return (
      await this.ax.get<DataResponse<CustomerCrmBrandLink[]>>(
        `/api/crm-customers/${id}/brands`,
        this.registrationConfig(),
      )
    ).data.data;
  }
  async createRegistrationBrand(id: number, brandId: number): Promise<CustomerCrmBrandLink> {
    return (
      await this.ax.post<DataResponse<CustomerCrmBrandLink>>(
        `/api/crm-customers/${id}/brands`,
        { MARCA: brandId },
        this.registrationConfig(),
      )
    ).data.data;
  }
  async deleteRegistrationBrand(id: number, linkId: number, version: string): Promise<void> {
    await this.ax.delete(`/api/crm-customers/${id}/brands/${linkId}`, {
      ...this.registrationConfig(),
      data: { version },
    });
  }
  async registrationLookup(
    kind: "groups" | "positions" | "origins" | "medias" | "brands" | "units" | "states",
    search = "",
    page = 1,
  ): Promise<CustomerCrmLookupResponse> {
    return (
      await this.ax.get<CustomerCrmLookupResponse>(
        `/api/customers/search-options/${kind}?${new URLSearchParams({ search, page: String(page) })}`,
        this.registrationConfig(),
      )
    ).data;
  }
}
