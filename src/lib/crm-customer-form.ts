import type {
  CustomerCrmField,
  CustomerCrmRecord,
  CustomerCrmValue,
} from "./sdk-local/types/customer-crm.types";
export type CustomerCrmDraft = Record<string, CustomerCrmValue | undefined>;
export const CRM_FIELD_GROUPS = [
  { id: "identification", label: "Identificação" },
  { id: "address", label: "Endereço" },
  { id: "phones", label: "Telefones e e-mails" },
  { id: "origin", label: "Origem e classificação" },
  { id: "administration", label: "Informações administrativas" },
] as const;
export function crmFormPayload(
  fields: CustomerCrmField[],
  draft: CustomerCrmDraft,
  original?: CustomerCrmRecord,
  manualCode = false,
) {
  const values: CustomerCrmRecord = {},
    errors: Record<string, string> = {};
  if (!original && manualCode) {
    const code = draft.CODIGO;
    if (typeof code !== "number" || !Number.isInteger(code) || code < 1 || code > 2147483647)
      errors.CODIGO = "Informe um código positivo ainda não utilizado.";
    else values.CODIGO = code;
  }
  for (const field of fields) {
    const raw = draft[field.name];
    if (original && raw === original[field.name]) continue;
    if (raw === undefined) {
      if (!original && field.required) errors[field.name] = `Informe ${field.label.toLowerCase()}.`;
      continue;
    }
    if (raw === null) {
      if (!field.nullable) errors[field.name] = "Este campo é obrigatório.";
      else values[field.name] = null;
      continue;
    }
    if (field.type === "integer") {
      if (
        typeof raw !== "number" ||
        !Number.isInteger(raw) ||
        raw < (field.lookup ? 1 : 0) ||
        raw > 2147483647
      )
        errors[field.name] = "Informe um número inteiro válido.";
      else values[field.name] = raw;
      continue;
    }
    if (typeof raw !== "string") {
      errors[field.name] = "Informe um valor válido.";
      continue;
    }
    const text = raw.trim();
    if (field.type === "enum" && !field.options?.includes(text))
      errors[field.name] = "Selecione uma opção válida.";
    else if (
      field.type === "date" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(text) ||
        !Number.isFinite(Date.parse(`${text}T00:00:00Z`)) ||
        new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) !== text)
    )
      errors[field.name] = "Informe uma data válida.";
    else if (
      (field.required && !text) ||
      text.length > (field.maxLength ?? 65535) ||
      Array.from(text).some(
        (char) =>
          char.charCodeAt(0) > 255 || (char.charCodeAt(0) >= 127 && char.charCodeAt(0) < 160),
      )
    )
      errors[field.name] = "Revise o texto e o limite de caracteres deste campo.";
    else values[field.name] = text;
  }
  if (fields.some(field => field.name === "AREA1") && fields.some(field => field.name === "FONE1") && (!original || ["AREA1", "FONE1", "AREA2", "FONE2", "AREA3", "FONE3"].some(key => Object.hasOwn(values, key)))) {
    const merged = { ...original, ...values };
    for (let index = 1; index <= 3; index++) {
      const phone = String(merged[`FONE${index}`] ?? ""), area = String(merged[`AREA${index}`] ?? "");
      if (index > 1 && !phone) continue;
      if (!/^[1-9]\d*$/.test(area) || !/^\d+$/.test(phone) || (area + phone).length < 10) errors[`FONE${index}`] = "Informe o DDD e o telefone válidos.";
    }
  }
  return {
    values,
    errors,
    valid: Object.keys(errors).length === 0,
    hasChanges: !original || Object.keys(values).length > 0,
  };
}
export function crmErrorDetails(error: unknown): {
  status?: number;
  code?: string;
  outcome?: string;
  message: string;
} {
  const visited = new Set<object>();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const item = current as {
      response?: { status?: number; data?: { code?: string; outcome?: string; message?: string } };
      cause?: unknown;
    };
    if (item.response)
      return {
        status: item.response.status,
        code: item.response.data?.code,
        outcome: item.response.data?.outcome,
        message: item.response.data?.message ?? "Não foi possível concluir a operação.",
      };
    current = item.cause;
  }
  return { message: "Não foi possível confirmar a operação. Confira os dados antes de continuar." };
}
