import type {
  CrmUserRegistrationField,
  CrmUserRegistrationDetail,
} from "./sdk-local/types/crm-users.types";
export type RegistrationDraft = Record<string, string>;
export function userRegistrationDraft(
  fields: CrmUserRegistrationField[],
  detail?: CrmUserRegistrationDetail,
): RegistrationDraft {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.type === "password"
        ? ""
        : field.type === "date"
          ? String(detail?.record[field.name] ?? "").slice(0, 10)
          : String(detail?.record[field.name] ?? ""),
    ]),
  );
}
export function validateUserRegistration(
  fields: CrmUserRegistrationField[],
  draft: RegistrationDraft,
  original?: CrmUserRegistrationDetail,
) {
  const errors: Record<string, string> = {},
    changes: Record<string, string | number | null> = {};
  const before = userRegistrationDraft(fields, original);
  for (const field of fields) {
    const raw = draft[field.name] ?? "";
    if (field.type === "password" && original && raw === "") continue;
    if (original && raw === before[field.name]) continue;
    const value = field.type === "password" ? raw : raw.trim();
    if (!original && !value && !field.requiredOnCreate) continue;
    if (!value) {
      if ((!original && field.requiredOnCreate) || !field.nullable || field.type === "password")
        errors[field.name] = `${field.label} é obrigatório.`;
      else changes[field.name] = null;
      continue;
    }
    if (field.type === "number") {
      const number = Number(value);
      if (
        !/^-?\d+$/.test(value) ||
        !Number.isSafeInteger(number) ||
        number < -2147483648 ||
        number > 2147483647
      )
        errors[field.name] = "Informe um número inteiro válido.";
      else changes[field.name] = number;
    } else {
      if (field.type !== "date" && /[^\u0020-\u007e\u00a0-\u00ff]/.test(value))
        errors[field.name] = "Use caracteres compatíveis com o cadastro do CRM.";
      if (field.maxLength && [...value].length > field.maxLength)
        errors[field.name] = `Use no máximo ${field.maxLength} caracteres.`;
      if (field.type === "select" && !field.options?.includes(value))
        errors[field.name] = "Selecione uma opção válida.";
      if (field.type === "date") {
        const parsed = new Date(`${value}T00:00:00Z`);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          Number.isNaN(parsed.getTime()) ||
          parsed.toISOString().slice(0, 10) !== value
        )
          errors[field.name] = "Informe uma data válida.";
      }
      changes[field.name] = value;
    }
  }
  return {
    errors,
    changes,
    valid: Object.keys(errors).length === 0,
    hasChanges: Object.keys(changes).length > 0,
  };
}
