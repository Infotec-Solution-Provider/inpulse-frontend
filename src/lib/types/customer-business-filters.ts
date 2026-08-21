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
  };
}

export function countCustomerBusinessFilters(filters: CustomerBusinessFilters): number {
  return [
    filters.purchaseStatus || filters.purchaseFrom || filters.purchaseTo,
    filters.campaignIds.length,
    filters.segmentIds.length,
    filters.registeredFrom || filters.registeredTo,
    filters.loyaltyOperatorIds.length,
  ].filter(Boolean).length;
}

export function serializeCustomerBusinessFilters(
  filters: CustomerBusinessFilters,
): Record<string, string> {
  return {
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
