import type { TelephonyLookupKind, TelephonyLookupOption, TelephonyMonitorFilters } from "../types";

export const lookupFields = {
  customers: { field: "customerId", label: "Cliente", multiple: false },
  campaigns: { field: "campaignIds", label: "Campanhas", multiple: true },
  groups: { field: "groupIds", label: "Grupos de clientes", multiple: true },
  segments: { field: "segmentIds", label: "Segmentos", multiple: true },
  origins: { field: "originIds", label: "Origens", multiple: true },
  products: { field: "productIds", label: "Produtos", multiple: true },
  states: { field: "states", label: "Estados", multiple: true },
  cities: { field: "cities", label: "Cidades", multiple: true },
  neighborhoods: { field: "neighborhoods", label: "Bairros", multiple: true },
  operators: { field: "customerOperatorId", label: "Operador do cliente", multiple: false },
} as const;

function geoParts(id: string): string[] {
  try {
    const parts: unknown = JSON.parse(id);
    return Array.isArray(parts) && parts.every((part) => typeof part === "string") ? parts : [];
  } catch {
    return [];
  }
}

export function selectedLookupIds(
  filters: TelephonyMonitorFilters,
  kind: TelephonyLookupKind,
): string[] {
  const value = filters[lookupFields[kind].field];
  return value === null ? [] : Array.isArray(value) ? value.map(String) : [String(value)];
}

export function fallbackLookupOption(kind: TelephonyLookupKind, id: string): TelephonyLookupOption {
  const parts = geoParts(id);
  const label =
    kind === "cities" && parts.length === 2
      ? `${parts[1]} / ${parts[0]}`
      : kind === "neighborhoods" && parts.length === 3
        ? `${parts[2]} · ${parts[1]} / ${parts[0]}`
        : kind === "states"
          ? id
          : `Código ${id}`;
  return { id, label };
}

export function applyLookupSelection(
  filters: TelephonyMonitorFilters,
  kind: TelephonyLookupKind,
  options: TelephonyLookupOption[],
): TelephonyMonitorFilters {
  const ids = [...new Set(options.map((option) => option.id))];
  switch (kind) {
    case "customers":
      return { ...filters, customerId: ids.length ? Number(ids[0]) : null };
    case "operators":
      return { ...filters, customerOperatorId: ids.length ? Number(ids[0]) : null };
    case "campaigns":
      return { ...filters, campaignIds: ids.map(Number) };
    case "groups":
      return { ...filters, groupIds: ids.map(Number) };
    case "segments":
      return { ...filters, segmentIds: ids.map(Number) };
    case "origins":
      return { ...filters, originIds: ids.map(Number) };
    case "products":
      return { ...filters, productIds: ids };
    case "states": {
      const cities = filters.cities.filter((id) => ids.includes(geoParts(id)[0]));
      const neighborhoods = filters.neighborhoods.filter((id) => {
        const parts = geoParts(id);
        return ids.includes(parts[0]) && cities.includes(JSON.stringify(parts.slice(0, 2)));
      });
      return { ...filters, states: ids, cities, neighborhoods };
    }
    case "cities":
      return {
        ...filters,
        cities: ids,
        neighborhoods: filters.neighborhoods.filter((id) =>
          ids.includes(JSON.stringify(geoParts(id).slice(0, 2))),
        ),
      };
    case "neighborhoods":
      return { ...filters, neighborhoods: ids };
  }
}
