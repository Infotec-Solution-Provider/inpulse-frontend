import ApiClient from "./api-client";
import { RequestFilters } from "./types";
import { DataResponse, MessageResponse } from "./types/response.types";
import { AppNotification, AutomaticResponseRule, AutomaticResponseRuleDTO, CustomerProfileManualOverrides, CustomerProfileSummaryBatchRequest, CustomerProfileSummaryFilters, CustomerProfileSummaryPayload, CreateScheduleDTO, ForwardMessagesData, PaginatedContactsResponse, PaginatedNotificationsResponse, SendFileMessageData, SendMessageData, UnifiedScheduleFilters, UnifiedSchedulesResponse, WppChatsAndMessages, WppChatWithDetailsAndMessages, WppContact, WppMessage, WppSchedule, UpdateCustomerProfileManualOverridesInput, WppWallet } from "./types/whatsapp.types";
interface FetchMessagesFilters {
    minDate: string;
    maxDate: string;
    userId?: number | null;
}
export default class WhatsappClient extends ApiClient {
    getChatsBySession(messages?: boolean, contact?: boolean, token?: string | null): Promise<WppChatsAndMessages>;
    getChatById(id: number): Promise<WppChatWithDetailsAndMessages>;
    getMessageById(id: string): Promise<WppMessage>;
    getUserWallets(instance: string, userId: number): Promise<WppWallet[]>;
    markContactMessagesAsRead(contactId: number): Promise<WppMessage[]>;
    sendMessage(clientId: string, to: string, data: SendMessageData | SendFileMessageData): Promise<WppMessage>;
    editMessage(clientId: string, messageId: string, newText: string, isInternal?: boolean): Promise<void>;
    finishChatById(id: number, resultId: number, scheduleDate?: Date | null): Promise<void>;
    startChatByContactId(contactId: number, template?: any): Promise<void>;
    getResults(): Promise<{
        id: number;
        name: string;
    }[]>;
    getCustomerContacts(customerId: number): Promise<WppContact[]>;
    getCustomerProfileSummary(customerId: number): Promise<CustomerProfileSummaryPayload>;
    getCustomerProfileManualOverrides(customerId: number): Promise<CustomerProfileManualOverrides | null>;
    updateCustomerProfileManualOverrides(customerId: number, data: UpdateCustomerProfileManualOverridesInput): Promise<CustomerProfileSummaryPayload>;
    getCustomerProfileSummaries(data: CustomerProfileSummaryBatchRequest): Promise<CustomerProfileSummaryPayload[]>;
    findCustomerIdsByProfileFilters(filters: CustomerProfileSummaryFilters): Promise<number[]>;
    getContactsWithCustomer(filters?: {
        name?: string;
        phone?: string;
        customerId?: number;
        customerErp?: string;
        customerCnpj?: string;
        customerName?: string;
        hasCustomer?: boolean;
        page?: number;
        perPage?: number;
    }): Promise<PaginatedContactsResponse>;
    getContacts(): Promise<WppContact[]>;
    createContact(name: string, phone: string, customerId?: number, sectorIds?: number[]): Promise<WppContact>;
    forwardMessages(clientId: string, data: ForwardMessagesData): Promise<void>;
    updateContact(contactId: number, name?: string, customerId?: number | null, sectorIds?: number[] | null): Promise<WppContact>;
    addSectorToContact(contactId: number, sectorId: number): Promise<WppContact>;
    deleteContact(contactId: number): Promise<void>;
    getSectors(): Promise<{
        id: number;
        name: string;
    }[]>;
    setAuth(token: string): void;
    getChatsMonitor(): Promise<WppChatsAndMessages>;
    transferAttendance(id: number, userId: number): Promise<void>;
    /**
     * Busca as notificações do usuário de forma paginada.
     */
    getNotifications(params: {
        page: number;
        pageSize: number;
    }): Promise<DataResponse<PaginatedNotificationsResponse>>;
    /**
     * Marca todas as notificações do usuário como lidas.
     */
    markAllAsReadNotification(): Promise<MessageResponse>;
    /**
     * Marca uma notificação específica como lida.
     * @param notificationId - O ID (numérico) da notificação a ser marcada.
     */
    markOneAsReadNotification(notificationId: number): Promise<DataResponse<AppNotification>>;
    /**
     * Obtém os detalhes de um agendamento.
     * @param filters - keys de WppSchedule.
     * @param userId/sectorId filtrar por usúario/setor
     * @returns Uma Promise que resolve para um array de objetos wppSchedule.
     */
    getSchedules(userId?: string, sectorId?: string, filters?: RequestFilters<WppSchedule>): Promise<any>;
    getUnifiedSchedules(filters?: UnifiedScheduleFilters): Promise<UnifiedSchedulesResponse>;
    /**
     * Cria um novo agendamento.
     * @param scheduleData - Os dados do agendamento, keys de wppSchedule.
     * @returns Uma Promise que resolve para um objeto wppSchedule.
     */
    createSchedule(data: CreateScheduleDTO): Promise<any>;
    /**
     * Edita um agendamento existente.
     * @param scheduleId - O ID do agendamento a ser editado.
     * @param updatedData - Os dados atualizados do agendamento.
     * @returns Uma Promise que resolve para um objeto wppSchedule.
     */
    updateSchedule(scheduleId: number, updatedData: Record<string, WppSchedule>): Promise<any>;
    /**
     * Exclui um agendamento.
     * @param scheduleId - O ID do agendamento a ser excluído.
     * @returns Uma Promise que resolve para um objeto wppSchedule.
     */
    deleteSchedule(scheduleId: number): Promise<any>;
    getMessages(token: string, filters: FetchMessagesFilters): Promise<(WppMessage & {
        WppContact: WppContact | null;
    })[]>;
    getAutoResponseRules(): Promise<AutomaticResponseRule[]>;
    createAutoResponseRule(ruleData: AutomaticResponseRuleDTO): Promise<AutomaticResponseRule>;
    updateAutoResponseRule(id: number, ruleData: Omit<AutomaticResponseRuleDTO, "instance">): Promise<AutomaticResponseRule>;
    deleteAutoResponseRule(id: number): Promise<void>;
}
export {};
