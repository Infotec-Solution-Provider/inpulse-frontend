"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = __importDefault(require("./api-client"));
class AiClient extends api_client_1.default {
    authHeader(token) {
        return { Authorization: `Bearer ${token}` };
    }
    async suggestResponse(data, token) {
        const { data: res } = await this.ax.post("/api/ai/completions/suggest-response", data, { headers: this.authHeader(token) });
        return res.data;
    }
    async summarizeChat(data, token) {
        const { data: res } = await this.ax.post("/api/ai/completions/summarize-chat", data, { headers: this.authHeader(token) });
        return res.data;
    }
    async analyzeCustomer(data, token) {
        const { data: res } = await this.ax.post("/api/ai/completions/analyze-customer", data, { headers: this.authHeader(token) });
        return res.data;
    }
    async getTenantConfig(instance, token) {
        const { data: res } = await this.ax.get(`/api/ai/tenant-config/${instance}`, { headers: this.authHeader(token) });
        return res.data;
    }
    async upsertTenantConfig(instance, data, token) {
        const { data: res } = await this.ax.put(`/api/ai/tenant-config/${instance}`, data, { headers: this.authHeader(token) });
        return res.data;
    }
    async getAgentConfig(instance, token) {
        const { data: res } = await this.ax.get(`/api/ai/agent-config/${instance}`, { headers: this.authHeader(token) });
        return res.data;
    }
    async upsertAgentConfig(instance, data, token) {
        const { data: res } = await this.ax.put(`/api/ai/agent-config/${instance}`, data, { headers: this.authHeader(token) });
        return res.data;
    }
}
exports.default = AiClient;
