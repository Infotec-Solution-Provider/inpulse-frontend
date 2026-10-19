import type { CrmPurchaseField, CrmPurchaseRecord } from "./sdk-local/types/crm-purchases.types";

export const purchaseFields = [
  "CLIENTE",
  "OPERADOR",
  "DATA",
  "VALOR",
  "DESCRICAO",
  "FORMA_PGTO",
] as const;
export type PurchaseField = (typeof purchaseFields)[number];
export type PurchaseDraft = Record<PurchaseField, string>;
export function purchaseDraft(record?: CrmPurchaseRecord): PurchaseDraft {
  return Object.fromEntries(
    purchaseFields.map((field) => [field, record?.[field] == null ? "" : String(record[field])]),
  ) as PurchaseDraft;
}
/** Accept BR input without passing a financial value through floating point. */
export function purchaseAmount(value: string): string | null {
  const text = value.trim();
  if (text.includes(",") && !/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(text)) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const result = `${whole.replace(/^0+(?=\d)/, "")}.${fraction.padEnd(2, "0")}`;
  return /^0\.00$/.test(result) ? null : result;
}
export function displayPurchaseAmount(value: string | null): string {
  if (value == null || value === "") return "—";
  // Historical DOUBLE values can have more than two decimals. Display all of
  // them and preserve the original snapshot, instead of silently rounding.
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return value;
  const [whole, fraction = "00"] = value.split(".");
  return `R$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction.padEnd(2, "0")}`;
}
export function validatePurchaseDraft(
  draft: PurchaseDraft,
  fields: CrmPurchaseField[],
  record?: CrmPurchaseRecord,
  amountMax = "999999999999.99",
) {
  const changes: Record<string, string | number | null> = {},
    errors: Partial<Record<PurchaseField, string>> = {};
  for (const name of purchaseFields) {
    const field = fields.find((item) => item.name === name);
    if (!field || field.readOnly || (record && field.immutable)) continue;
    const raw = draft[name],
      original = record?.[name];
    if (record && raw === (original == null ? "" : String(original))) continue;
    const required = !record && (field.requiredOnCreate || name !== "OPERADOR");
    if (!raw.trim()) {
      if (required || !field.nullable) errors[name] = "Preencha este campo.";
      else if (record) changes[name] = null;
      continue;
    }
    if (name === "CLIENTE" || name === "OPERADOR") {
      if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)))
        errors[name] = "Selecione uma opção válida.";
      else changes[name] = Number(raw);
    } else if (name === "VALOR") {
      const amount = purchaseAmount(raw);
      const cents = amount?.replace(".", ""),
        maxCents = amountMax.replace(".", "");
      if (
        !amount ||
        !cents ||
        cents.length > maxCents.length ||
        (cents.length === maxCents.length && cents > maxCents)
      )
        errors[name] =
          `Informe um valor positivo com até duas casas decimais, no máximo ${displayPurchaseAmount(amountMax)}.`;
      else changes[name] = amount;
    } else if (name === "DATA") {
      const date = new Date(`${raw}T12:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(raw) ||
        Number.isNaN(date.valueOf()) ||
        date.toISOString().slice(0, 10) !== raw ||
        raw < "1000-01-01"
      )
        errors[name] = "Informe uma data válida.";
      else changes[name] = raw;
    } else if (
      (field.maxLength && raw.length > field.maxLength) ||
      /[^\u0020-\u007e\u00a0-\u00ff]/.test(raw)
    ) {
      errors[name] =
        field.maxLength && raw.length > field.maxLength
          ? `Use até ${field.maxLength} caracteres.`
          : "Use caracteres compatíveis com o CRM, sem emoji ou controles.";
    } else changes[name] = raw;
  }
  return {
    changes,
    errors,
    valid: !Object.keys(errors).length,
    hasChanges: Boolean(Object.keys(changes).length),
  };
}
