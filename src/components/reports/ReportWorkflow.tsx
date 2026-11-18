"use client";

import Link from "next/link";
import { Alert, Button, Chip, CircularProgress, TextField } from "@mui/material";
import { ArrowLeft, FileChartColumn, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { reportPeriodShortcut, type ReportPeriod } from "@/lib/reports/filters";

export function ReportPageShell({
  instance,
  category,
  title,
  description,
  children,
  actions,
}: {
  instance: string;
  category: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="box-border h-full min-w-0 overflow-y-auto bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-100 md:p-6">
      <div className="mx-auto grid w-full min-w-0 max-w-[1600px] gap-6">
        <header className="grid gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
          <nav
            aria-label="Caminho do relatório"
            className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
          >
            <Link
              href={`/${instance}/reports`}
              className="inline-flex items-center gap-1 hover:text-indigo-600"
            >
              <ArrowLeft size={15} />
              Relatórios
            </Link>
            <span aria-hidden="true">/</span>
            <span>{category}</span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
              {description && (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function ReportFilterPanel({
  period,
  onPeriodChange,
  onGenerate,
  onClear,
  onRestore,
  loading,
  dirty,
  children,
  submitLabel = "Gerar relatório",
  pendingLabel = "Gerando relatório…",
  disabled = false,
}: {
  period?: ReportPeriod;
  onPeriodChange?: (period: ReportPeriod) => void;
  onGenerate: () => void;
  onClear?: () => void;
  onRestore?: () => void;
  loading: boolean;
  dirty: boolean;
  children?: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  return (
    <form
      className="grid min-w-0 gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && !loading) onGenerate();
      }}
    >
      {(period || children) && <h2 className="font-semibold">Filtros</h2>}
      {period && onPeriodChange && (
        <div className="flex flex-wrap gap-2" aria-label="Atalhos de período">
          {[
            ["today", "Hoje"],
            ["yesterday", "Ontem"],
            ["last7", "Últimos 7 dias"],
            ["month", "Este mês"],
            ["previousMonth", "Mês anterior"],
          ].map(([id, label]) => (
            <Button
              key={id}
              size="small"
              variant="outlined"
              onClick={() => onPeriodChange(reportPeriodShortcut(id))}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
      {(period || children) && (
        <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {period && onPeriodChange && (
            <>
              <TextField
                label="Data inicial"
                type="date"
                size="small"
                value={period.startDate}
                onChange={(event) => onPeriodChange({ ...period, startDate: event.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                label="Data final"
                type="date"
                size="small"
                value={period.endDate}
                onChange={(event) => onPeriodChange({ ...period, endDate: event.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </>
          )}
          {children}
        </div>
      )}
      <div
        className={
          period || children
            ? "flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"
            : "flex flex-wrap items-center gap-3"
        }
      >
        <Button
          type="submit"
          variant="contained"
          disabled={loading || disabled}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : <FileChartColumn size={17} />
          }
        >
          {loading ? pendingLabel : submitLabel}
        </Button>
        {onClear && (
          <Button onClick={onClear} startIcon={<RotateCcw size={16} />}>
            Limpar filtros
          </Button>
        )}
        {dirty && onRestore && <Button onClick={onRestore}>Descartar alterações</Button>}
      </div>
      {dirty && (
        <Alert severity="warning">
          Filtros alterados. Gere novamente para atualizar o resultado e liberar a exportação.
        </Alert>
      )}
    </form>
  );
}

export function ReportExecutionStatus({
  loading,
  error,
  generatedAt,
  labels,
  hasResult,
  hasFilters = true,
}: {
  loading: boolean;
  error: string | null;
  generatedAt: string | null;
  labels: string[];
  hasResult: boolean;
  hasFilters?: boolean;
}) {
  return (
    <div className="grid gap-3" aria-live="polite">
      {error && (
        <Alert severity="error">
          {error}
          {hasResult ? " O resultado anterior foi mantido." : ""}
        </Alert>
      )}
      {loading && (
        <Alert severity="info" icon={<CircularProgress size={18} />}>
          Gerando relatório. Aguarde a conclusão.
        </Alert>
      )}
      {!hasResult && !loading && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {hasFilters
            ? "Defina os filtros e clique em Gerar relatório para consultar os dados."
            : "Clique em Gerar relatório para consultar os dados."}
        </div>
      )}
      {hasResult && (
        <div
          className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
          aria-label="Filtros aplicados"
        >
          <span>
            Resultado gerado em {generatedAt && new Date(generatedAt).toLocaleString("pt-BR")}
            {labels.length > 0 && " · filtros aplicados:"}
          </span>
          {labels.map((label) => (
            <Chip key={label} size="small" label={label} />
          ))}
        </div>
      )}
    </div>
  );
}
