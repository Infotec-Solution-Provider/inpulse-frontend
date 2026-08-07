"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = __importDefault(require("./api-client"));
const form_data_1 = __importDefault(require("form-data"));
class InternalChatClient extends api_client_1.default {
    async createInternalChat(participants, isGroup = false, groupName = null, groupId = null, groupImage = null) {
        const form = new form_data_1.default();
        if (groupImage) {
            form.append("file", groupImage);
        }
        form.append("data", JSON.stringify({ participants, isGroup, groupName, groupId }));
        const { data: res } = await this.ax.post(`/api/internal/chats`, form, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    }
    async deleteInternalChat(chatId) {
        const url = `/api/internal/chats/${chatId}`;
        await this.ax.delete(url);
    }
    async getInternalChatsBySession(token = null) {
        const url = `/api/internal/session/chats`;
        const headers = token
            ? { Authorization: `Bearer ${token}` }
            : undefined;
        const { data: res } = await this.ax.get(url, {
            headers,
        });
        return res.data;
    }
    async getInternalGroups() {
        const url = `/api/internal/groups`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    async sendMessageToInternalChat(data) {
        const url = `/api/internal/chats/${data.chatId}/messages`;
        const formData = new form_data_1.default();
        formData.append("chatId", data.chatId.toString());
        formData.append("text", data.text);
        data.quotedId && formData.append("quotedId", data.quotedId.toString());
        data.sendAsAudio && formData.append("sendAsAudio", "true");
        data.sendAsDocument && formData.append("sendAsDocument", "true");
        data.file && formData.append("file", data.file);
        data.fileId && formData.append("fileId", data.fileId.toString());
        if (data.mentions && data.mentions.length > 0) {
            formData.append("mentions", JSON.stringify(data.mentions));
        }
        await this.ax.post(url, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    }
    async updateInternalGroup(groupId, data) {
        const { data: res } = await this.ax.put(`/api/internal/groups/${groupId}`, data);
        return res.data;
    }
    async updateInternalGroupImage(groupId, file) {
        const formData = new form_data_1.default();
        formData.append("file", file);
        const { data: res } = await this.ax.put(`/api/internal/groups/${groupId}/image`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    }
    async markChatMessagesAsRead(chatId) {
        const url = `/api/internal/chat/${chatId}/mark-as-read`;
        await this.ax.patch(url);
    }
    async getInternalChatsMonitor() {
        const url = `/api/internal/monitor/chats`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    setAuth(token) {
        this.ax.defaults.headers.common["Authorization"] =
            `Bearer ${token}`;
    }
}
exports.default = InternalChatClient;
