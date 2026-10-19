import type { CustomerLookupOption } from "@/lib/sdk-local";

export type CustomerPurchaseStatus = "" | "with_purchases" | "without_purchases";

export interface CustomerBusinessFilters {
  purchaseStatus: CustomerPurchaseStatus;
  purchaseFrom: string;
  purchaseTo: string;
  campaignIds: number[];
  segmentIds: number[];
  registeredFrom: string;
  registeredTo: string;
  loyaltyOperatorIds: number[];
  groupIds: number[];
  originIds: number[];
  mediaIds: number[];
  unitIds: number[];
  brandIds: number[];
  positionIds: number[];
  states: string[];
  phone: string;
  email: string;
}

export interface CustomerBusinessFilterOptions {
  campaigns: CustomerLookupOption[];
  segments: CustomerLookupOption[];
  operators: CustomerLookupOption[];
}

export interface CustomerBusinessQueryFilters {
  purchaseStatus?: string;
  purchaseFrom?: string;
  purchaseTo?: string;
  campaignIds?: string;
  segmentIds?: string;
  registeredFrom?: string;
  registeredTo?: string;
  loyaltyOperatorIds?: string;
  groupIds?: string;
  originIds?: string;
  mediaIds?: string;
  unitIds?: string;
  brandIds?: string;
  positionIds?: string;
  states?: string;
  phone?: string;
  email?: string;
}

export function createEmptyCustomerBusinessFilters(): CustomerBusinessFilters {
  return {
    purchaseStatus: "",
    purchaseFrom: "",
    purchaseTo: "",
    campaignIds: [],
    segmentIds: [],
    registeredFrom: "",
    registeredTo: "",
    loyaltyOperatorIds: [],
    groupIds: [],
    originIds: [],
    mediaIds: [],
    unitIds: [],
    brandIds: [],
    positionIds: [],
    states: [],
    phone: "",
    email: "",
  };
}

export function countCustomerBusinessFilters(filters: CustomerBusinessFilters): number {
  return [
    filters.purchaseStatus || filters.purchaseFrom || filters.purchaseTo,
    filters.campaignIds.length,
    filters.segmentIds.length,
    filters.registeredFrom || filters.registeredTo,
    filters.loyaltyOperatorIds.length,
    filters.groupIds.length,
    filters.originIds.length,
    filters.mediaIds.length,
    filters.unitIds.length,
    filters.brandIds.length,
    filters.positionIds.length,
    filters.states.length,
    filters.phone,
    filters.email,
  ].filter(Boolean).length;
}

export function serializeCustomerBusinessFilters(
  filters: CustomerBusinessFilters,
): Record<string, string> {
  return {
    ...Object.fromEntries((["groupIds", "originIds", "mediaIds", "unitIds", "brandIds", "positionIds", "states"] as const).filter(key => filters[key].length).map(key => [key, filters[key].join(",")])),
    ...(filters.phone.trim() ? { phone: filters.phone.trim() } : {}),
    ...(filters.email.trim() ? { email: filters.email.trim() } : {}),
    ...(filters.purchaseStatus ? { purchaseStatus: filters.purchaseStatus } : {}),
    ...(filters.purchaseStatus !== "without_purchases" && filters.purchaseFrom
      ? { purchaseFrom: filters.purchaseFrom }
      : {}),
    ...(filters.purchaseStatus !== "without_purchases" && filters.purchaseTo
      ? { purchaseTo: filters.purchaseTo }
      : {}),
    ...(filters.campaignIds.length ? { campaignIds: filters.campaignIds.join(",") } : {}),
    ...(filters.segmentIds.length ? { segmentIds: filters.segmentIds.join(",") } : {}),
    ...(filters.registeredFrom ? { registeredFrom: filters.registeredFrom } : {}),
    ...(filters.registeredTo ? { registeredTo: filters.registeredTo } : {}),
    ...(filters.loyaltyOperatorIds.length
      ? { loyaltyOperatorIds: filters.loyaltyOperatorIds.join(",") }
      : {}),
  };
}
