import type { AxiosInstance } from "axios";
import type { TenantUiPolicy } from "./tenant-ui-policy";
import { approvedWhatsappSectors, resolveSectorNamespace, SECTOR_MAPPING_ERROR } from "./sector-namespace";

interface Sector { id: number; name: string; defaultClientId?: number | null }
interface BootstrapSession { instance: string; crmSectorId: number; token: string; isCurrent: () => boolean }

export function readWhatsappSessionMetadata(instance: string, value: unknown): { parameters: Record<string, string>; tenantPolicy: TenantUiPolicy | null } {
  const root = value as { parameters?: unknown; tenantPolicy?: unknown } | null;
  const object = root !== null && typeof root === "object" && !Array.isArray(root);
  const parameters = object && root.parameters !== null && typeof root.parameters === "object" && !Array.isArray(root.parameters);
  const explicitPolicy = object && Object.prototype.hasOwnProperty.call(root, "tenantPolicy") &&
    (root.tenantPolicy === null || (typeof root.tenantPolicy === "object" && root.tenantPolicy !== null && !Array.isArray(root.tenantPolicy)));
  if (instance === "odim" && (!object || !parameters || !explicitPolicy)) throw new Error(SECTOR_MAPPING_ERROR);
  return { parameters: parameters ? root!.parameters as Record<string, string> : {},
    tenantPolicy: object && root.tenantPolicy != null ? root.tenantPolicy as TenantUiPolicy : null };
}

/** Read the capability before forming any URL from a sector ID. No mutation of Auth/User/JWT. */
export async function loadWhatsappSectorSession<Client>(ax: Pick<AxiosInstance, "get">, session: BootstrapSession): Promise<{
  parameters: Record<string, string>; tenantPolicy: TenantUiPolicy | null; sectors: Sector[];
  whatsappSectorId: number; channels: Client[]; defaultClientId: number | null;
} | null> {
  const config = { skipAuthInjection: true, skipAuthRefresh: true, headers: { Authorization: `Bearer ${session.token}`, "x-crm-instance": session.instance } };
  const parametersResponse = await ax.get<{ parameters: Record<string, string>; tenantPolicy?: TenantUiPolicy | null }>("/api/whatsapp/session/parameters", config);
  if (!session.isCurrent()) return null;
  const metadata = readWhatsappSessionMetadata(session.instance, parametersResponse.data);
  const policy = metadata.tenantPolicy;
  const namespace = resolveSectorNamespace(session.instance, session.crmSectorId, policy);
  if (namespace.mode === "blocked" || namespace.whatsappSectorId === null) throw new Error(SECTOR_MAPPING_ERROR);
  const response = await ax.get<{ data: Sector[] } | Sector[]>("/api/whatsapp/sectors", config);
  if (!session.isCurrent()) return null;
  const data = response.data;
  const rawSectors = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  const sectors = approvedWhatsappSectors(namespace, rawSectors);
  const matching = sectors.filter(sector => sector.id === namespace.whatsappSectorId);
  if (namespace.mode === "mapped" && matching.length !== 1) throw new Error(SECTOR_MAPPING_ERROR);
  const channelResponse = await ax.get<{ data: Client[] } | Client[]>(`/api/whatsapp/sector/${namespace.whatsappSectorId}/clients`, config);
  if (!session.isCurrent()) return null;
  const payload = channelResponse.data;
  return { parameters: metadata.parameters, tenantPolicy: policy, sectors, whatsappSectorId: namespace.whatsappSectorId,
    channels: Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [], defaultClientId: matching[0]?.defaultClientId ?? null };
}
