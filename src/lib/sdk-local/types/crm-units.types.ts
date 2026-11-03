import type { CrmMarketingRecord, CrmMarketingValue } from "./crm-marketing.types";
export const crmCampaignTypes = ["ATIVOS", "INAT_R", "INAT_A", "PROSPE"] as const;
export type CrmCampaignType = (typeof crmCampaignTypes)[number];
export interface CrmUnit {
  CODIGO: number;
  DESCRICAO: string | null;
  INATIVOS_RECENTES: number | null;
  INATIVOS_ANTIGOS: number | null;
}
export interface CrmUnitList {
  data: (CrmUnit & { campaignCount: number; activationAvailable: boolean })[];
  supportedTypes: CrmCampaignType[];
}
export interface CrmUnitDetail {
  data: CrmUnit;
  campaigns: CrmMarketingRecord[];
  supportedTypes: CrmCampaignType[];
}
export interface CrmUnitCreate {
  fields: CrmUnit;
  campaigns: Record<string, CrmMarketingValue>[];
}
