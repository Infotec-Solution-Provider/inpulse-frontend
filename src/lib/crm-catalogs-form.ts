import type { CrmCatalogName } from "./sdk-local/types/crm-catalogs.types";

export type CatalogRecord = Record<string, string | number | null>;
export type CatalogDraft = Record<string, string>;
export interface CatalogField {
  key: string;
  label: string;
  kind?: "integer" | "unit";
  maxLength?: number;
  required?: boolean;
  help?: string;
}
export interface CatalogDefinition {
  title: string;
  singular: string;
  description: string;
  identity: "CODIGO" | "UF";
  autoId?: boolean;
  fields: CatalogField[];
}
const description = (maxLength: number): CatalogField => ({
  key: "DESCRICAO",
  label: "Descrição",
  maxLength,
  required: true,
});
const name = (maxLength: number): CatalogField => ({
  key: "NOME",
  label: "Nome",
  maxLength,
  required: true,
});
const order = (key: string, label: string): CatalogField => ({
  key,
  label,
  kind: "integer",
  help: "Vazio preserva o padrão na criação e grava sem valor na edição.",
});

export const CRM_CATALOGS: Record<CrmCatalogName, CatalogDefinition> = {
  "customer-groups": {
    title: "Grupos de clientes",
    singular: "grupo",
    description: "Organize os grupos usados no cadastro de clientes.",
    identity: "CODIGO",
    fields: [description(35)],
  },
  positions: {
    title: "Cargos dos contatos",
    singular: "cargo",
    description: "Mantenha os cargos associados aos contatos de cada cliente.",
    identity: "CODIGO",
    fields: [description(50)],
  },
  origins: {
    title: "Origens de clientes",
    singular: "origem",
    description: "Mantenha as origens utilizadas no cadastro e nos relatórios de clientes.",
    identity: "CODIGO",
    fields: [description(35)],
  },
  brands: {
    title: "Marcas",
    singular: "marca",
    description: "Cadastre as marcas e sua unidade de atendimento.",
    identity: "CODIGO",
    autoId: true,
    fields: [
      description(60),
      { key: "COD_ERPMARCA", label: "Código da marca no ERP", maxLength: 20 },
      { key: "UNIDADE", label: "Unidade", kind: "unit", required: true },
    ],
  },
  medias: {
    title: "Mídias CRM",
    singular: "mídia",
    description: "Mantenha as mídias associadas à origem dos clientes.",
    identity: "CODIGO",
    fields: [
      name(35),
      order("PRIORIDADE", "Prioridade"),
      { key: "COD_UNIDADE", label: "Unidade", kind: "unit" },
    ],
  },
  cities: {
    title: "Cidades CRM",
    singular: "cidade",
    description: "Administre o catálogo e os campos de ordenação das cidades do CRM.",
    identity: "CODIGO",
    fields: [
      name(40),
      {
        key: "UF",
        label: "Estado",
        maxLength: 50,
        help: "Selecione um estado cadastrado. Referências históricas são preservadas.",
      },
      order("ORDEM", "Ordem"),
      order("ORDEMESTADO", "Ordem do estado"),
      order("ORDEMCIDADE", "Ordem da cidade"),
    ],
  },
  states: {
    title: "Estados CRM",
    singular: "estado",
    description: "Mantenha os estados e os valores de ordenação e fuso do CRM.",
    identity: "UF",
    fields: [
      name(35),
      order("ORDEM", "Ordem"),
      {
        key: "FUSOHORARIO",
        label: "Fuso horário CRM",
        kind: "integer",
        help: "Valor numérico do CRM. Vazio usa zero no cadastro.",
      },
    ],
  },
};

export function isCrmCatalog(value: string): value is CrmCatalogName {
  return Object.hasOwn(CRM_CATALOGS, value);
}
export function catalogDraft(catalog: CrmCatalogName, record?: CatalogRecord): CatalogDraft {
  const definition = CRM_CATALOGS[catalog];
  return Object.fromEntries(
    [definition.identity, ...definition.fields.map((field) => field.key)].map((key) => [
      key,
      record?.[key]?.toString() ?? "",
    ]),
  );
}
export function catalogExpected(catalog: CrmCatalogName, record: CatalogRecord): CatalogRecord {
  return Object.fromEntries(
    CRM_CATALOGS[catalog].fields.map((field) => [field.key, record[field.key]]),
  );
}
export function validateCatalogDraft(
  catalog: CrmCatalogName,
  draft: CatalogDraft,
  original?: CatalogRecord,
) {
  const definition = CRM_CATALOGS[catalog];
  const errors: Record<string, string> = {};
  const changes: CatalogRecord = {};
  const compatible = (value: string) =>
    Array.from(value).every(
      (char) =>
        char.charCodeAt(0) <= 255 && !(char.charCodeAt(0) >= 128 && char.charCodeAt(0) < 160),
    );
  const integer = (value: string) =>
    /^-?\d+$/.test(value) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) >= -2147483648 &&
    Number(value) <= 2147483647;
  if (!original && !definition.autoId) {
    const value = (draft[definition.identity] ?? "").trim();
    if (definition.identity === "UF") {
      if (!/^[A-Z]{2}$/.test(value)) errors.UF = "Informe uma sigla com duas letras maiúsculas.";
      changes.UF = value;
    } else {
      if (!integer(value) || Number(value) <= 0)
        errors.CODIGO = "Informe um código inteiro positivo até 2147483647.";
      changes.CODIGO = Number(value);
    }
  }
  for (const field of definition.fields) {
    const raw = draft[field.key] ?? "";
    // Preserve untouched historical NULL, whitespace and charset bytes in expected snapshots.
    if (original && raw === (original[field.key]?.toString() ?? "")) continue;
    const value = raw.trim();
    if (field.kind === "integer" || field.kind === "unit") {
      if (value && (!integer(value) || (field.kind === "unit" && Number(value) <= 0)))
        errors[field.key] =
          field.kind === "unit"
            ? "Selecione uma unidade cadastrada."
            : "Informe um número inteiro entre -2147483648 e 2147483647.";
      if (!value && field.required) errors[field.key] = "Selecione uma unidade cadastrada.";
      if (value) changes[field.key] = Number(value);
      else if (original) {
        if (field.key === "FUSOHORARIO")
          errors[field.key] = "Informe o valor numérico de fuso do CRM.";
        else changes[field.key] = null;
      }
    } else {
      if (
        (!value && field.required) ||
        (field.maxLength && Array.from(value).length > field.maxLength) ||
        !compatible(value)
      )
        errors[field.key] =
          `Informe ${field.required ? "um texto" : "texto"} com até ${field.maxLength} caracteres compatíveis com o CRM.`;
      if (catalog === "cities" && field.key === "UF" && value && !/^[A-Z]{2}$/.test(value))
        errors.UF = "Selecione um estado cadastrado.";
      if (value || field.required) changes[field.key] = value;
      else if (original || field.key === "COD_ERPMARCA" || field.key === "UF")
        changes[field.key] = null;
    }
  }
  return {
    errors,
    changes,
    valid: Object.keys(errors).length === 0,
    hasChanges: Object.keys(changes).length > 0,
  };
}
