export type TelephonyMonitorMode = "schedules" | "calls" | "unscheduled";
export type TelephonyDateRange = { from: string | null; to: string | null };

export interface TelephonyMonitorFilters {
  mode: TelephonyMonitorMode;
  searchText: string;
  scheduledAt: TelephonyDateRange;
  calledAt: TelephonyDateRange;
  repurchaseAt: TelephonyDateRange;
  lastPurchaseAt: TelephonyDateRange;
  lastContactAt: TelephonyDateRange;
  customerOperatorId: number | null;
  neverWorked: boolean;
  monthlyActivity: "all" | "contacts_lt2" | "calls_lt2";
  referenceMonth: string;
  customerId: number | null;
  campaignIds: number[];
  groupIds: number[];
  segmentIds: number[];
  originIds: number[];
  productIds: string[];
  states: string[];
  cities: string[];
  neighborhoods: string[];
}

export interface TelephonyMonitorItem {
  id: string;
  kind: TelephonyMonitorMode;
  customer: {
    id: number;
    name: string;
    tradeName: string | null;
    document: string | null;
    phone: string | null;
    operatorId: number | null;
    operatorName: string | null;
    state: string | null;
    city: string | null;
    neighborhood: string | null;
  };
  schedule: {
    id: number;
    at: string | null;
    campaignId: number | null;
    campaignName: string | null;
    operatorName: string | null;
  } | null;
  call: {
    id: string;
    startedAt: string | null;
    finishedAt: string | null;
    durationSeconds: number | null;
    result: string | null;
    phone: string | null;
    operatorName: string | null;
    source: string;
  } | null;
  metrics: {
    lastPurchaseAt: string | null;
    lastContactAt: string | null;
    nextRepurchaseAt: string | null;
    monthCalls: number;
    monthContacts: number;
    neverWorked: boolean;
  };
}

export interface TelephonyMonitorSummary {
  customerCount: number;
  overdueCount: number | null;
}

export interface TelephonyMonitorResult {
  items: TelephonyMonitorItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: TelephonyMonitorSummary;
}

export type TelephonyLookupKind =
  | "customers"
  | "campaigns"
  | "groups"
  | "segments"
  | "origins"
  | "products"
  | "states"
  | "cities"
  | "neighborhoods"
  | "operators";
export interface TelephonyLookupOption {
  id: string;
  label: string;
  description?: string;
}
export interface TelephonyLookupParams {
  kind: TelephonyLookupKind;
  search: string;
  page: number;
  pageSize: number;
  states?: string[];
  cities?: string[];
}
export interface TelephonyLookupResult {
  items: TelephonyLookupOption[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface TelephonyMonitorPreferences {
  filters: TelephonyMonitorFilters;
  pageSize: number;
  autoRefresh: boolean;
}
