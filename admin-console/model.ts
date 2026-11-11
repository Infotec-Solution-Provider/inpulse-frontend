import type { Change, Json, Setting, Snapshot } from "./types";
export interface Draft {
  action: "set" | "reset" | "remove";
  input: string;
}
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function displayValue(field: Setting, value: Json | undefined): string {
  if (value === undefined || value === null) return "";
  if (field.type === "json") return JSON.stringify(value, null, 2);
  if (field.type === "number" && typeof value === "number")
    return String(value / (field.multiplier ?? 1));
  return String(value);
}
export function compileChanges(
  snapshot: Snapshot,
  drafts: Record<string, Draft>,
): { changes: Change[]; errors: Record<string, string> } {
  const changes: Change[] = [],
    errors: Record<string, string> = {};
  for (const field of snapshot.catalog) {
    const draft = drafts[field.key];
    if (!draft || field.readOnly || field.unavailableReason) continue;
    if (draft.action !== "set") {
      changes.push({ key: field.key, action: draft.action });
      continue;
    }
    if (field.type === "secret" && draft.input === "") continue;
    let value: Json = draft.input;
    if (field.type === "number") {
      const number = Number(draft.input);
      if (
        draft.input.trim() === "" ||
        !Number.isFinite(number) ||
        (field.min !== undefined && number < field.min) ||
        (field.max !== undefined && number > field.max)
      ) {
        errors[field.key] =
          `Informe um número${field.min !== undefined ? ` a partir de ${field.min}` : ""}${field.max !== undefined ? ` até ${field.max}` : ""}.`;
        continue;
      }
      value = number * (field.multiplier ?? 1);
    } else if (field.type === "boolean") value = draft.input === "true";
    else if (field.type === "enum") {
      const selected = field.options?.find(
        (option) => JSON.stringify(option.value) === draft.input,
      );
      if (!selected) {
        errors[field.key] = "Selecione uma opção disponível.";
        continue;
      }
      value = selected.value;
    } else if (field.type === "json") {
      try {
        value = JSON.parse(draft.input) as Json;
      } catch {
        errors[field.key] = "Informe um JSON válido.";
        continue;
      }
    }
    if (
      field.type !== "secret" &&
      JSON.stringify(value) === JSON.stringify(snapshot.values[field.key])
    )
      continue;
    changes.push({ key: field.key, action: "set", value });
  }
  return { changes, errors };
}
export function searchableField(field: Setting, search: string): boolean {
  return normalize(`${field.key} ${field.label} ${field.description} ${field.category}`).includes(
    normalize(search),
  );
}
