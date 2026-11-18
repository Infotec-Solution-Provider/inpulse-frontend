"use client";

import { useMemo } from "react";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { reportOperatorOptions } from "@/lib/reports/operator-options";
import { localReportOptions, reportSelectionLabel } from "@/lib/reports/report-options";
import { defaultReportPeriod, reportPeriodLabel, type ReportPeriod } from "@/lib/reports/filters";
import { SearchableEntityFilter, type EntityOption } from "./SearchableEntityFilter";

export interface OperatorReportFilters {
  period: ReportPeriod;
  operators: EntityOption[];
  sectors: EntityOption[];
}

export function defaultOperatorReportFilters(): OperatorReportFilters {
  return { period: defaultReportPeriod(), operators: [], sectors: [] };
}

export function operatorFiltersLabels(filters: OperatorReportFilters | null, showSectors = true) {
  if (!filters) return [];
  const labels = [
    reportPeriodLabel(filters.period),
    reportSelectionLabel("Operadores", filters.operators),
  ];
  if (showSectors) labels.push(reportSelectionLabel("Setores", filters.sectors));
  return labels;
}

export function operatorFiltersParams(filters: OperatorReportFilters) {
  const ids = (options: EntityOption[]) => options.map((option) => option.id).join(",") || "*";
  return { ...filters.period, OPERADORES: ids(filters.operators), SETORES: ids(filters.sectors) };
}

export function OperatorReportFields({
  filters,
  onChange,
  scope,
  token,
  showSectors = true,
}: {
  filters: OperatorReportFilters;
  onChange: (next: OperatorReportFilters) => void;
  scope: string;
  token: string;
  showSectors?: boolean;
}) {
  const { sectors } = useWhatsappContext();
  const operatorOptions = useMemo(() => reportOperatorOptions(token), [token]);
  const sectorOptions = useMemo(
    () =>
      localReportOptions(
        (sectors ?? []).map((sector) => ({
          id: sector.id,
          label: sector.name || `Setor ${sector.id}`,
        })),
      ),
    [sectors],
  );

  return (
    <>
      <SearchableEntityFilter
        multiple
        label="Operadores"
        scope={scope}
        value={filters.operators}
        loadOptions={operatorOptions}
        onChange={(operators) => onChange({ ...filters, operators })}
      />
      {showSectors && (
        <SearchableEntityFilter
          multiple
          label="Setores"
          scope={scope}
          value={filters.sectors}
          loadOptions={sectorOptions}
          moreLabel="Carregar mais setores"
          emptyLabel="Nenhum setor encontrado"
          onChange={(selected) => onChange({ ...filters, sectors: selected })}
        />
      )}
    </>
  );
}
