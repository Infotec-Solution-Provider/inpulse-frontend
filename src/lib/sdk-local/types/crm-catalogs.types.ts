export interface CrmCatalogRecords {
  "customer-groups": { CODIGO: number; DESCRICAO: string | null };
  positions: { CODIGO: number; DESCRICAO: string | null };
  origins: { CODIGO: number; DESCRICAO: string | null };
  brands: { CODIGO: number; DESCRICAO: string; COD_ERPMARCA: string | null; UNIDADE: number };
  medias: {
    CODIGO: number;
    NOME: string | null;
    PRIORIDADE: number | null;
    COD_UNIDADE: number | null;
  };
  cities: {
    CODIGO: number;
    NOME: string | null;
    UF: string | null;
    ORDEMESTADO: number | null;
    ORDEM: number | null;
    ORDEMCIDADE: number | null;
  };
  states: { UF: string; NOME: string | null; ORDEM: number | null; FUSOHORARIO: number };
}

export type CrmCatalogName = keyof CrmCatalogRecords;
export type CrmCatalogRow = CrmCatalogRecords[CrmCatalogName];
export type CrmCatalogExpected<K extends CrmCatalogName> = Omit<
  CrmCatalogRecords[K],
  K extends "states" ? "UF" : "CODIGO"
>;
export type CreateCrmCatalogRequest<K extends CrmCatalogName> = K extends "brands"
  ? Omit<CrmCatalogRecords[K], "CODIGO" | "COD_ERPMARCA"> & { COD_ERPMARCA?: string | null }
  : K extends "states"
    ? { UF: string; NOME: string } &
        Partial<Pick<CrmCatalogRecords["states"], "ORDEM" | "FUSOHORARIO">>
    : K extends "medias"
      ? { CODIGO: number; NOME: string } &
          Partial<Pick<CrmCatalogRecords["medias"], "PRIORIDADE" | "COD_UNIDADE">>
      : K extends "cities"
        ? { CODIGO: number; NOME: string } &
            Partial<
              Pick<CrmCatalogRecords["cities"], "UF" | "ORDEMESTADO" | "ORDEM" | "ORDEMCIDADE">
            >
        : { CODIGO: number; DESCRICAO: string };
export interface UpdateCrmCatalogRequest<K extends CrmCatalogName> {
  changes: Partial<CrmCatalogExpected<K>>;
  expected: CrmCatalogExpected<K>;
}
export interface CrmCatalogListParams {
  page?: number;
  perPage?: number;
  search?: string;
  id?: string | number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}
export interface CrmUnitOption {
  CODIGO: number;
  DESCRICAO: string | null;
}
export interface CrmStateOption {
  UF: string;
  NOME: string | null;
}
