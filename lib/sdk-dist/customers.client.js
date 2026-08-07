"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = __importDefault(require("./api-client"));
class CustomersClient extends api_client_1.default {
    /**
     * Cria um novo cliente.
     * @param data - Os dados do cliente a serem criados.
     * @returns Uma Promise que resolve para o cliente criado.
     */
    async createCustomer(data) {
        const response = await this.ax.post(`/api/customers`, data);
        return response.data;
    }
    /**
     * Obtém um cliente pelo ID.
     * @param customerId - O ID do cliente a ser obtido.
     * @returns Uma Promise que resolve para o cliente obtido.
     */
    async getCustomerById(customerId) {
        const response = await this.ax.get(`/api/customers/${customerId}`);
        return response.data;
    }
    /**
     * Obtém os detalhes completos do cliente para o modal CRM.
     * @param customerId - O ID do cliente a ser obtido.
     * @returns Uma Promise que resolve para os detalhes agregados do cliente.
     */
    async getCustomerFullDetail(customerId) {
        const response = await this.ax.get(`/api/customers/${customerId}/full`);
        return response.data;
    }
    /**
     * Atualiza um cliente existente.
     * @param customerId - O ID do cliente a ser atualizado.
     * @param data - Os dados atualizados do cliente.
     * @returns Uma Promise que resolve para o cliente atualizado.
     */
    async updateCustomer(customerId, data) {
        const response = await this.ax.patch(`/api/customers/${customerId}`, data);
        return response.data;
    }
    /**
     * Obtém todos os clientes.
     *
     * @param filters - Filtros opcionais para a busca de clientes.
     * @todo Implementar tipagem para os filtros.
     * @returns Uma Promise que resolve para uma lista de clientes.
     */
    async getCustomers(filters) {
        let baseUrl = `/api/customers`;
        if (filters) {
            const params = new URLSearchParams(filters);
            baseUrl += `?${params.toString()}`;
        }
        const response = await this.ax.get(baseUrl);
        return response.data;
    }
    async getCampaigns() {
        const response = await this.ax.get(`/api/customers/campaigns`);
        return response.data.data;
    }
    async getSegments() {
        const response = await this.ax.get(`/api/customers/segments`);
        return response.data.data;
    }
    async getOperators() {
        const response = await this.ax.get(`/api/customers/operators`);
        return response.data.data;
    }
    async getTelephonySchedules(filters) {
        let baseUrl = `/api/customers/schedules/telephony`;
        if (filters) {
            const params = new URLSearchParams(filters);
            baseUrl += `?${params.toString()}`;
        }
        const response = await this.ax.get(baseUrl);
        return response.data;
    }
    async finishTelephonySchedule(scheduleId, data) {
        const response = await this.ax.patch(`/api/customers/schedules/telephony/${scheduleId}/finish`, data);
        return response.data;
    }
    /**
     * Define o token de autenticação para as requisições.
     * @param token - O token de autenticação a ser definido.
     */
    setAuth(token) {
        this.ax.defaults.headers.common["Authorization"] =
            `Bearer ${token}`;
    }
}
exports.default = CustomersClient;
