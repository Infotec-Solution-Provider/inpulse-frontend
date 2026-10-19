import CustomersClient from "./customers.client";
import type { CustomerSearchOptionKind, CustomerSearchOptionsResponse } from "./types/customer-search.types";
export default class CustomerSearchClient extends CustomersClient {
  async getSearchOptions(kind: CustomerSearchOptionKind, search = "", page = 1): Promise<CustomerSearchOptionsResponse> {
    const query = new URLSearchParams({ search, page: String(page) });
    return (await this.ax.get<CustomerSearchOptionsResponse>(`/api/customers/search-options/${kind}?${query}`)).data;
  }
}
