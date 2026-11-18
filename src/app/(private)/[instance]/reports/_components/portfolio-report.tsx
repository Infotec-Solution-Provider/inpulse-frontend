"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { Alert, Button } from "@mui/material";
import { Download } from "lucide-react";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { AuthContext } from "@/app/auth-context";
import { ReportFormControls, ReportQueryStatus } from "@/components/reports/ReportFormControls";
import { ReportPageShell } from "@/components/reports/ReportWorkflow";
import {
  SearchableEntityFilter,
  type EntityOption,
} from "@/components/reports/SearchableEntityFilter";
import {
  defaultReportPeriod,
  downloadReportFile,
  reportPeriodLabel,
  validateReportPeriod,
  type ReportPeriod,
} from "@/lib/reports/filters";
import { localReportOptions, reportSelectionLabel } from "@/lib/reports/report-options";
import { useReportForm } from "@/lib/reports/use-report-form";
import type { ReactNode } from "react";

interface PortfolioCatalog {
  portfolios: EntityOption[];
  operators: EntityOption[];
}

export interface PortfolioFilters<M> {
  period: ReportPeriod;
  portfolios: EntityOption[];
  operators: EntityOption[];
  mode: M;
}

export function portfolioParams<M>(filters: PortfolioFilters<M>, catalog: PortfolioCatalog) {
  const portfolios = filters.portfolios.length ? filters.portfolios : catalog.portfolios;
  return {
    carteiras: Array.from(new Set(portfolios.map(({ id }) => id))),
    operadores: filters.operators.map(({ id }) => id),
    dataInicial: filters.period.startDate,
    dataFinal: filters.period.endDate,
  };
}

interface Definition<M, C extends PortfolioCatalog, R> {
  id: string;
  title: string;
  description: string;
  defaultMode: M;
  load: (token: string, signal: AbortSignal) => Promise<C>;
  run: (token: string, filters: PortfolioFilters<M>, catalog: C, signal: AbortSignal) => Promise<R>;
  download: (
    token: string,
    filters: PortfolioFilters<M>,
    catalog: C,
    format: "pdf" | "csv",
  ) => Promise<Blob>;
  fields: (mode: M, onChange: (value: M) => void) => ReactNode;
  labels: (mode: M) => string[];
  render: (result: R, exportCsv: () => void, exportDisabled: boolean) => ReactNode;
}

export function PortfolioReport<M, C extends PortfolioCatalog, R>({
  instance,
  definition,
}: {
  instance: string;
  definition: Definition<M, C, R>;
}) {
  const { token, user } = useContext(AuthContext);
  const scope = instance + ":" + user?.CODIGO + ":" + definition.id;
  const auth = token ? "Bearer " + token.replace(/^Bearer\s+/i, "") : "";
  return (
    <PortfolioReportContent
      key={scope}
      instance={instance}
      scope={scope}
      auth={auth}
      definition={definition}
    />
  );
}

function PortfolioReportContent<M, C extends PortfolioCatalog, R>({
  instance,
  scope,
  auth,
  definition,
}: {
  instance: string;
  scope: string;
  auth: string;
  definition: Definition<M, C, R>;
}) {
  const [catalog, setCatalog] = useState<C | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const load = definition.load;
  useEffect(() => {
    if (!auth) return;
    const controller = new AbortController();
    void load(auth, controller.signal)
      .then((options) => {
        if (!controller.signal.aborted) setCatalog(options);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setOptionsError(sanitizeErrorMessage(error));
      });
    return () => controller.abort();
  }, [auth, load, retry]);

  const portfolioOptions = useMemo(() => localReportOptions(catalog?.portfolios ?? []), [catalog]);
  const operatorOptions = useMemo(() => localReportOptions(catalog?.operators ?? []), [catalog]);
  const form = useReportForm({
    scope,
    defaults: (): PortfolioFilters<M> => ({
      period: defaultReportPeriod(),
      portfolios: [],
      operators: [],
      mode: definition.defaultMode,
    }),
    validate: (filters) =>
      validateReportPeriod(filters.period) ??
      (catalog?.portfolios.length ? null : "Nenhuma carteira disponível."),
    execute: (filters, signal) => {
      if (!catalog) throw new Error("Aguarde o carregamento das carteiras.");
      return definition.run(auth, filters, catalog, signal);
    },
  });
  const exportDisabled = form.locked || exporting;
  const { applied } = form;

  async function download(format: "pdf" | "csv") {
    if (!applied || !catalog || exportDisabled) return;
    setExporting(true);
    setExportError(null);
    try {
      const file = await definition.download(auth, applied, catalog, format);
      downloadReportFile(
        definition.id +
          "-" +
          applied.period.startDate +
          "-" +
          applied.period.endDate +
          "." +
          format,
        file,
      );
    } catch (error) {
      setExportError(sanitizeErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  return (
    <ReportPageShell
      instance={instance}
      category="Carteiras e campanhas"
      title={definition.title}
      description={definition.description}
      actions={
        <Button
          variant="outlined"
          disabled={exportDisabled}
          startIcon={<Download size={16} />}
          onClick={() => void download("pdf")}
        >
          {exporting ? "Exportando…" : "Exportar PDF"}
        </Button>
      }
    >
      {optionsError && (
        <Alert
          severity="error"
          action={
            <Button
              onClick={() => {
                setOptionsError(null);
                setRetry((value) => value + 1);
              }}
            >
              Tentar novamente
            </Button>
          }
        >
          {optionsError}
        </Alert>
      )}
      {!catalog && !optionsError && (
        <Alert severity="info">Carregando carteiras e operadores…</Alert>
      )}
      {catalog && catalog.portfolios.length === 0 && (
        <Alert severity="warning">Nenhuma carteira disponível para este relatório.</Alert>
      )}
      <ReportFormControls
        form={form}
        period={form.draft.period}
        setPeriod={(period) => form.setDraft({ ...form.draft, period })}
        disabled={!catalog?.portfolios.length}
      >
        <SearchableEntityFilter
          multiple
          label="Carteiras"
          scope={scope}
          value={form.draft.portfolios}
          loadOptions={portfolioOptions}
          onChange={(portfolios) => form.setDraft({ ...form.draft, portfolios })}
        />
        <SearchableEntityFilter
          multiple
          label="Operadores"
          scope={scope}
          value={form.draft.operators}
          loadOptions={operatorOptions}
          onChange={(operators) => form.setDraft({ ...form.draft, operators })}
        />
        {definition.fields(form.draft.mode, (mode) => form.setDraft({ ...form.draft, mode }))}
      </ReportFormControls>
      <ReportQueryStatus
        query={form}
        labels={
          applied
            ? [
                reportPeriodLabel(applied.period),
                reportSelectionLabel("Carteiras", applied.portfolios),
                reportSelectionLabel("Operadores", applied.operators),
                ...definition.labels(applied.mode),
              ]
            : []
        }
      />
      {exportError && <Alert severity="error">{exportError}</Alert>}
      {form.result && definition.render(form.result, () => void download("csv"), exportDisabled)}
    </ReportPageShell>
  );
}
