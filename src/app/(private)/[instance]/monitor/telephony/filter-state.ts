import { normalizePageSize } from "../filters-state";
import type {
  TelephonyMonitorFilters,
  TelephonyMonitorMode,
  TelephonyMonitorPreferences,
} from "./types";
import { telephonyDateBound, validTelephonyMonth } from "./date-values";

export const TELEPHONY_DATE_FIELDS = [
  "scheduledAt",
  "calledAt",
  "repurchaseAt",
  "lastPurchaseAt",
  "lastContactAt",
] as const;

export function createTelephonyFilters(
  mode: TelephonyMonitorMode,
  now = new Date(),
): TelephonyMonitorFilters {
  return {
    mode,
    searchText: "",
    scheduledAt: { from: null, to: null },
    calledAt: { from: null, to: null },
    repurchaseAt: { from: null, to: null },
    lastPurchaseAt: { from: null, to: null },
    lastContactAt: { from: null, to: null },
    customerOperatorId: null,
    neverWorked: false,
    monthlyActivity: "all",
    referenceMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    customerId: null,
    campaignIds: [],
    groupIds: [],
    segmentIds: [],
    originIds: [],
    productIds: [],
    states: [],
    cities: [],
    neighborhoods: [],
  };
}

export function telephonyStorageKey(
  instance: string,
  userId: number,
  mode: TelephonyMonitorMode,
): string {
  return `monitor_telephony:v1:${encodeURIComponent(instance)}:${userId}:${mode}`;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function restoreTelephonyPreferences(
  raw: string | null,
  mode: TelephonyMonitorMode,
): TelephonyMonitorPreferences {
  const defaults = { filters: createTelephonyFilters(mode), pageSize: 20, autoRefresh: true };
  if (!raw) return defaults;
  let saved: Record<string, unknown>;
  try {
    saved = record(JSON.parse(raw));
  } catch {
    return defaults;
  }
  const input = record(saved.filters);
  const filters = defaults.filters;
  // Customer IDs, free text and precise locations are deliberately not restored from browser storage.
  for (const key of TELEPHONY_DATE_FIELDS) {
    const range = record(input[key]);
    for (const edge of ["from", "to"] as const) {
      const value = range[edge];
      if (typeof value === "string" && value.length <= 40) {
        try {
          if (telephonyDateBound(value, edge === "to")) filters[key][edge] = value;
        } catch {
          /* Discard corrupt civil dates. */
        }
      }
    }
    const from = telephonyDateBound(filters[key].from, false);
    const to = telephonyDateBound(filters[key].to, true);
    if (from && to && from > to) filters[key] = { from: null, to: null };
  }
  if (
    typeof input.customerOperatorId === "number" &&
    Number.isSafeInteger(input.customerOperatorId) &&
    input.customerOperatorId > 0 &&
    input.customerOperatorId <= 2147483647
  )
    filters.customerOperatorId = input.customerOperatorId;
  if (typeof input.neverWorked === "boolean") filters.neverWorked = input.neverWorked;
  if (input.monthlyActivity === "contacts_lt2" || input.monthlyActivity === "calls_lt2")
    filters.monthlyActivity = input.monthlyActivity;
  if (validTelephonyMonth(input.referenceMonth)) filters.referenceMonth = input.referenceMonth;
  for (const key of ["campaignIds", "groupIds", "segmentIds", "originIds"] as const) {
    const ids = input[key];
    if (Array.isArray(ids))
      filters[key] = [
        ...new Set(
          ids.filter(
            (id): id is number =>
              typeof id === "number" && Number.isSafeInteger(id) && id > 0 && id <= 2147483647,
          ),
        ),
      ].slice(0, 100);
  }
  if (Array.isArray(input.productIds))
    filters.productIds = [
      ...new Set(
        input.productIds.filter(
          (id): id is string => typeof id === "string" && id.length > 0 && id.length <= 600,
        ),
      ),
    ].slice(0, 100);
  if (Array.isArray(input.states))
    filters.states = [
      ...new Set(
        input.states.filter(
          (state): state is string =>
            typeof state === "string" && state.length > 0 && state.length <= 600,
        ),
      ),
    ].slice(0, 100);
  return {
    filters,
    pageSize: typeof saved.pageSize === "number" ? normalizePageSize(saved.pageSize) : 20,
    autoRefresh: typeof saved.autoRefresh === "boolean" ? saved.autoRefresh : true,
  };
}

export function serializeTelephonyPreferences(preferences: TelephonyMonitorPreferences): string {
  return JSON.stringify({
    ...preferences,
    filters: {
      ...preferences.filters,
      searchText: "",
      customerId: null,
      cities: [],
      neighborhoods: [],
    },
  });
}

/** Parent geography selections discard only incompatible selected descendants. */
export function reconcileTelephonyGeography(
  filters: TelephonyMonitorFilters,
): TelephonyMonitorFilters {
  const geography = (id: string, length: number): string[] | null => {
    if (typeof id !== "string" || id.length > 600) return null;
    try {
      const value: unknown = JSON.parse(id);
      return Array.isArray(value) &&
        value.length === length &&
        value.every((part) => typeof part === "string" && part.length <= 191) &&
        value[length - 1].trim().length > 0
        ? value
        : null;
    } catch {
      return null;
    }
  };
  const cities = filters.cities.filter((id) => {
    const value = geography(id, 2);
    return value !== null && (filters.states.length === 0 || filters.states.includes(value[0]));
  });
  const neighborhoods = filters.neighborhoods.filter((id) => {
    const value = geography(id, 3);
    if (!value) return false;
    const [state, city] = value;
    return (
      (filters.states.length === 0 || filters.states.includes(state)) &&
      (cities.length === 0 || cities.includes(JSON.stringify([state, city])))
    );
  });
  return { ...filters, cities, neighborhoods };
}
