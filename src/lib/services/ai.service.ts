import { AiClient } from "@/lib/sdk-local";
import type {
  AiAgent,
  AiAgentAudienceInput,
  AiAgentAudiencePreview,
  AiAgentChatSession,
  AiAgentKnowledgeEntryInput,
  AiFeatureModels,
  AiTenantConfig,
  AiUsageSummary,
  CreateAiAgentInput,
  PaginatedActionLogs,
  SendSupervisorAiMessageRequest,
  SendSupervisorAiMessageResponse,
  UpdateAiAgentInput,
} from "@/lib/types/sdk-local.types";
import { authenticatedFetch } from "@/lib/auth-session";

const NEXT_PUBLIC_AI_URL = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:8008";

class FrontendAiService extends AiClient {
  private buildAuthConfig(token: string) {
    return {
      headers: {
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      },
    };
  }

  public async streamSupervisorMessage(
		sessionId: number,
		data: SendSupervisorAiMessageRequest,
		token: string,
		options: { signal: AbortSignal; onDelta: (text: string) => void },
	): Promise<SendSupervisorAiMessageResponse> {
		const baseUrl = String(this.ax.defaults.baseURL ?? "").replace(/\/$/, "");
		const response = await authenticatedFetch(`${baseUrl}/api/ai/supervisor-chat/sessions/${sessionId}/messages/stream`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
			},
			body: JSON.stringify(data),
			signal: options.signal,
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => null) as { message?: string } | null;
			throw new Error(errorBody?.message || `Falha ao iniciar streaming (${response.status}).`);
		}

		if (!response.body) {
			throw new Error("O navegador não disponibilizou o fluxo da resposta.");
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		let result: SendSupervisorAiMessageResponse | null = null;

		const processBlock = (block: string) => {
			let event = "message";
			const dataLines: string[] = [];
			for (const line of block.split("\n")) {
				if (line.startsWith("event:")) event = line.slice(6).trim();
				if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
			}
			if (dataLines.length === 0) return;
			const payload = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
			if (event === "delta" && typeof payload.text === "string") options.onDelta(payload.text);
			if (event === "result") result = payload as unknown as SendSupervisorAiMessageResponse;
			if (event === "error") throw new Error(typeof payload.message === "string" ? payload.message : "Falha no streaming da IA.");
		};

		while (true) {
			const { done, value } = await reader.read();
			buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
			let boundary = buffer.indexOf("\n\n");
			while (boundary >= 0) {
				const block = buffer.slice(0, boundary);
				buffer = buffer.slice(boundary + 2);
				if (block.trim()) processBlock(block);
				boundary = buffer.indexOf("\n\n");
			}
			if (done) break;
		}

		if (buffer.trim()) processBlock(buffer);
		if (!result) throw new Error("O streaming terminou sem confirmar a resposta persistida.");
		return result;
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
