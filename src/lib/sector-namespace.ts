import type { TenantUiPolicy } from "./tenant-ui-policy";

export interface SectorNamespace {
  mode: "legacy" | "mapped" | "blocked";
  whatsappSectorId: number | null;
  crmByWhatsapp: ReadonlyMap<number, number>;
  whatsappByCrm: ReadonlyMap<number, number>;
}
export const SECTOR_MAPPING_ERROR = "Não foi possível confirmar o vínculo entre os setores CRM e WhatsApp. Recarregue a sessão ou solicite a revisão do mapeamento.";
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;

/** Bind channel/sector state to the capability that authorized its bootstrap. */
export function sectorNamespaceKey(instance: string, crmSectorId: number | null | undefined, policy: TenantUiPolicy | null | undefined): string {
  if (instance !== "odim" || policy == null) return JSON.stringify([instance, crmSectorId, null]);
  const map = policy.crmSectorByWhatsappSector;
  return JSON.stringify([instance, crmSectorId, policy.revision, policy.crmSectorId, policy.whatsappSectorId,
    map && typeof map === "object" ? Object.entries(map).sort(([a], [b]) => a.localeCompare(b)) : null]);
}

/** User.SETOR stays in CRM. Only a validated active Odim capability authorizes crossing namespaces. */
export function resolveSectorNamespace(instance: string, crmSectorId: number | null | undefined, policy: TenantUiPolicy | null | undefined): SectorNamespace {
  const empty = { whatsappSectorId: null, crmByWhatsapp: new Map<number, number>(), whatsappByCrm: new Map<number, number>() };
  if (instance !== "odim" || policy === null) return { ...empty, mode: "legacy", whatsappSectorId: crmSectorId ?? null };
  if (policy === undefined) return { ...empty, mode: "blocked" };
  if (typeof policy.revision !== "string" || !policy.revision.trim() || policy.revision.length > 128 ||
    !positive(crmSectorId) || policy.crmSectorId !== crmSectorId || !positive(policy.whatsappSectorId) ||
    !policy.crmSectorByWhatsappSector || typeof policy.crmSectorByWhatsappSector !== "object" || Array.isArray(policy.crmSectorByWhatsappSector)) {
    return { ...empty, mode: "blocked" };
  }
  const crmByWhatsapp = new Map<number, number>(), whatsappByCrm = new Map<number, number>();
  for (const [key, value] of Object.entries(policy.crmSectorByWhatsappSector)) {
    const whatsapp = Number(key);
    if (!/^[1-9]\d*$/.test(key) || !positive(whatsapp) || !positive(value) || whatsappByCrm.has(value)) return { ...empty, mode: "blocked" };
    crmByWhatsapp.set(whatsapp, value); whatsappByCrm.set(value, whatsapp);
  }
  if (crmByWhatsapp.get(policy.whatsappSectorId) !== crmSectorId) return { ...empty, mode: "blocked" };
  return { mode: "mapped", whatsappSectorId: policy.whatsappSectorId, crmByWhatsapp, whatsappByCrm };
}

export function approvedWhatsappSectors<T extends { id: number }>(namespace: SectorNamespace, sectors: readonly T[]): T[] {
  if (namespace.mode === "blocked") return [];
  if (namespace.mode === "legacy") return [...sectors];
  return sectors.filter(sector => namespace.crmByWhatsapp.has(sector.id));
}

/** Options handed to operator forms and filters have CRM IDs, never global WhatsApp IDs. */
export function crmSectorOptions(namespace: SectorNamespace, sectors: readonly { id: number; name: string }[]): Array<{ id: number; name: string }> {
  return approvedWhatsappSectors(namespace, sectors).map(sector => ({
    id: namespace.mode === "mapped" ? namespace.crmByWhatsapp.get(sector.id)! : sector.id, name: sector.name,
  }));
}

export function whatsappSectorForCrm(namespace: SectorNamespace, crmSectorId: number | null | undefined): number | null {
  if (namespace.mode === "blocked") return null;
  return namespace.mode === "mapped" ? namespace.whatsappByCrm.get(crmSectorId!) ?? null : crmSectorId ?? null;
}

export function assertCrmSectorSelection(namespace: SectorNamespace, crmSectorId: unknown): void {
  if (namespace.mode === "blocked" || (namespace.mode === "mapped" && (!positive(crmSectorId) || !namespace.whatsappByCrm.has(crmSectorId)))) throw new Error(SECTOR_MAPPING_ERROR);
}
