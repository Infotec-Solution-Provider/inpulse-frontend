export type CrmYesNo = "SIM" | "NAO" | null;
export interface CrmUserGroup { CODIGO: number; DESCRICAO: string | null }
export type CrmShift = { CODIGO: number; DESCRICAO: string | null }
  & Record<`HORARIO_${1 | 2 | 3}`, CrmYesNo>
  & Record<`${"ENTRADA" | "SAIDA"}_${1 | 2 | 3}`, string | null>;
export interface CrmPauseReason { CODIGO: number; DESCRICAO: string | null; TEMPO_MAX_SEG: number | null; PRODUTIVIDADE: CrmYesNo }
export interface CrmSalesType { ID: string; NOME: string; PAGAMENTO: string; ID_COUNT?: number }
export interface CrmUserCatalogRecords { "user-groups": CrmUserGroup; shifts: CrmShift; "pause-reasons": CrmPauseReason; "sales-types": CrmSalesType }
export type CrmUserCatalogName = keyof CrmUserCatalogRecords;
export type CrmUserCatalogExpected<K extends CrmUserCatalogName> = K extends "sales-types" ? Omit<CrmSalesType, "ID_COUNT"> : Omit<CrmUserCatalogRecords[K], "CODIGO">;
export type CreateCrmUserCatalogRequest<K extends CrmUserCatalogName> = K extends "sales-types" ? Omit<CrmSalesType, "ID_COUNT"> : { CODIGO: number; DESCRICAO: string } & Partial<CrmUserCatalogExpected<K>>;
export interface CrmUserCatalogListParams { page?: number; perPage?: number; CODIGO?: number; DESCRICAO?: string; ID?: string; NOME?: string; sortBy?: string; sortDirection?: "asc" | "desc" }
export interface CrmUserGroupMember { CODIGO: number; GRUPO: number; OPERADOR: number | null; OPERADOR_NOME: string | null; OPERADOR_ATIVO: string | null }
export interface CrmUserShiftAssignment { CODIGO: number; HORARIO: number | null }
export interface CrmUserOption { CODIGO: number; NOME: string; ATIVO?: string | null }
export interface CrmUserRegistrationField { name: string; type: "text" | "password" | "number" | "date" | "select"; label: string; group: string; nullable: boolean; maxLength?: number; options?: string[]; requiredOnCreate?: boolean }
export type CrmUserRegistrationRecord = Record<string, string | number | null> & { CODIGO: number };
export interface CrmUserRegistrationDetail { record: CrmUserRegistrationRecord; version: string; fields: CrmUserRegistrationField[] }
