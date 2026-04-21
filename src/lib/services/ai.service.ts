import { AiClient } from "@in.pulse-crm/sdk";
import type {
  AiAgent,
  AiAgentAudienceInput,
  AiAgentAudiencePreview,
  AiAgentChatSession,
  AiAgentKnowledgeEntryInput,
  CreateAiAgentInput,
  PaginatedActionLogs,
  UpdateAiAgentInput,
} from "@/lib/types/sdk-local.types";

const NEXT_PUBLIC_AI_URL = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:8008";

class FrontendAiService extends AiClient {
  private buildAuthConfig(token: string) {
    return {
      headers: {
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      },
    };
  }

  public async listAgents(token: string) {
    const response = await this.ax.get<{ message: string; data: AiAgent[] }>(
      "/api/ai/agents",
      this.buildAuthConfig(token),
    );

    return response.data.data;
  }

  public async getAgent(agentId: number, token: string) {
    const response = await this.ax.get<{ message: string; data: AiAgent }>(
      `/api/ai/agents/${agentId}`,
      this.buildAuthConfig(token),
    );

    return response.data.data;
  }

  public async createAgent(data: CreateAiAgentInput, token: string) {
    const response = await this.ax.post<{ message: string; data: AiAgent }>(
      "/api/ai/agents",
      data,
      this.buildAuthConfig(token),
    );

    return response.data.data;
  }

  public async updateAgent(agentId: number, data: UpdateAiAgentInput, token: string) {
    const response = await this.ax.patch<{ message: string; data: AiAgent }>(
      `/api/ai/agents/${agentId}`,
      data,
      this.buildAuthConfig(token),
    );

    return response.data.data;
  }

  public async deleteAgent(agentId: number, token: string) {
    await this.ax.delete(`/api/ai/agents/${agentId}`, this.buildAuthConfig(token));
  }

  public async upsertAgentAudience(agentId: number, data: AiAgentAudienceInput, token: string) {
    const response = await this.ax.put<{ message: string; data: AiAgent }>(
      `/api/ai/agents/${agentId}/audience`,
      data,
      this.buildAuthConfig(token),
    );

    return response.data.data;
  }

  public async previewAgentAudience(
    agentId: number,
    filters: { page?: number; perPage?: number } | undefined,
    token: string,
  ) {
    const response = await this.ax.post<{
      message: string;
      data: AiAgentAudiencePreview["data"];
      page: AiAgentAudiencePreview["page"];
    }>(`/api/ai/agents/${agentId}/audience/preview`, filters ?? {}, this.buildAuthConfig(token));

    return {
      data: response.data.data,
      page: response.data.page,
    } satisfies AiAgentAudiencePreview;
  }

  public async addAgentKnowledgeEntry(agentId: number, data: AiAgentKnowledgeEntryInput, token: string) {
    const response = await this.ax.post<{ message: string; data: AiAgent }>(
      `/api/ai/agents/${agentId}/knowledge`,
      data,
      this.buildAuthConfig(token),
    );

    return response.data.data;
  }

  public async deleteAgentKnowledgeEntry(agentId: number, entryId: number, token: string) {
    await this.ax.delete(`/api/ai/agents/${agentId}/knowledge/${entryId}`, this.buildAuthConfig(token));
  }

  public async listAgentActionLogs(filters: Record<string, string | number | boolean | undefined>, token: string) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined) return;
      params.set(key, String(value));
    });

    const query = params.toString();
    const response = await this.ax.get<{ message: string; data: PaginatedActionLogs["data"]; page: PaginatedActionLogs["page"] }>(
      query ? `/api/ai/agents/logs?${query}` : "/api/ai/agents/logs",
      this.buildAuthConfig(token),
    );

    return {
      data: response.data.data,
      page: response.data.page,
    } satisfies PaginatedActionLogs;
  }

  public async listActiveSessions(token: string) {
    const response = await this.ax.get<{ message: string; data: AiAgentChatSession[] }>(
      "/api/ai/agents/sessions/active",
      this.buildAuthConfig(token),
    );

    return response.data.data;
  }
}

const aiService = new FrontendAiService(NEXT_PUBLIC_AI_URL);

export default aiService;
