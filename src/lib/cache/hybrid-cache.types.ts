export type HybridCacheResource =
  | "users"
  | "contacts"
  | "sectors"
  | "channels"
  | "parameters"
  | "ready-messages"
  | "internal-groups"
  | "contact-page"
  | "customer-page";

export interface HybridCacheEntry<T> {
  id: string;
  scope: string;
  resource: HybridCacheResource;
  queryKey: string;
  expiresAt: number;
  value: T;
}
