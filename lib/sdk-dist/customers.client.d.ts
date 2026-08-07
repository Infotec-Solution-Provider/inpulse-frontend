import ApiClient from "./api-client";
import { MessageResponse, PaginatedResponse, RequestFilters } from "./types";
import { CreateCustomerDTO, Customer, CustomerFullDetail, CustomerLookupOption, FinishTelephonyScheduleDTO, CustomerTelephonySchedule, UpdateCustomerDTO } from "./types/customers.types";
declare class CustomersClient extends ApiClient {
    /**
     * Cria um novo cliente.
     * @param data - Os dados do cliente a serem criados.
     * @returns Uma Promise que resolve para o cliente criado.
     */
    createCustomer(data: CreateCustomerDTO): Promise<any>;
    /**
     * Obtém um cliente pelo ID.
     * @param customerId - O ID do cliente a ser obtido.
     * @returns Uma Promise que resolve para o cliente obtido.
     */
    getCustomerById(customerId: number): Promise<any>;
    /**
     * Obtém os detalhes completos do cliente para o modal CRM.
     * @param customerId - O ID do cliente a ser obtido.
     * @returns Uma Promise que resolve para os detalhes agregados do cliente.
     */
    getCustomerFullDetail(customerId: number): Promise<{
        message: string;
        data: CustomerFullDetail;
    }>;
    /**
     * Atualiza um cliente existente.
     * @param customerId - O ID do cliente a ser atualizado.
     * @param data - Os dados atualizados do cliente.
     * @returns Uma Promise que resolve para o cliente atualizado.
     */
    updateCustomer(customerId: number, data: UpdateCustomerDTO): Promise<any>;
    /**
     * Obtém todos os clientes.
     *
     * @param filters - Filtros opcionais para a busca de clientes.
     * @todo Implementar tipagem para os filtros.
     * @returns Uma Promise que resolve para uma lista de clientes.
     */
    getCustomers(filters?: RequestFilters<Customer>): Promise<PaginatedResponse<Customer>>;
    getCampaigns(): Promise<CustomerLookupOption[]>;
    getSegments(): Promise<CustomerLookupOption[]>;
    getOperators(): Promise<CustomerLookupOption[]>;
    getTelephonySchedules(filters?: RequestFilters<CustomerTelephonySchedule>): Promise<PaginatedResponse<CustomerTelephonySchedule>>;
    finishTelephonySchedule(scheduleId: number, data: FinishTelephonyScheduleDTO): Promise<MessageResponse>;
    /**
     * Define o token de autenticação para as requisições.
     * @param token - O token de autenticação a ser definido.
     */
    setAuth(token: string): void;
}
export default CustomersClient;
