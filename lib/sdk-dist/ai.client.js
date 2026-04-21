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
    // ─── AI Agents CRUD ───────────────────────────────────────────────────────
    async listAgents(token) {
        const { data: res } = await this.ax.get("/api/ai/agents", { headers: this.authHeader(token) });
        return res.data;
    }
    async getAgent(agentId, token) {
        const { data: res } = await this.ax.get(`/api/ai/agents/${agentId}`, { headers: this.authHeader(token) });
        return res.data;
    }
    async createAgent(data, token) {
        const { data: res } = await this.ax.post("/api/ai/agents", data, { headers: this.authHeader(token) });
        return res.data;
    }
    async updateAgent(agentId, data, token) {
        const { data: res } = await this.ax.patch(`/api/ai/agents/${agentId}`, data, { headers: this.authHeader(token) });
        return res.data;
    }
    async deleteAgent(agentId, token) {
        await this.ax.delete(`/api/ai/agents/${agentId}`, { headers: this.authHeader(token) });
    }
    async upsertAgentAudience(agentId, data, token) {
        const { data: res } = await this.ax.put(`/api/ai/agents/${agentId}/audience`, data, { headers: this.authHeader(token) });
        return res.data;
    }
    async previewAgentAudience(agentId, filters, token) {
        const { data: res } = await this.ax.post(`/api/ai/agents/${agentId}/audience/preview`, undefined, {
            params: filters,
            headers: this.authHeader(token),
        });
        return { data: res.data, page: res.page };
    }
    async addAgentKnowledgeEntry(agentId, data, token) {
        const { data: res } = await this.ax.post(`/api/ai/agents/${agentId}/knowledge`, data, { headers: this.authHeader(token) });
        return res.data;
    }
    async updateAgentKnowledgeEntry(agentId, entryId, data, token) {
        const { data: res } = await this.ax.patch(`/api/ai/agents/${agentId}/knowledge/${entryId}`, data, { headers: this.authHeader(token) });
        return res.data;
    }
    async deleteAgentKnowledgeEntry(agentId, entryId, token) {
        await this.ax.delete(`/api/ai/agents/${agentId}/knowledge/${entryId}`, {
            headers: this.authHeader(token),
        });
    }
    async listAgentActionLogs(filters, token) {
        const { data: res } = await this.ax.get("/api/ai/agents/logs", {
            params: filters,
            headers: this.authHeader(token),
        });
        return res.data;
    }
    async listActiveSessions(token) {
        const { data: res } = await this.ax.get("/api/ai/agents/sessions/active", { headers: this.authHeader(token) });
        return res.data;
    }
}
exports.default = AiClient;
