export type CrmMarketingCatalog = "campaigns" | "results";
export type CrmMarketingValue = string | number | null;
export type CrmMarketingRecord = Record<string, CrmMarketingValue> & { CODIGO: number };
export interface CrmMarketingField {
  key: string;
  type: "number" | "text" | "datetime" | "enum";
  nullable: boolean;
  defaultValue: CrmMarketingValue;
  maxLength?: number;
  values?: string[];
  min?: number;
  max?: number;
  readOnly: boolean;
}
export interface CrmMarketingPage<T> {
  data: T[];
  page: { current: number; totalRows: number };
}
export interface CrmMarketingListParams {
  page?: number;
  perPage?: number;
  CODIGO?: string;
  NOME?: string;
  TIPO?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}
export interface CrmMarketingPatch {
  changes: Record<string, CrmMarketingValue>;
  expected: Record<string, CrmMarketingValue>;
}
export type CrmExceptionKind = "cities" | "states" | "customers" | "segments";
export type CrmExceptionRecord = Record<string, CrmMarketingValue>;
export interface CrmSelectionCriteria {
  active: "SIM" | "NAO" | "all";
  unitId: number | null;
  segmentIds: number[];
  groupIds: number[];
  originIds: number[];
  operatorIds: number[];
  city: string | null;
  state: string | null;
}
export interface CrmCampaignConfiguration {
  CODIGO: number;
  SQL_CAMPANHA: string | null;
  GERADO_LISTA: "SIM" | "NAO" | null;
  criteria: CrmSelectionCriteria | null;
  managed: boolean;
}
export interface CrmSelectionPreview {
  criteria: CrmSelectionCriteria;
  totalRows: number;
  generatedSql: string;
  excludes: string[];
}
export type CrmOrderCriterion =
  | "TIPODEAGENDAMENTO"
  | "PRIORIDADECAMPANHA"
  | "DATAAGENDAMENTO"
  | "CIDADES"
  | "ESTADOS"
  | "SEGMENTOS"
  | "POTENCIAL"
  | "CADASTRO";
export interface CrmOrderingSnapshot {
  CODIGO: number;
  ORDERBY: string | null;
  SEQUENCIADEORDENACAO: string | null;
  ORDENACAO_APENAS_CIDADE: string | null;
}
export interface CrmOrdering {
  data: CrmOrderingSnapshot;
  criteria: CrmOrderCriterion[];
  supportedCriteria: CrmOrderCriterion[];
  managed: boolean;
}
export interface CrmCampaignMember {
  CODIGO: number;
  CAMPANHA: number | null;
  OPERADOR: number | null;
  OPERADOR_NOME: string | null;
  OPERADOR_ATIVO: string | null;
  writable: boolean;
  occurrences: number;
}
export interface CrmCampaignMemberOption {
  CODIGO: number;
  NOME: string | null;
  ATIVO: string | null;
}
export interface CrmCampaignMemberExpected {
  CAMPANHA: number;
  OPERADOR: number | null;
}
