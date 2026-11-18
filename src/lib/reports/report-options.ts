import { normalizeReportSearch } from "./catalog";
import type {
  EntityOption,
  EntityOptionsLoader,
} from "@/components/reports/SearchableEntityFilter";

export function localReportOptions(options: EntityOption[]): EntityOptionsLoader {
  return async (search, page) => {
    const terms = normalizeReportSearch(search).split(/\s+/).filter(Boolean);
    const matching = options.filter((option) => {
      const label = normalizeReportSearch(`${option.label} ${option.id}`);
      return terms.every((term) => label.includes(term));
    });
    const end = page * 50;
    return { options: matching.slice(end - 50, end), hasMore: matching.length > end };
  };
}

export function reportSelectionLabel(label: string, options: EntityOption[]) {
  if (options.length === 0) return `${label}: todos`;
  if (options.length > 3) return `${label}: ${options.length} selecionados`;
  return `${label}: ${options.map((option) => option.label).join(", ")}`;
}
