import ApiClient from "./api-client";
import type { CrmCatalogName, CrmCatalogRecords, CrmCatalogExpected, CrmCatalogListParams, CreateCrmCatalogRequest, UpdateCrmCatalogRequest, CrmUnitOption, CrmStateOption } from "./types/crm-catalogs.types";
import { DataResponse, MessageResponse, PaginatedResponse, RequestFilters } from "./types";
import {
	CreateCustomerDTO,
	CreateSegmentRequest,
	Customer,
	CustomerFullDetail,
	CustomerLookupOption,
	CustomerSegmentAssignment,
	FinishTelephonyScheduleDTO,
	CustomerTelephonySchedule,
	Segment,
	SegmentListParams,
	SetCustomerSegmentRequest,
	UpdateCustomerDTO,
	UpdateSegmentRequest,
} from "./types/customers.types";

class CustomersClient extends ApiClient {
	public async listCrmCatalog<K extends CrmCatalogName>(catalog: K, params?: CrmCatalogListParams): Promise<PaginatedResponse<CrmCatalogRecords[K]>> {
		const query = new URLSearchParams();
		for (const [key, value] of Object.entries(params ?? {})) {
			if (value !== undefined) query.set(key, String(value));
		}
		const response = await this.ax.get<PaginatedResponse<CrmCatalogRecords[K]>>(`/api/crm-catalogs/${catalog}${query.size ? `?${query}` : ""}`);
		return response.data;
	}

	public async getCrmCatalog<K extends CrmCatalogName>(catalog: K, id: number | string): Promise<DataResponse<CrmCatalogRecords[K]>> {
		const response = await this.ax.get<DataResponse<CrmCatalogRecords[K]>>(`/api/crm-catalogs/${catalog}/${encodeURIComponent(id)}`);
		return response.data;
	}

	public async createCrmCatalog<K extends CrmCatalogName>(catalog: K, data: CreateCrmCatalogRequest<K>): Promise<DataResponse<CrmCatalogRecords[K]>> {
		const response = await this.ax.post<DataResponse<CrmCatalogRecords[K]>>(`/api/crm-catalogs/${catalog}`, data);
		return response.data;
	}

	public async updateCrmCatalog<K extends CrmCatalogName>(catalog: K, id: number | string, data: UpdateCrmCatalogRequest<K>): Promise<DataResponse<CrmCatalogRecords[K]>> {
		const response = await this.ax.patch<DataResponse<CrmCatalogRecords[K]>>(`/api/crm-catalogs/${catalog}/${encodeURIComponent(id)}`, data);
		return response.data;
	}

	public async deleteCrmCatalog<K extends CrmCatalogName>(catalog: K, id: number | string, expected: CrmCatalogExpected<K>): Promise<MessageResponse> {
		const response = await this.ax.delete<MessageResponse>(`/api/crm-catalogs/${catalog}/${encodeURIComponent(id)}`, { data: { expected } });
		return response.data;
	}

	public async getCrmCatalogUnits(): Promise<DataResponse<CrmUnitOption[]>> {
		const response = await this.ax.get<DataResponse<CrmUnitOption[]>>("/api/crm-catalogs/options/units");
		return response.data;
	}

	public async getCrmCatalogStates(): Promise<DataResponse<CrmStateOption[]>> {
		const response = await this.ax.get<DataResponse<CrmStateOption[]>>("/api/crm-catalogs/options/states");
		return response.data;
	}
	/**
	 * Cria um novo cliente.
	 * @param data - Os dados do cliente a serem criados.
	 * @returns Uma Promise que resolve para o cliente criado.
	 */
	public async createCustomer(data: CreateCustomerDTO) {
		const response = await this.ax.post(`/api/customers`, data);

		return response.data;
	}

	/**
	 * Obtém um cliente pelo ID.
	 * @param customerId - O ID do cliente a ser obtido.
	 * @returns Uma Promise que resolve para o cliente obtido.
	 */
	public async getCustomerById(customerId: number) {
		const response = await this.ax.get(
			`/api/customers/${customerId}`,
		);
		return response.data;
	}

	/**
	 * Obtém os detalhes completos do cliente para o modal CRM.
	 * @param customerId - O ID do cliente a ser obtido.
	 * @returns Uma Promise que resolve para os detalhes agregados do cliente.
	 */
	public async getCustomerFullDetail(customerId: number) {
		const response = await this.ax.get<{ message: string; data: CustomerFullDetail }>(
			`/api/customers/${customerId}/full`,
		);

		return response.data;
	}

	/**
	 * Atualiza um cliente existente.
	 * @param customerId - O ID do cliente a ser atualizado.
	 * @param data - Os dados atualizados do cliente.
	 * @returns Uma Promise que resolve para o cliente atualizado.
	 */
	public async updateCustomer(customerId: number, data: UpdateCustomerDTO) {
		const response = await this.ax.patch(
			`/api/customers/${customerId}`,
			data,
		);
		return response.data;
	}

	/**
	 * Obtém todos os clientes.
	 *
	 * @param filters - Filtros opcionais para a busca de clientes.
	 * @todo Implementar tipagem para os filtros.
	 * @returns Uma Promise que resolve para uma lista de clientes.
	 */
	public async getCustomers(filters?: RequestFilters<Customer>) {
		let baseUrl = `/api/customers`;

		if (filters) {
			const params = new URLSearchParams(filters);
			baseUrl += `?${params.toString()}`;
		}

		const response =
			await this.ax.get<PaginatedResponse<Customer>>(baseUrl);

		return response.data;
	}

	public async getCampaigns() {
		const response = await this.ax.get<DataResponse<CustomerLookupOption[]>>(
			`/api/customers/campaigns`,
		);

		return response.data.data;
	}

	public async getSegments() {
		const response = await this.ax.get<DataResponse<CustomerLookupOption[]>>(
			`/api/customers/segments`,
		);

		return response.data.data;
	}

	public async listSegments(params?: SegmentListParams): Promise<PaginatedResponse<Segment>> {
		const query = new URLSearchParams();
		for (const [key, value] of Object.entries(params ?? {})) {
			if (value !== undefined) query.set(key, String(value));
		}
		const queryString = query.toString();
		const response = await this.ax.get<PaginatedResponse<Segment>>(
			`/api/segments${queryString ? `?${queryString}` : ""}`,
		);
		return response.data;
	}

	public async getSegment(segmentId: number): Promise<DataResponse<Segment>> {
		const response = await this.ax.get<DataResponse<Segment>>(`/api/segments/${segmentId}`);
		return response.data;
	}

	public async createSegment(data: CreateSegmentRequest): Promise<DataResponse<Segment>> {
		const response = await this.ax.post<DataResponse<Segment>>(`/api/segments`, data);
		return response.data;
	}

	public async updateSegment(segmentId: number, data: UpdateSegmentRequest): Promise<DataResponse<Segment>> {
		const response = await this.ax.patch<DataResponse<Segment>>(`/api/segments/${segmentId}`, data);
		return response.data;
	}

	public async deleteSegment(segmentId: number, expected: UpdateSegmentRequest["expected"]): Promise<MessageResponse> {
		const response = await this.ax.delete<MessageResponse>(`/api/segments/${segmentId}`, { data: { expected } });
		return response.data;
	}

	public async setCustomerSegment(
		customerId: number,
		data: SetCustomerSegmentRequest,
	): Promise<DataResponse<CustomerSegmentAssignment>> {
		const response = await this.ax.patch<DataResponse<CustomerSegmentAssignment>>(
			`/api/customers/${customerId}/segment`,
			data,
		);
		return response.data;
	}

	public async getOperators() {
		const response = await this.ax.get<DataResponse<CustomerLookupOption[]>>(
			`/api/customers/operators`,
		);

		return response.data.data;
	}

	public async getTelephonySchedules(
		filters?: RequestFilters<CustomerTelephonySchedule>,
	) {
		let baseUrl = `/api/customers/schedules/telephony`;

		if (filters) {
			const params = new URLSearchParams(filters);
			baseUrl += `?${params.toString()}`;
		}

		const response =
			await this.ax.get<PaginatedResponse<CustomerTelephonySchedule>>(baseUrl);

		return response.data;
	}

	public async finishTelephonySchedule(
		scheduleId: number,
		data: FinishTelephonyScheduleDTO,
	) {
		const response = await this.ax.patch<MessageResponse>(
			`/api/customers/schedules/telephony/${scheduleId}/finish`,
			data,
		);

		return response.data;
	}

	/**
	 * Define o token de autenticação para as requisições.
	 * @param token - O token de autenticação a ser definido.
	 */
	public setAuth(token: string) {
		this.ax.defaults.headers.common["Authorization"] =
			`Bearer ${token}`;
	}
}

export default CustomersClient;
