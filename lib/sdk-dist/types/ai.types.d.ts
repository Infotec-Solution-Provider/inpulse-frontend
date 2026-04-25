import type { CustomerAgeLevel, CustomerInteractionLevel, CustomerProfileSummaryLevel, CustomerPurchaseInterestLevel, CustomerPurchaseLevel, WppContactWithCustomer } from "./whatsapp.types";
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
export type AiAgentTriggerType = "MESSAGE_DURING_HOURS" | "RESPONSE_TIMEOUT" | "KEYWORD" | "ALWAYS";
export type AiAgentProactiveFrequency = "DAILY" | "WEEKDAYS" | "CUSTOM_DAYS";
export type AiAgentProactiveEntryMessageMode = "AI_TEXT" | "WABA_TEMPLATE";
export type AiAgentActionType = "REPLY" | "SEND_TEMPLATE" | "SEND_FILE" | "ESCALATE" | "CLOSE_CHAT" | "UPDATE_CRM" | "SCHEDULE" | "IGNORED";
export type AiAgentChatSessionStatus = "ACTIVE" | "PAUSED" | "FINISHED";
export interface AiAgentTrigger {
    id: number;
    agentId: number;
    type: AiAgentTriggerType;
    config: Record<string, unknown>;
}
export interface AiAgentAudienceDefinition {
    id: number;
    agentId: number;
    filtersJson: Record<string, unknown>;
    manualIncludeJson: Record<string, unknown>;
    manualExcludeJson: Record<string, unknown>;
}
export interface AiAgentKnowledgeEntry {
    id: number;
    agentId: number;
    title: string;
    content: string;
    fileId: number | null;
    fileName: string | null;
    fileType: string | null;
    fileSize: number | null;
    order: number;
}
export interface AiAgentProactiveSchedule {
    frequency: AiAgentProactiveFrequency;
    timezone: string;
    startTime: string;
    daysOfWeek: number[];
}
export interface AiAgentProactiveConfig {
    enabled: boolean;
    schedule: AiAgentProactiveSchedule;
    batchSize: number;
    entryMessageMode: AiAgentProactiveEntryMessageMode;
    skipContactsWithOpenChat: boolean;
}
export interface AiAgent {
    id: number;
    instance: string;
    name: string;
    description: string | null;
    enabled: boolean;
    systemPrompt: string;
    model: string;
    temperature: number;
    maxTokens: number;
    maxTurnsPerChat: number;
    cooldownSeconds: number;
    allowedActions: AiAgentActionType[];
    proactiveConfig: AiAgentProactiveConfig | null;
    templateName: string | null;
    templateLanguage: string | null;
    templateVariableMapping: Record<string, string> | null;
    escalateToWalletId: number | null;
    escalateToUserId: number | null;
    createdAt: string;
    updatedAt: string;
    triggers: AiAgentTrigger[];
    audience: AiAgentAudienceDefinition | null;
    knowledgeEntries: AiAgentKnowledgeEntry[];
}
export interface AiAgentChatSession {
    id: number;
    agentId: number;
    chatId: number;
    instance: string;
    status: AiAgentChatSessionStatus;
    turnCount: number;
    startedAt: string;
    finishedAt: string | null;
    lastRepliedAt: string | null;
}
export interface AiAgentActionLog {
    id: number;
    agentId: number;
    sessionId: number | null;
    chatId: number;
    instance: string;
    actionType: AiAgentActionType;
    success: boolean;
    errorMessage: string | null;
    payload: Record<string, unknown> | null;
    createdAt: string;
}
export interface AiAgentAudienceFilters {
    profileLevel?: CustomerProfileSummaryLevel;
    interactionLevel?: CustomerInteractionLevel;
    purchaseLevel?: CustomerPurchaseLevel;
    ageLevel?: CustomerAgeLevel;
    purchaseInterestLevel?: CustomerPurchaseInterestLevel;
    state?: string;
    city?: string;
    activeCustomer?: "SIM" | "NAO";
    searchTerm?: string;
    segmentIds?: number[];
    campaignIds?: number[];
    operatorIds?: number[];
}
export interface AiAgentManualList {
    contactIds?: number[];
    phones?: string[];
    customerIds?: number[];
}
export interface AiAgentAudienceInput {
    filters?: AiAgentAudienceFilters;
    manualInclude?: AiAgentManualList;
    manualExclude?: AiAgentManualList;
}
export interface AiAgentTriggerInput {
    type: AiAgentTriggerType;
    config?: {
        timeoutMinutes?: number;
        keywords?: string[];
        startTime?: string;
        endTime?: string;
        timezone?: string;
    };
}
export interface AiAgentKnowledgeEntryInput {
    title: string;
    content: string;
    fileId?: number;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    order?: number;
}
export interface CreateAiAgentInput {
    name: string;
    description?: string;
    enabled?: boolean;
    systemPrompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    maxTurnsPerChat?: number;
    allowedActions: AiAgentActionType[];
    proactiveConfig?: AiAgentProactiveConfig | null;
    templateName?: string;
    templateLanguage?: string;
    templateVariableMapping?: Record<string, string>;
    escalateToWalletId?: number;
    escalateToUserId?: number;
    triggers?: AiAgentTriggerInput[];
    knowledgeEntries?: AiAgentKnowledgeEntryInput[];
    audience?: AiAgentAudienceInput;
}
export type UpdateAiAgentInput = Partial<CreateAiAgentInput>;
export interface AiAgentActionLogFilters {
    agentId?: number;
    chatId?: number;
    actionType?: string;
    success?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    perPage?: number;
}
export interface PaginatedActionLogs {
    data: AiAgentActionLog[];
    page: {
        totalRows: number;
        current: number;
    };
}
export interface AiAgentAudiencePreview {
    data: WppContactWithCustomer[];
    page: {
        totalRows: number;
        current: number;
    };
}
