import { FilterChipBar } from "@/lib/ui-system";
import type useTelephonyMonitor from "../use-telephony-monitor";
import type { TelephonyLookupKind, TelephonyLookupOption, TelephonyMonitorFilters } from "../types";
import {
  applyLookupSelection,
  fallbackLookupOption,
  lookupFields,
  selectedLookupIds,
} from "./lookup-fields";
import { displayMonth } from "./presentation";

interface AppliedFiltersProps {
  state: ReturnType<typeof useTelephonyMonitor>;
  knownOptions: Partial<Record<TelephonyLookupKind, TelephonyLookupOption[]>>;
  onShowAll: () => void;
}

interface AppliedFilterChip {
  key: string;
  label: string;
  description: string;
  clear: (filters: TelephonyMonitorFilters) => TelephonyMonitorFilters;
}

function dateLabel(value: string | null): string {
  if (!value) return "sem limite";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export default function TelephonyAppliedFilters({
  state,
  knownOptions,
  onShowAll,
}: AppliedFiltersProps) {
  const applied = state.appliedFilters;
  const chips: AppliedFilterChip[] = [];
  const remove = (clear: AppliedFilterChip["clear"]) => {
    const nextDraft = clear(state.filters);
    state.applyFilters(clear(applied));
    // Applying one chip must not submit unrelated changes still being edited.
    state.setFilters(nextDraft);
  };
  if (applied.searchText)
    chips.push({
      key: "searchText",
      label: `Busca: ${applied.searchText}`,
      description: applied.searchText,
      clear: (filters) => ({ ...filters, searchText: "" }),
    });
  for (const kind of Object.keys(lookupFields) as TelephonyLookupKind[]) {
    const ids = selectedLookupIds(applied, kind);
    if (!ids.length) continue;
    const names = ids.map(
      (id) =>
        knownOptions[kind]?.find((option) => option.id === id)?.label ??
        fallbackLookupOption(kind, id).label,
    );
    chips.push({
      key: kind,
      label: `${lookupFields[kind].label}: ${lookupFields[kind].multiple ? ids.length : names[0]}`,
      description: `${names.slice(0, 8).join(", ")}${names.length > 8 ? ` e mais ${names.length - 8}` : ""}`,
      clear: (filters) => applyLookupSelection(filters, kind, []),
    });
  }
  const ranges = [
    ...(applied.mode === "schedules" ? ([["scheduledAt", "Agendamento"]] as const) : []),
    ...(applied.mode === "calls" ? ([["calledAt", "Ligação"]] as const) : []),
    ["repurchaseAt", "Recompra"],
    ["lastPurchaseAt", "Última compra"],
    ["lastContactAt", "Último contato"],
  ] as const;
  for (const [key, label] of ranges) {
    const range = applied[key];
    if (!range.from && !range.to) continue;
    const description = `${label}: ${dateLabel(range.from)} até ${dateLabel(range.to)}`;
    chips.push({
      key,
      label: description,
      description,
      clear: (filters) => ({ ...filters, [key]: { from: null, to: null } }),
    });
  }
  if (applied.neverWorked)
    chips.push({
      key: "neverWorked",
      label: "Nunca trabalhados",
      description: "Sem tentativa por telefone ou WhatsApp no histórico integrado ao CRM",
      clear: (filters) => ({ ...filters, neverWorked: false }),
    });
  if (applied.monthlyActivity !== "all") {
    const label = `${applied.monthlyActivity === "calls_lt2" ? "Menos de 2 ligações" : "Menos de 2 contatos"} · ${displayMonth(applied.referenceMonth)}`;
    chips.push({
      key: "monthlyActivity",
      label,
      description: label,
      clear: (filters) => ({ ...filters, monthlyActivity: "all" }),
    });
  }
  return (
    <FilterChipBar
      items={chips.map((chip) => ({
        key: chip.key,
        label: chip.label,
        description: chip.description,
        onDelete: () => remove(chip.clear),
      }))}
      onShowAll={onShowAll}
      maxVisible={3}
    />
  );
}
