import type { CustomerCrmField, CustomerCrmRecord } from "./sdk-local/types/customer-crm.types";

export const crmPhoneSlots = [
  ["AREA1", "FONE1", "DESC_FONE1", "OBS_FONE1"],
  ["AREA2", "FONE2", "DESC_FONE2", "OBS_FONE2"],
  ["AREA3", "FONE3", "DESC_FONE3", "OBS_FONE3"],
  ["AREAFAX", "FAX", "DESCFAX", "OBS_FAX"],
] as const;
const phoneKeys: readonly string[] = crmPhoneSlots.flat();

/** Mirrors the API contract; operational tabs validate only, leaving compaction to the server. */
export function crmPhonePayload(fields: CustomerCrmField[], changes: CustomerCrmRecord, original?: CustomerCrmRecord, compact = true) {
  const errors: Record<string, string> = {}, values: CustomerCrmRecord = {};
  if (!fields.some(field => field.name === "FONE1") || (original && !phoneKeys.some(key => Object.hasOwn(changes, key)))) return { values, errors };
  const capabilities = new Map(fields.map(field => [field.name, field]));
  const merged = { ...original, ...changes };
  const occupied: (string | number | null)[][] = [];
  for (const [index, slot] of crmPhoneSlots.entries()) {
    const area = String(merged[slot[0]] ?? ""), phone = String(merged[slot[1]] ?? "");
    if ((!area || area === "0") && !phone) continue;
    if (!/^[1-9]\d$/.test(area) || !/^\d{8,9}$/.test(phone)) errors[slot[1]] = `Informe o DDD e o telefone ${index + 1} completos e válidos.`;
    occupied.push(slot.map(key => merged[key] ?? null));
  }
  if (!occupied.length) errors.FONE1 = "Mantenha pelo menos um telefone completo com DDD.";
  if (Object.keys(errors).length || !compact) return { values, errors };
  for (const [index, slot] of crmPhoneSlots.entries()) for (const [part, key] of slot.entries()) {
    const capability = capabilities.get(key), value = occupied[index]?.[part] ?? null;
    if (!capability) {
      if (value !== null && value !== "") errors[slot[1]] = "Este banco não comporta os metadados nessa posição de telefone.";
      continue;
    }
    if (typeof value === "string" && value.length > (capability.maxLength ?? 65535)) errors[key] = "O texto não cabe na nova posição do telefone.";
    const next = value ?? (capability.nullable ? null : capability.type === "integer" ? 0 : "");
    if (!occupied[index] && !Object.hasOwn(changes, key) && !Object.hasOwn(original ?? {}, key)) continue;
    if (next !== original?.[key] || Object.hasOwn(changes, key)) values[key] = next;
  }
  return { values, errors };
}
