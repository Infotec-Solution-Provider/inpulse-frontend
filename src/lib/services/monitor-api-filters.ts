import type { MonitorFiltersState } from "@/app/(private)/[instance]/monitor/types";

/** Preserve the operator's civil day even when the API runs in another timezone. */
export function monitorApiFilters(filters: MonitorFiltersState): MonitorFiltersState {
  const result = { ...filters };
  const bound = (value: string | null, end: boolean) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(
      year,
      month - 1,
      day,
      end ? 23 : 0,
      end ? 59 : 0,
      end ? 59 : 0,
      end ? 999 : 0,
    );
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new Error("Selecione um período válido.");
    }
    return date.toISOString();
  };
  for (const key of ["startedAt", "finishedAt", "scheduledAt", "scheduledTo"] as const) {
    result[key] = { from: bound(filters[key].from, false), to: bound(filters[key].to, true) };
  }
  return result;
}
