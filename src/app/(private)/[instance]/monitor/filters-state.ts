import type { MonitorFiltersState, MonitorPreferences } from "./types";

export function createInitialFilters(): MonitorFiltersState {
  return {
    searchText: "",
    searchColumn: "all",
    categories: {
      showCustomerChats: true,
      showInternalChats: true,
      showInternalGroups: true,
      showSchedules: true,
    },
    user: "all",
    showBots: false,
    showOngoing: true,
    showFinished: true,
    showOnlyScheduled: false,
    showUnreadOnly: false,
    showPendingResponseOnly: false,
    operationalStatus: "all",
    sortBy: "urgency",
    sortOrder: "desc",
    startedAt: { from: null, to: null },
    finishedAt: { from: null, to: null },
    scheduledAt: { from: null, to: null },
    scheduledTo: { from: null, to: null },
    scheduledBy: "all",
    scheduledFor: "all",
  };
}

export function monitorStorageKey(instance: string, userId: number): string {
  return `monitor_preferences:v1:${encodeURIComponent(instance)}:${userId}`;
}

export function normalizePageSize(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(1, Math.trunc(value))) : 20;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// Storage is untrusted and contains preferences only: never restore customer/message search text.
export function restoreMonitorPreferences(raw: string | null): MonitorPreferences {
  const defaults: MonitorPreferences = {
    filters: createInitialFilters(),
    pageSize: 20,
    autoRefresh: true,
    viewMode: "cards",
  };
  if (!raw) return defaults;
  let parsed: Record<string, unknown>;
  try {
    parsed = record(JSON.parse(raw));
  } catch {
    return defaults;
  }
  const saved = record(parsed.filters);
  const filters = defaults.filters;
  for (const key of [
    "showBots",
    "showOngoing",
    "showFinished",
    "showOnlyScheduled",
    "showUnreadOnly",
    "showPendingResponseOnly",
  ] as const) {
    if (typeof saved[key] === "boolean") filters[key] = saved[key];
  }
  const categories = record(saved.categories);
  for (const key of Object.keys(
    filters.categories,
  ) as (keyof MonitorFiltersState["categories"])[]) {
    if (typeof categories[key] === "boolean") filters.categories[key] = categories[key];
  }
  for (const key of ["user", "scheduledBy", "scheduledFor"] as const) {
    const value = saved[key];
    if (value === "all" || (typeof value === "number" && Number.isSafeInteger(value) && value > 0))
      filters[key] = value;
  }
  for (const key of ["startedAt", "finishedAt", "scheduledAt", "scheduledTo"] as const) {
    const range = record(saved[key]);
    for (const edge of ["from", "to"] as const) {
      const value = range[edge];
      if (typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value)))
        filters[key][edge] = value;
    }
  }
  if (["all", "name", "phone", "customer", "message"].includes(String(saved.searchColumn)))
    filters.searchColumn = saved.searchColumn as MonitorFiltersState["searchColumn"];
  if (
    ["urgency", "startedAt", "finishedAt", "lastMessage", "name", "scheduledAt"].includes(
      String(saved.sortBy),
    )
  )
    filters.sortBy = saved.sortBy as MonitorFiltersState["sortBy"];
  if (
    [
      "all",
      "in_progress",
      "waiting_agent",
      "waiting_customer",
      "unread",
      "overdue",
      "scheduled",
    ].includes(String(saved.operationalStatus))
  )
    filters.operationalStatus = saved.operationalStatus as MonitorFiltersState["operationalStatus"];
  if (saved.sortOrder === "asc" || saved.sortOrder === "desc") filters.sortOrder = saved.sortOrder;
  return {
    filters,
    pageSize: typeof parsed.pageSize === "number" ? normalizePageSize(parsed.pageSize) : 20,
    autoRefresh: typeof parsed.autoRefresh === "boolean" ? parsed.autoRefresh : true,
    viewMode: parsed.viewMode === "compact" ? "compact" : "cards",
  };
}

export function serializeMonitorPreferences(preferences: MonitorPreferences): string {
  return JSON.stringify({ ...preferences, filters: { ...preferences.filters, searchText: "" } });
}

export function equalMonitorFilters(a: MonitorFiltersState, b: MonitorFiltersState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
