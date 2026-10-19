import type { AxiosRequestConfig } from "axios";
export interface CrmRequestContext { instance: string; token: string }
/** Snapshot credentials before any asynchronous request interceptor can refresh the global session. */
export function crmMutationConfig(context: CrmRequestContext): AxiosRequestConfig & { skipAuthInjection: true; skipAuthRefresh: true } {
  const token = context?.token?.replace(/^Bearer\s+/i, "").trim();
  const instance = context?.instance?.trim();
  if (!token || !instance) throw new Error("Recarregue sua sessão antes de alterar o cadastro.");
  return { skipAuthInjection: true, skipAuthRefresh: true, headers: { Authorization: `Bearer ${token}`, "x-crm-instance": instance } };
}
