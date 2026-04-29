import ApiClient from "./api-client";
import type { AiAgentConfig, AiTenantConfig, AnalyzeCustomerRequest, AnalyzeCustomerResponse, CreateSupervisorAiSessionRequest, SuggestResponseRequest, SuggestResponseResponse, SupervisorAiSession, SupervisorAiSessionDetail, SummarizeChatRequest, SummarizeChatResponse, AiAgent, AiAgentChatSession, CreateAiAgentInput, UpdateAiAgentInput, AiAgentAudienceInput, AiAgentKnowledgeEntryInput, AiAgentActionLogFilters, PaginatedActionLogs, AiAgentAudiencePreview, SendSupervisorAiMessageRequest, SendSupervisorAiMessageResponse } from "./types/ai.types";
export default class AiClient extends ApiClient {
    private authHeader;
    suggestResponse(data: SuggestResponseRequest, token: string): Promise<SuggestResponseResponse>;
    summarizeChat(data: SummarizeChatRequest, token: string): Promise<SummarizeChatResponse>;
    analyzeCustomer(data: AnalyzeCustomerRequest, token: string): Promise<AnalyzeCustomerResponse>;
    listSupervisorSessions(token: string, status?: "ACTIVE" | "ARCHIVED"): Promise<SupervisorAiSession[]>;
    createSupervisorSession(data: CreateSupervisorAiSessionRequest | undefined, token: string): Promise<SupervisorAiSession>;
    patchSupervisorSessionStatus(sessionId: number, status: "ACTIVE" | "ARCHIVED", token: string): Promise<SupervisorAiSession>;
    getSupervisorSession(sessionId: number, token: string): Promise<SupervisorAiSessionDetail>;
    sendSupervisorMessage(sessionId: number, data: SendSupervisorAiMessageRequest, token: string): Promise<SendSupervisorAiMessageResponse>;
    getTenantConfig(instance: string, token: string): Promise<AiTenantConfig>;
    upsertTenantConfig(instance: string, data: Partial<AiTenantConfig>, token: string): Promise<AiTenantConfig>;
    getAgentConfig(instance: string, token: string): Promise<AiAgentConfig | null>;
    upsertAgentConfig(instance: string, data: Partial<AiAgentConfig>, token: string): Promise<AiAgentConfig>;
    listAgents(token: string): Promise<AiAgent[]>;
    getAgent(agentId: number, token: string): Promise<AiAgent>;
    createAgent(data: CreateAiAgentInput, token: string): Promise<AiAgent>;
    updateAgent(agentId: number, data: UpdateAiAgentInput, token: string): Promise<AiAgent>;
    deleteAgent(agentId: number, token: string): Promise<void>;
    upsertAgentAudience(agentId: number, data: AiAgentAudienceInput, token: string): Promise<AiAgent>;
    previewAgentAudience(agentId: number, filters: {
        page?: number;
        perPage?: number;
    } | undefined, token: string): Promise<AiAgentAudiencePreview>;
    addAgentKnowledgeEntry(agentId: number, data: AiAgentKnowledgeEntryInput, token: string): Promise<AiAgent>;
    updateAgentKnowledgeEntry(agentId: number, entryId: number, data: Partial<AiAgentKnowledgeEntryInput>, token: string): Promise<AiAgent>;
    deleteAgentKnowledgeEntry(agentId: number, entryId: number, token: string): Promise<void>;
    listAgentActionLogs(filters: AiAgentActionLogFilters, token: string): Promise<PaginatedActionLogs>;
    listActiveSessions(token: string): Promise<AiAgentChatSession[]>;
}
