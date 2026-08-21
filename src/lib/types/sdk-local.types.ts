import type { AiAgentAudienceFilters as BaseAiAgentAudienceFilters } from "../../../lib/sdk-dist/types/ai.types";

export type {
  AiAgent,
  AiAgentActionLog,
  AiAgentActionLogFilters,
  AiAgentActionType,
  AiAgentAudienceDefinition,
  AiAgentAudienceInput,
  AiAgentAudiencePreview,
  AiAgentChatSession,
  AiAgentKnowledgeEntry,
  AiAgentKnowledgeEntryInput,
  AiAgentProactiveConfig,
  AiAgentProactiveEntryMessageMode,
  AiAgentProactiveFrequency,
  AiAgentProactiveSchedule,
  AiAgentTrigger,
  AiAgentTriggerInput,
  AiAgentTriggerType,
  AiFeatureModels,
  AiFeatureUsageStat,
  AiOperatorUsageStat,
  AiTenantConfig,
  AiUsageSummary,
  CreateAiAgentInput,
  CreateSupervisorAiSessionRequest,
  DecideSupervisorAiActionRequest,
  PaginatedActionLogs,
  SendSupervisorAiMessageRequest,
  SendSupervisorAiMessageResponse,
  SupervisorAiContextInput,
  SupervisorAiAction,
  SupervisorAiActionStatus,
  SupervisorAiActionType,
  SupervisorAiMessage,
  SupervisorAiMessageMetadata,
  SupervisorAiMessageRole,
  SupervisorAiReportFormat,
  SupervisorAiGeneratedReportArtifact,
  SupervisorAiReportPreview,
  SupervisorAiReasoningEffort,
  SupervisorAiSession,
  SupervisorAiChatMode,
  SupervisorAiSessionDetail,
  SupervisorAiSessionStatus,
  SupervisorAiSource,
  UpdateSupervisorAiSessionRequest,
  UpdateAiAgentInput,
} from "../../../lib/sdk-dist/types/ai.types";

export interface AiAgentAudienceFilters extends BaseAiAgentAudienceFilters {
  state?: string;
}

export type {
  CustomerAgeLevel,
  CustomerInteractionLevel,
  CustomerProfileSummaryLevel,
  CustomerPurchaseInterestLevel,
  CustomerPurchaseLevel,
  WppContactWithCustomer,
} from "../../../lib/sdk-dist/types/whatsapp.types";

export type { CustomerLookupOption } from "../../../lib/sdk-dist/types/customers.types";
