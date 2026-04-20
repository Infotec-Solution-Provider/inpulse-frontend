import ApiClient from "./api-client";
import type { AiAgentConfig, AiTenantConfig, AnalyzeCustomerRequest, AnalyzeCustomerResponse, SuggestResponseRequest, SuggestResponseResponse, SummarizeChatRequest, SummarizeChatResponse } from "./types/ai.types";
export default class AiClient extends ApiClient {
    private authHeader;
    suggestResponse(data: SuggestResponseRequest, token: string): Promise<SuggestResponseResponse>;
    summarizeChat(data: SummarizeChatRequest, token: string): Promise<SummarizeChatResponse>;
    analyzeCustomer(data: AnalyzeCustomerRequest, token: string): Promise<AnalyzeCustomerResponse>;
    getTenantConfig(instance: string, token: string): Promise<AiTenantConfig>;
    upsertTenantConfig(instance: string, data: Partial<AiTenantConfig>, token: string): Promise<AiTenantConfig>;
    getAgentConfig(instance: string, token: string): Promise<AiAgentConfig | null>;
    upsertAgentConfig(instance: string, data: Partial<AiAgentConfig>, token: string): Promise<AiAgentConfig>;
}
