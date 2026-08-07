"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const form_data_1 = __importDefault(require("form-data"));
const api_client_1 = __importDefault(require("./api-client"));
class WhatsappClient extends api_client_1.default {
    async getChatsBySession(messages = false, contact = false, token = null) {
        const headers = token
            ? { Authorization: `Bearer ${token}` }
            : undefined;
        const url = `/api/whatsapp/session/chats?messages=${messages}&contact=${contact}`;
        const { data: res } = await this.ax.get(url, {
            headers,
        });
        return res.data;
    }
    async getChatById(id) {
        const { data: res } = await this.ax.get(`/api/whatsapp/chats/${id}`);
        return res.data;
    }
    async getMessageById(id) {
        const { data: res } = await this.ax.get(`/api/whatsapp/messages/${id}`);
        return res.data;
    }
    async getUserWallets(instance, userId) {
        const { data: res } = await this.ax.get(`/api/wallets?instance=${instance}&userId=${userId}`);
        return res.data;
    }
    async markContactMessagesAsRead(contactId) {
        const url = `/api/whatsapp/messages/mark-as-read`;
        const body = { contactId };
        const { data: res } = await this.ax.patch(url, body);
        return res.data;
    }
    async sendMessage(clientId, to, data) {
        const url = `/api/whatsapp/${clientId}/messages`;
        const formData = new form_data_1.default();
        formData.append("to", to);
        formData.append("text", data.text);
        formData.append("contactId", String(data.contactId));
        ("quotedId" in data) && data.quotedId && formData.append("quotedId", String(data.quotedId));
        ("chatId" in data) && data.chatId && formData.append("chatId", String(data.chatId));
        ("fileId" in data) && data.fileId && formData.append("fileId", String(data.fileId));
        ("sendAsAudio" in data) && data.sendAsAudio && formData.append("sendAsAudio", "true");
        ("sendAsDocument" in data) && data.sendAsDocument && formData.append("sendAsDocument", "true");
        ("sendAsChatOwner" in data) && data.sendAsChatOwner && formData.append("sendAsChatOwner", String(data.sendAsChatOwner));
        const { data: res } = await this.ax.post(url, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    }
    async editMessage(clientId, messageId, newText, isInternal = false) {
        const type = isInternal ? "internal" : "whatsapp";
        const url = `/api/${type}/${clientId}/messages/${messageId}`;
        const body = { newText };
        await this.ax.put(url, body);
    }
    async finishChatById(id, resultId, scheduleDate) {
        const url = `/api/whatsapp/chats/${id}/finish`;
        const body = { resultId, scheduleDate };
        await this.ax.post(url, body);
    }
    async startChatByContactId(contactId, template) {
        const url = `/api/whatsapp/chats`;
        const body = { contactId, template };
        await this.ax.post(url, body);
    }
    async getResults() {
        const url = `/api/whatsapp/results`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    async getCustomerContacts(customerId) {
        const url = `/api/whatsapp/customer/${customerId}/contacts`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    async getCustomerProfileSummary(customerId) {
        const { data: res } = await this.ax.get(`/api/whatsapp/customers/${customerId}/profile-tags/summary`);
        return res.data;
    }
    async getCustomerProfileManualOverrides(customerId) {
        const { data: res } = await this.ax.get(`/api/whatsapp/customers/${customerId}/profile-tags/manual-overrides`);
        return res.data;
    }
    async updateCustomerProfileManualOverrides(customerId, data) {
        const { data: res } = await this.ax.put(`/api/whatsapp/customers/${customerId}/profile-tags/manual-overrides`, data);
        return res.data;
    }
    async getCustomerProfileSummaries(data) {
        const { data: res } = await this.ax.post(`/api/whatsapp/customers/profile-tags/summary/batch`, data);
        return res.data;
    }
    async findCustomerIdsByProfileFilters(filters) {
        const params = new URLSearchParams();
        if (filters.profileLevel)
            params.append("profileLevel", filters.profileLevel);
        if (filters.interactionLevel)
            params.append("interactionLevel", filters.interactionLevel);
        if (filters.purchaseLevel)
            params.append("purchaseLevel", filters.purchaseLevel);
        if (filters.ageLevel)
            params.append("ageLevel", filters.ageLevel);
        if (filters.purchaseInterestLevel)
            params.append("purchaseInterestLevel", filters.purchaseInterestLevel);
        const queryString = params.toString();
        const url = queryString
            ? `/api/whatsapp/customers/profile-tags/customer-ids?${queryString}`
            : `/api/whatsapp/customers/profile-tags/customer-ids`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    async getContactsWithCustomer(filters) {
        let url = `/api/whatsapp/contacts/customer`;
        if (filters) {
            const params = new URLSearchParams();
            if (filters.name)
                params.append("name", filters.name);
            if (filters.phone)
                params.append("phone", filters.phone);
            if (filters.customerId !== undefined)
                params.append("customerId", String(filters.customerId));
            if (filters.customerErp)
                params.append("customerErp", filters.customerErp);
            if (filters.customerCnpj)
                params.append("customerCnpj", filters.customerCnpj);
            if (filters.customerName)
                params.append("customerName", filters.customerName);
            if (filters.hasCustomer !== undefined)
                params.append("hasCustomer", String(filters.hasCustomer));
            if (filters.page !== undefined)
                params.append("page", String(filters.page));
            if (filters.perPage !== undefined)
                params.append("perPage", String(filters.perPage));
            const queryString = params.toString();
            if (queryString)
                url += `?${queryString}`;
        }
        const res = await this.ax.get(url);
        return res.data;
    }
    async getContacts() {
        const url = `/api/whatsapp/contacts`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    async createContact(name, phone, customerId, sectorIds) {
        const baseUrl = `/api/whatsapp`;
        const url = customerId
            ? `${baseUrl}/customers/${customerId}/contacts`
            : `${baseUrl}/contacts`;
        const body = { name, phone };
        if (sectorIds !== undefined)
            body["sectorIds"] = sectorIds;
        const { data: res } = await this.ax.post(url, body);
        return res.data;
    }
    async forwardMessages(clientId, data) {
        const url = `/api/whatsapp/${clientId}/messages/forward`;
        const body = data;
        await this.ax.post(url, body);
    }
    async updateContact(contactId, name, customerId, sectorIds) {
        const url = `/api/whatsapp/contacts/${contactId}`;
        const body = {};
        if (name !== undefined)
            body["name"] = name;
        if (customerId !== undefined)
            body["customerId"] = customerId;
        if (sectorIds !== undefined)
            body["sectorIds"] = sectorIds;
        const { data: res } = await this.ax.put(url, body);
        return res.data;
    }
    async addSectorToContact(contactId, sectorId) {
        const url = `/api/whatsapp/contacts/${contactId}/sectors`;
        const body = { sectorId };
        const { data: res } = await this.ax.post(url, body);
        return res.data;
    }
    async deleteContact(contactId) {
        const url = `/api/whatsapp/contacts/${contactId}`;
        await this.ax.delete(url);
    }
    async getSectors() {
        const url = `/api/whatsapp/sectors`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    setAuth(token) {
        this.ax.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    async getChatsMonitor() {
        const url = `/api/whatsapp/session/monitor`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    async transferAttendance(id, userId) {
        const url = `/api/whatsapp/chats/${id}/transfer`;
        const body = { userId };
        await this.ax.post(url, body);
    }
    /**
     * Busca as notificações do usuário de forma paginada.
     */
    async getNotifications(params) {
        const searchParams = new URLSearchParams({
            page: String(params.page),
            pageSize: String(params.pageSize),
        });
        const url = `/api/whatsapp/notifications?${searchParams.toString()}`;
        const { data: res } = await this.ax.get(url);
        return res;
    }
    /**
     * Marca todas as notificações do usuário como lidas.
     */
    async markAllAsReadNotification() {
        const url = `/api/whatsapp/notifications/mark-all-read`;
        const { data: res } = await this.ax.patch(url);
        return res;
    }
    /**
     * Marca uma notificação específica como lida.
     * @param notificationId - O ID (numérico) da notificação a ser marcada.
     */
    async markOneAsReadNotification(notificationId) {
        const url = `/api/whatsapp/notifications/${notificationId}/read`;
        const { data: res } = await this.ax.patch(url);
        return res;
    }
    /**
     * Obtém os detalhes de um agendamento.
     * @param filters - keys de WppSchedule.
     * @param userId/sectorId filtrar por usúario/setor
     * @returns Uma Promise que resolve para um array de objetos wppSchedule.
     */
    async getSchedules(userId, sectorId, filters) {
        let baseUrl = `/api/whatsapp/schedules`;
        const params = new URLSearchParams(filters);
        if (params.toString()) {
            if (userId && sectorId) {
                baseUrl += `?userId=${userId}&sectorId=${sectorId}&${params.toString()}`;
            }
            else if (userId) {
                baseUrl += `?userId=${userId}&${params.toString()}`;
            }
            else if (sectorId) {
                baseUrl += `?sectorId=${sectorId}&${params.toString()}`;
            }
            else {
                baseUrl += `?${params.toString()}`;
            }
        }
        else if (userId || sectorId) {
            if (userId && sectorId) {
                baseUrl += `?userId=${userId}&sectorId=${sectorId}`;
            }
            else if (userId) {
                baseUrl += `?userId=${userId}`;
            }
            else if (sectorId) {
                baseUrl += `?sectorId=${sectorId}`;
            }
        }
        const response = await this.ax.get(baseUrl);
        return response.data;
    }
    async getUnifiedSchedules(filters) {
        let baseUrl = `/api/whatsapp/schedules/unified`;
        const params = new URLSearchParams(Object.entries(filters ?? {}).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null) {
                acc[key] = String(value);
            }
            return acc;
        }, {}));
        if (params.toString()) {
            baseUrl += `?${params.toString()}`;
        }
        const response = await this.ax.get(baseUrl);
        return response.data;
    }
    /**
     * Cria um novo agendamento.
     * @param scheduleData - Os dados do agendamento, keys de wppSchedule.
     * @returns Uma Promise que resolve para um objeto wppSchedule.
     */
    async createSchedule(data) {
        const response = await this.ax.post(`/api/whatsapp/schedules`, data);
        return response.data;
    }
    /**
     * Edita um agendamento existente.
     * @param scheduleId - O ID do agendamento a ser editado.
     * @param updatedData - Os dados atualizados do agendamento.
     * @returns Uma Promise que resolve para um objeto wppSchedule.
     */
    async updateSchedule(scheduleId, updatedData) {
        const response = await this.ax.patch(`/api/whatsapp/schedules/${scheduleId}`, updatedData);
        return response.data;
    }
    /**
     * Exclui um agendamento.
     * @param scheduleId - O ID do agendamento a ser excluído.
     * @returns Uma Promise que resolve para um objeto wppSchedule.
     */
    async deleteSchedule(scheduleId) {
        const response = await this.ax.delete(`/api/whatsapp/schedules/${scheduleId}`);
        return response.data;
    }
    async getMessages(token, filters) {
        const params = new URLSearchParams(Object.entries(filters)
            .filter(([_, v]) => v !== undefined && v !== null)
            .reduce((acc, [k, v]) => {
            acc[k] = String(v);
            return acc;
        }, {}));
        const url = `/api/whatsapp/messages?${params.toString()}`;
        const { data: res } = await this.ax.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return res.data;
    }
    async getAutoResponseRules() {
        const url = `/api/auto-response-rules`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    async createAutoResponseRule(ruleData) {
        const url = `/api/auto-response-rules`;
        const { data: res } = await this.ax.post(url, ruleData);
        return res.data;
    }
    async updateAutoResponseRule(id, ruleData) {
        const url = `/api/auto-response-rules/${id}`;
        const { data: res } = await this.ax.put(url, ruleData);
        return res.data;
    }
    async deleteAutoResponseRule(id) {
        const url = `/api/auto-response-rules/${id}`;
        await this.ax.delete(url);
    }
}
exports.default = WhatsappClient;
