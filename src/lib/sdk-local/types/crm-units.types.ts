import type { CrmMarketingRecord, CrmMarketingValue } from "./crm-marketing.types";
export const crmCampaignTypes = ["ATIVOS", "INAT_R", "INAT_A", "PROSPE"] as const;
export type CrmCampaignType = (typeof crmCampaignTypes)[number];
export interface CrmUnit {
  CODIGO: number;
  DESCRICAO: string | null;
  INATIVOS_RECENTES: number | null;
  INATIVOS_ANTIGOS: number | null;
  campaignCount?: number;
  activationAvailable?: boolean;
  mode?: string;
  pendingReasons?: { code: string; message: string }[];
  missingTypes?: string[];
  capabilities?: { rename: CrmCampaignAction };
}
export interface CrmUnitList {
  data: (CrmUnit & { campaignCount: number; activationAvailable: boolean })[];
  supportedTypes: CrmCampaignType[];
}
export interface CrmUnitDetail {
  data: CrmUnit;
  campaigns: CrmMarketingRecord[];
  supportedTypes: CrmCampaignType[];
  campaignModes?: Record<string, string>;
}
export interface CrmUnitCreate {
  fields: Pick<CrmUnit, "DESCRICAO"> &
    Partial<Pick<CrmUnit, "CODIGO" | "INATIVOS_RECENTES" | "INATIVOS_ANTIGOS">>;
  campaigns: Record<string, CrmMarketingValue>[];
}
export type CrmCampaignAction = { allowed: boolean; reasons: { code: string; message: string }[] };
export interface CrmCampaignContext {
  campaign: CrmMarketingRecord;
  unit: CrmUnit | null;
  operationMode: "audience-manual" | "purchase-cycle" | "legacy-unassigned";
  capabilities: Record<"edit" | "rename" | "resume" | "pause" | "generate", CrmCampaignAction>;
}
