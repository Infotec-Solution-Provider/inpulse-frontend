"use client";

import { Button, TextField } from "@mui/material";
import { ReactNode } from "react";

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

export type DateRange = DateRangeValue;

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthRange(): DateRangeValue {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: formatDateInput(start), endDate: formatDateInput(end) };
}

export function getPreviousRange(range: DateRangeValue): DateRangeValue {
  const start = new Date(`${range.startDate}T00:00:00`);
  const end = new Date(`${range.endDate}T00:00:00`);
  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 86400000);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { startDate: formatDateInput(previousStart), endDate: formatDateInput(previousEnd) };
}

export const getPreviousDateRange = getPreviousRange;

export function getMonthYearFromDate(value: string) {
  const [yearRaw = "0", monthRaw = "0"] = value.split("-");
  return { year: Number(yearRaw), month: Number(monthRaw) };
}

export const getYearMonth = getMonthYearFromDate;

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value || 0);
}

export function formatCurrencyPrecise(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value || 0);
}

export const formatCompactCurrency = formatCurrency;

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(value || 0);
}

export function formatPercent(value: number | null | undefined) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

export function parseNullableNumber(value: string) {
  if (!value.trim()) return null;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function progressPercent(current: number | null | undefined, target: number | null | undefined) {
  if (!target || target <= 0) return 0;
  return Math.max(0, Math.min(999, ((current || 0) / target) * 100));
}

export function shortLabel(value: string, maxLength = 16) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

export function ReportShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="box-border h-full overflow-y-auto bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-slate-100 md:px-6 md:py-8">
      <div className="mx-auto grid w-full max-w-[1680px] gap-6">
        <ReportHeader title={title} subtitle={subtitle} />
        {children}
      </div>
    </div>
  );
}

export function ReportHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex min-w-0 flex-col gap-2 border-b border-slate-200 px-1 pb-5 dark:border-slate-800">
      <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-slate-100 md:text-3xl">{title}</h1>
      {subtitle ? <p className="max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
    </header>
  );
}

export function DateRangeToolbar({
  value,
  onChange,
  onRefresh,
  loading,
  children,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  onRefresh: () => void;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <form
      className="sticky top-0 z-10 flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
      onSubmit={(event) => {
        event.preventDefault();
        onRefresh();
      }}
    >
      <TextField label="Data inicial" type="date" size="small" value={value.startDate} onChange={(event) => onChange({ ...value, startDate: event.target.value })} InputLabelProps={{ shrink: true }} className="w-44" />
      <TextField label="Data final" type="date" size="small" value={value.endDate} onChange={(event) => onChange({ ...value, endDate: event.target.value })} InputLabelProps={{ shrink: true }} className="w-44" />
      {children}
      <Button type="submit" variant="contained" size="small" disabled={loading}>{loading ? "Atualizando" : "Atualizar"}</Button>
    </form>
  );
}

export function ReportToolbar({
  range,
  onRangeChange,
  onSubmit,
  loading,
  children,
}: {
  range: DateRangeValue;
  onRangeChange: (value: DateRangeValue) => void;
  onSubmit: () => void;
  loading?: boolean;
  children?: ReactNode;
}) {
  return <DateRangeToolbar value={range} onChange={onRangeChange} onRefresh={onSubmit} loading={loading}>{children}</DateRangeToolbar>;
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "slate",
  loading,
}: {
  label: ReactNode;
  value: string;
  detail?: string;
  tone?: "slate" | "green" | "emerald" | "amber" | "red" | "blue" | "sky";
  loading?: boolean;
}) {
  const tones = {
    slate: { shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900", accent: "bg-slate-400", value: "text-slate-950 dark:text-slate-100" },
    green: { shell: "border-emerald-200 bg-white dark:border-emerald-500/30 dark:bg-emerald-500/10", accent: "bg-emerald-500", value: "text-emerald-700 dark:text-emerald-300" },
    emerald: { shell: "border-emerald-200 bg-white dark:border-emerald-500/30 dark:bg-emerald-500/10", accent: "bg-emerald-500", value: "text-emerald-700 dark:text-emerald-300" },
    amber: { shell: "border-amber-200 bg-white dark:border-amber-500/30 dark:bg-amber-500/10", accent: "bg-amber-500", value: "text-amber-700 dark:text-amber-300" },
    red: { shell: "border-rose-200 bg-white dark:border-rose-500/30 dark:bg-rose-500/10", accent: "bg-rose-500", value: "text-rose-700 dark:text-rose-300" },
    blue: { shell: "border-sky-200 bg-white dark:border-sky-500/30 dark:bg-sky-500/10", accent: "bg-sky-500", value: "text-sky-700 dark:text-sky-300" },
    sky: { shell: "border-sky-200 bg-white dark:border-sky-500/30 dark:bg-sky-500/10", accent: "bg-sky-500", value: "text-sky-700 dark:text-sky-300" },
  };
  const toneClasses = tones[tone];
  return (
    <section className={`relative min-h-[118px] overflow-hidden rounded-md border p-4 pl-5 shadow-sm ${toneClasses.shell}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${toneClasses.accent}`} />
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</div>
      {loading ? (
        <div className="mt-3 h-8 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      ) : (
        <div className={`mt-2 break-words text-2xl font-semibold leading-tight ${toneClasses.value}`}>{value}</div>
      )}
      {detail ? <div className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">{detail}</div> : null}
    </section>
  );
}

export function ChartPanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <h2 className="min-w-0 text-base font-semibold text-slate-950 dark:text-slate-100">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export const TablePanel = ChartPanel;

export function EmptyState({ label = "Sem dados para o período selecionado." }: { label?: string }) {
  return <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">{label}</div>;
}

export function ProgressBar({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(value, 100));
  const fillColor = normalized >= 100 ? "bg-emerald-500" : normalized >= 70 ? "bg-sky-500" : normalized >= 35 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <div className={`h-full rounded-full ${fillColor}`} style={{ width: `${normalized}%` }} />
    </div>
  );
}

export function ReportTable({ children }: { children: ReactNode }) {
  return <table className="w-full min-w-[840px] text-left text-sm">{children}</table>;
}

export function ReportTh({ children, align = "left" }: { children: ReactNode; align?: "left" | "center" | "right" }) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`border-b border-slate-200 bg-slate-50 px-3 py-3 font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 ${alignClass}`}>{children}</th>;
}

export function ReportTd({ children, align = "left" }: { children: ReactNode; align?: "left" | "center" | "right" }) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`border-b border-slate-100 px-3 py-3 dark:border-slate-800 ${alignClass}`}>{children}</td>;
}
