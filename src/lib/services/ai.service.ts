import { AiClient } from "@/lib/sdk-local";
import type {
  AiAgent,
  AiAgentAudienceInput,
  AiAgentAudiencePreview,
  AiAgentChatSession,
  AiAgentKnowledgeEntryInput,
  AiFeatureModels,
  AiOpenAiKeyStatus,
  AiTenantConfig,
  AiUsageSummary,
  CreateAiAgentInput,
  PaginatedActionLogs,
  SendSupervisorAiMessageRequest,
  SendSupervisorAiMessageResponse,
  UpdateAiAgentInput,
} from "@/lib/types/sdk-local.types";
import { authenticatedFetch } from "@/lib/auth-session";
import {
  readSupervisorStream,
  STREAM_CONNECTION_ERROR_MESSAGE,
  streamErrorFromResponse,
  SupervisorStreamError,
  type SupervisorStreamHandlers,
} from "@/lib/utils/supervisor-stream";

export { SupervisorStreamError } from "@/lib/utils/supervisor-stream";

const NEXT_PUBLIC_AI_URL = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:8008";

class FrontendAiService extends AiClient {
  private buildAuthConfig(token: string) {
    return {
      headers: {
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      },
    };
  }

  /**
   * Envia a pergunta ao Assistente do gestor e acompanha a resposta por streaming.
   * Falhas chegam como SupervisorStreamError (code, retryable e, quando a pergunta
   * já foi gravada, as mensagens persistidas); a interrupção pelo usuário mantém o AbortError.
   */
  public async streamSupervisorMessage(
		sessionId: number,
		data: SendSupervisorAiMessageRequest,
		token: string,
		options: { signal: AbortSignal } & SupervisorStreamHandlers,
	): Promise<SendSupervisorAiMessageResponse> {
		const baseUrl = String(this.ax.defaults.baseURL ?? "").replace(/\/$/, "");
		let response: Response;
		try {
			response = await authenticatedFetch(`${baseUrl}/api/ai/supervisor-chat/sessions/${sessionId}/messages/stream`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
				},
				body: JSON.stringify(data),
				signal: options.signal,
			});
		} catch (error) {
			if (options.signal.aborted) throw error;
			throw new SupervisorStreamError(STREAM_CONNECTION_ERROR_MESSAGE, { code: "connection", retryable: true });
		}

		if (!response.ok) {
			const errorBody = await response.json().catch(() => null) as unknown;
			throw streamErrorFromResponse(response.status, errorBody);
		}

		if (!response.body) {
			throw new SupervisorStreamError("O navegador não conseguiu acompanhar a resposta do assistente.", { code: "connection", retryable: true });
		}

		return readSupervisorStream(response.body, {
			onDelta: options.onDelta,
			onStep: options.onStep,
			onReset: options.onReset,
		}, options.signal);
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

  public async getTenantConfig(instance: string, token: string): Promise<AiTenantConfig> {
    const response = await this.ax.get<{ message: string; data: AiTenantConfig }>(
      `/api/ai/tenant-config/${instance}`,
      this.buildAuthConfig(token),
    );
    return response.data.data;
  }

  public async upsertTenantConfig(
    instance: string,
    data: Partial<{
      model: string;
      temperature: number;
      maxTokens: number;
      enabled: boolean;
      monthlyBudgetUsd: number | null;
      availableModels: string[] | null;
      featureModels: AiFeatureModels | null;
      operatorBudgets: Record<string, number> | null;
    }>,
    token: string,
  ): Promise<AiTenantConfig> {
    const response = await this.ax.put<{ message: string; data: AiTenantConfig }>(
      `/api/ai/tenant-config/${instance}`,
      data,
      this.buildAuthConfig(token),
    );
    return response.data.data;
  }

  /** Cadastra (ou troca) a chave da OpenAI do tenant; o ai-service confere a chave antes de gravar. */
  public async setOpenAiKey(instance: string, apiKey: string, token: string): Promise<AiOpenAiKeyStatus> {
    const response = await this.ax.put<{ message: string; data: AiOpenAiKeyStatus }>(
      `/api/ai/tenant-config/${instance}/openai-key`,
      { apiKey },
      this.buildAuthConfig(token),
    );
    return response.data.data;
  }

  public async clearOpenAiKey(instance: string, token: string): Promise<AiOpenAiKeyStatus> {
    const response = await this.ax.delete<{ message: string; data: AiOpenAiKeyStatus }>(
      `/api/ai/tenant-config/${instance}/openai-key`,
      this.buildAuthConfig(token),
    );
    return response.data.data;
  }

  public async getUsageSummary(period: string, token: string): Promise<AiUsageSummary> {
    const response = await this.ax.get<{ message: string; data: AiUsageSummary }>(
      `/api/ai/usage?period=${encodeURIComponent(period)}`,
      this.buildAuthConfig(token),
    );
    return response.data.data;
  }
}

const aiService = new FrontendAiService(NEXT_PUBLIC_AI_URL);

export default aiService;
