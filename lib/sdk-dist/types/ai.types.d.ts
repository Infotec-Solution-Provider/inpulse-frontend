export interface SuggestResponseRequest {
    chatId: number;
}
export interface SuggestResponseResponse {
    suggestions: string[];
}
export interface SummarizeChatRequest {
    chatId: number;
}
export interface SummarizeChatResponse {
    summary: string;
}
export interface AnalyzeCustomerRequest {
    customerId: number;
}
export interface AnalyzeCustomerResponse {
    analysis: string;
}
export interface AiTenantConfig {
    instance: string;
    model: string;
    temperature: number;
    maxTokens: number;
    enabled: boolean;
}
export interface AiAgentConfig {
    instance: string;
    enabled: boolean;
    model: string;
    systemPrompt: string;
    maxMessagesPerChat: number;
    conditions: unknown;
}
