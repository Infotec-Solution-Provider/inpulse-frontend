"use client";

import { ChartType } from "./dashboard-context";
import { MenuItem, TextField } from "@mui/material";
import { ReactNode } from "react";

interface DashboardReportCardProps {
  title: string;
  description: string;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  chart: ReactNode;
  table: ReactNode;
  isLoading?: boolean;
  onExport?: () => void;
}

export default function DashboardReportCard({
  title,
  description,
  chartType,
  onChartTypeChange,
  chart,
  table,
  isLoading,
  onExport
}: DashboardReportCardProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLoading && (
            <span className="text-xs text-slate-500">Carregando...</span>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              type="button"
            >
              Exportar CSV
            </button>
          )}
          <TextField
            select
            size="small"
            label="Tipo de gráfico"
            value={chartType}
            onChange={(e) => onChartTypeChange(e.target.value as ChartType)}
            className="min-w-[160px]"
          >
            <MenuItem value="bar">Barras</MenuItem>
            <MenuItem value="pie">Pizza</MenuItem>
            <MenuItem value="line">Linha</MenuItem>
          </TextField>
        </div>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="min-h-[430px] rounded-md bg-slate-50 p-4 dark:bg-slate-800/40">
          {chart}
        </div>
        <div className="max-h-[430px] overflow-y-auto rounded-md border border-slate-100 bg-white p-4 text-xs shadow-inner dark:border-slate-700 dark:bg-slate-900">
          {table}
        </div>
      </div>
    </section>
  );
}
