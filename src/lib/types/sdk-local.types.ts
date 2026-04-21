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
  CreateAiAgentInput,
  PaginatedActionLogs,
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
