export interface CrmPurchaseRecord {
  CODIGO: number;
  CLIENTE: number | null;
  DATA: string | null;
  /** Original DOUBLE rendered as text; never round a historical snapshot before editing. */
  VALOR: string | null;
  DESCRICAO: string | null;
  FORMA_PGTO: string | null;
  OPERADOR: number | null;
  FATURADO: string | null;
  TIPO: string | null;
  SITUACAO: string | null;
  CLIENTEATIVO: number | null;
}
export interface CrmPurchaseSnapshot {
  record: CrmPurchaseRecord;
  version: string;
  customerName: string | null;
  operatorName: string | null;
  writable: boolean;
}
export interface CrmPurchaseField {
  name: keyof CrmPurchaseRecord;
  label: string;
  type: "integer" | "date" | "decimal" | "text" | "enum";
  nullable: boolean;
  maxLength?: number;
  options?: string[];
  requiredOnCreate?: boolean;
  immutable?: boolean;
  readOnly?: boolean;
}
export interface CrmPurchasesSchema {
  fields: CrmPurchaseField[];
  manualCode: false;
  amountStorage: "DOUBLE";
  amountScale: 2;
  amountMax: string;
}
export type CrmPurchaseInput = Partial<Omit<CrmPurchaseRecord, "CODIGO" | "CLIENTEATIVO">>;
export interface CrmPurchasePatch { changes: Omit<CrmPurchaseInput, "CLIENTE">; version: string }
export interface CrmPurchasesFilters {
  page?: number;
  perPage?: number;
  customerId?: number;
  operatorId?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  situation?: "F" | "C";
  invoiced?: "S" | "N";
  sortBy?: "CODIGO" | "DATA" | "VALOR" | "DESCRICAO";
  sortDirection?: "asc" | "desc";
}
export interface CrmPurchaseLookup { CODIGO: number; label: string | null; active: string | null }
export interface CrmPurchaseLookupFilters { search?: string; id?: number; page?: number; perPage?: number }
