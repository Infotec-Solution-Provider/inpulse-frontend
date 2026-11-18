"use client";

import { useCallback, useMemo, useState } from "react";
import { Alert } from "@mui/material";
import { attendanceReportDefinitions, type AttendanceFilters } from "@/lib/reports/attendance-data";
import { attendanceReportPaths, type AttendanceReportId } from "@/lib/reports/attendance-routes";
import { REPORT_CATALOG, normalizeReportSearch } from "@/lib/reports/catalog";
import {
  defaultReportPeriod,
  downloadReportCsv,
  reportPeriodShortcut,
  validateReportPeriod,
} from "@/lib/reports/filters";
import { reportOperatorOptions } from "@/lib/reports/operator-options";
import { useReportExecution } from "@/lib/reports/use-report-execution";
import { ReportExecutionStatus, ReportFilterPanel, ReportPageShell } from "./ReportWorkflow";
import { ReportResultChart, ReportResultTable } from "./ReportResults";
import {
  SearchableEntityFilter,
  type EntityOption,
  type EntityOptionsLoader,
} from "./SearchableEntityFilter";

function defaultFilters(report: AttendanceReportId): AttendanceFilters {
  return {
    period:
      report === "contactsAwaitingReturn"
        ? null
        : report === "messagesPerHourDay"
          ? reportPeriodShortcut("today")
          : defaultReportPeriod(),
    operators: [],
    sectors: [],
  };
}

function validateFilters(filters: AttendanceFilters) {
  return filters.period ? validateReportPeriod(filters.period) : null;
}

function filterKey(filters: AttendanceFilters) {
  const byId = (values: EntityOption[]) => values.map((option) => option.id).sort((a, b) => a - b);
  return JSON.stringify([filters.period, byId(filters.operators), byId(filters.sectors)]);
}

export function AttendanceReport({
  report,
  instance,
  token,
  scope,
  sectors,
}: {
  report: AttendanceReportId;
  instance: string;
  token: string;
  scope: string;
  sectors: { id: number; name: string }[];
}) {
  const path = attendanceReportPaths[report];
  const item = REPORT_CATALOG.find((entry) => entry.href === `/reports/${path}`)!;
  const definition = attendanceReportDefinitions[report];
  const [draft, setDraft] = useState(() => defaultFilters(report));
  const operatorOptions = useMemo(() => reportOperatorOptions(token), [token]);
  const sectorOptions: EntityOptionsLoader = useCallback(
    async (search, page) => {
      const query = normalizeReportSearch(search);
      const options = sectors
        .filter((sector) => normalizeReportSearch(`${sector.name} ${sector.id}`).includes(query))
        .map((sector) => ({ id: sector.id, label: sector.name }));
      return {
        options: options.slice((page - 1) * 50, page * 50),
        hasMore: options.length > page * 50,
      };
    },
    [sectors],
  );
  const execute = useCallback(
    (filters: AttendanceFilters, signal: AbortSignal) => definition.execute(token, filters, signal),
    [definition, token],
  );
  const execution = useReportExecution({ scope, execute, validate: validateFilters });
  const { applied, result, loading, error, generatedAt } = execution;
  const dirty = Boolean(applied && filterKey(applied) !== filterKey(draft));
  const labels = [];
  if (applied?.period) {
    const format = (date: string) => date.split("-").reverse().join("/");
    labels.push(`${format(applied.period.startDate)} a ${format(applied.period.endDate)}`);
    labels.push(
      applied.operators.length
        ? `Operadores: ${applied.operators.map((option) => option.label).join(", ")}`
        : "Todos os operadores",
    );
    if (report === "messagesPerHourDay") {
      labels.push(
        applied.sectors.length
          ? `Setores: ${applied.sectors.map((option) => option.label).join(", ")}`
          : "Todos os setores",
      );
    }
  }

  return (
    <ReportPageShell
      instance={instance}
      category="Atendimento e WhatsApp"
      title={item.title}
      description={item.description}
    >
      <ReportFilterPanel
        period={draft.period ?? undefined}
        onPeriodChange={(period) => setDraft((current) => ({ ...current, period }))}
        onGenerate={() => void execution.generate(draft)}
        onClear={draft.period ? () => setDraft(defaultFilters(report)) : undefined}
        onRestore={applied ? () => setDraft(applied) : undefined}
        loading={loading}
        dirty={dirty}
      >
        {report === "messagesPerContact" ? (
          <SearchableEntityFilter
            label="Operador"
            scope={scope}
            value={draft.operators[0] ?? null}
            onChange={(operator) =>
              setDraft((current) => ({ ...current, operators: operator ? [operator] : [] }))
            }
            loadOptions={operatorOptions}
          />
        ) : report === "messagesPerHourDay" ? (
          <>
            <SearchableEntityFilter
              multiple
              label="Operadores"
              scope={scope}
              value={draft.operators}
              onChange={(operators) => setDraft((current) => ({ ...current, operators }))}
              loadOptions={operatorOptions}
            />
            <SearchableEntityFilter
              multiple
              label="Setores"
              scope={scope}
              value={draft.sectors}
              onChange={(selectedSectors) =>
                setDraft((current) => ({ ...current, sectors: selectedSectors }))
              }
              loadOptions={sectorOptions}
              moreLabel="Carregar mais setores"
              emptyLabel="Nenhum setor encontrado"
            />
          </>
        ) : null}
      </ReportFilterPanel>
      <ReportExecutionStatus
        hasFilters={Boolean(draft.period)}
        hasResult={result !== null}
        loading={loading}
        error={error}
        generatedAt={generatedAt}
        labels={labels}
      />
      {result &&
        (result.rows.length === 0 ? (
          <Alert severity="info">{definition.emptyMessage}</Alert>
        ) : (
          <>
            <ReportResultChart
              title={definition.chartTitle}
              points={result.points}
              initialType={definition.chartType}
              directions={definition.directions}
              metric={definition.metric}
              note={definition.chartNote}
              hideXAxis={report === "messagesPerContact"}
            />
            <ReportResultTable
              columns={definition.columns}
              rows={result.rows}
              searchHint={definition.searchHint}
              exportDisabled={dirty || loading || Boolean(error)}
              onExport={() => downloadReportCsv(`${path}.csv`, result.csvHeaders, result.csvRows)}
            />
          </>
        ))}
    </ReportPageShell>
  );
}
