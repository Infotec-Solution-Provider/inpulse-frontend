"use client";

import { AuthContext } from "@/app/auth-context";
import { FinancialDashboardResult, FinancialGoalsResult, getFinancialDashboard, getFinancialGoals, upsertGeneralGoal } from "@/lib/services/marketing.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { Button, TextField } from "@mui/material";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartPanel, DateRangeToolbar, EmptyState, formatCurrency, formatCurrencyPrecise, formatNumber, formatPercent, formatShortDate, getCurrentMonthRange, getMonthYearFromDate, getPreviousRange, MetricCard, parseNullableNumber, ProgressBar, ReportShell, shortLabel } from "../_components/report-ui";

const COLORS = ["#2563eb", "#16a34a", "#f97316", "#8b5cf6", "#06b6d4"];

function calculateProjection(startDate: string, endDate: string, currentRevenue: number) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date();
  const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
  const elapsedEnd = today < start ? start : today > end ? end : today;
  const elapsedDays = Math.max(1, Math.floor((elapsedEnd.getTime() - start.getTime()) / 86400000) + 1);
  return (currentRevenue / elapsedDays) * totalDays;
}

export default function GoalsDashboardReport() {
  const { token } = useContext(AuthContext);
  const [dateRange, setDateRange] = useState(() => getCurrentMonthRange());
  const [dashboard, setDashboard] = useState<FinancialDashboardResult | null>(null);
  const [goals, setGoals] = useState<FinancialGoalsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [goalForm, setGoalForm] = useState({ targetRevenue: "", targetSalesCount: "", targetAvgTicket: "" });

  const selectedMonth = useMemo(() => getMonthYearFromDate(dateRange.startDate), [dateRange.startDate]);

  const loadReport = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const previousRange = getPreviousRange(dateRange);
      const [dashboardResult, goalsResult] = await Promise.all([
        getFinancialDashboard(token, { ...dateRange, groupBy: "day", compareStartDate: previousRange.startDate, compareEndDate: previousRange.endDate }),
        getFinancialGoals(token, selectedMonth.year, selectedMonth.month),
      ]);
      setDashboard(dashboardResult);
      setGoals(goalsResult);
      setGoalForm({
        targetRevenue: goalsResult.general?.targetRevenue != null ? String(goalsResult.general.targetRevenue) : "",
        targetSalesCount: goalsResult.general?.targetSalesCount != null ? String(goalsResult.general.targetSalesCount) : "",
        targetAvgTicket: goalsResult.general?.targetAvgTicket != null ? String(goalsResult.general.targetAvgTicket) : "",
      });
    } catch (error) {
      toast.error(`Falha ao carregar metas e indicadores.\n${sanitizeErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedMonth.month, selectedMonth.year, token]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const saveGoal = async () => {
    if (!token) return;

    setSaving(true);
    try {
      await upsertGeneralGoal(token, {
        year: selectedMonth.year,
        month: selectedMonth.month,
        targetRevenue: parseNullableNumber(goalForm.targetRevenue),
        targetSalesCount: parseNullableNumber(goalForm.targetSalesCount),
        targetAvgTicket: parseNullableNumber(goalForm.targetAvgTicket),
      });
      toast.success("Meta geral salva.");
      await loadReport();
    } catch (error) {
      toast.error(`Falha ao salvar meta geral.\n${sanitizeErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const targetRevenue = goals?.general?.targetRevenue || 0;
  const targetSalesCount = goals?.general?.targetSalesCount || 0;
  const targetAvgTicket = goals?.general?.targetAvgTicket || 0;
  const revenueProgress = targetRevenue > 0 ? ((dashboard?.summary.totalFaturamento || 0) / targetRevenue) * 100 : 0;
  const salesProgress = targetSalesCount > 0 ? ((dashboard?.summary.totalCompras || 0) / targetSalesCount) * 100 : 0;
  const projectedRevenue = calculateProjection(dateRange.startDate, dateRange.endDate, dashboard?.summary.totalFaturamento || 0);
  const comparisonRevenue = dashboard?.comparison?.totalFaturamento || 0;
  const revenueDelta = comparisonRevenue > 0 ? (((dashboard?.summary.totalFaturamento || 0) - comparisonRevenue) / comparisonRevenue) * 100 : 0;

  return (
    <ReportShell title="Metas e Indicadores" subtitle="Visão executiva do realizado financeiro, metas mensais e ritmo do período.">
      <DateRangeToolbar value={dateRange} onChange={setDateRange} onRefresh={loadReport} loading={loading} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Faturamento" value={formatCurrency(dashboard?.summary.totalFaturamento)} detail={`${formatPercent(revenueProgress)} da meta`} tone="green" loading={loading && !dashboard} />
        <MetricCard label="Compras" value={formatNumber(dashboard?.summary.totalCompras)} detail={`${formatPercent(salesProgress)} da meta`} loading={loading && !dashboard} />
        <MetricCard label="Ticket médio" value={formatCurrencyPrecise(dashboard?.summary.ticketMedio)} detail={targetAvgTicket ? `Meta ${formatCurrencyPrecise(targetAvgTicket)}` : "Meta não cadastrada"} tone="blue" loading={loading && !dashboard} />
        <MetricCard label="Projeção" value={formatCurrency(projectedRevenue)} detail={`Período anterior: ${formatPercent(revenueDelta)}`} tone="amber" loading={loading && !dashboard} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <ChartPanel title="Avanço da meta geral">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-sm"><span className="font-medium text-slate-700 dark:text-slate-200">Faturamento</span><span>{formatCurrency(dashboard?.summary.totalFaturamento)} / {targetRevenue ? formatCurrency(targetRevenue) : "Sem meta"}</span></div>
              <ProgressBar value={revenueProgress} />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-sm"><span className="font-medium text-slate-700 dark:text-slate-200">Vendas</span><span>{formatNumber(dashboard?.summary.totalCompras)} / {targetSalesCount ? formatNumber(targetSalesCount) : "Sem meta"}</span></div>
              <ProgressBar value={salesProgress} />
            </div>
            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="grid gap-3 md:grid-cols-3">
                <TextField label="Meta de faturamento" size="small" value={goalForm.targetRevenue} onChange={(event) => setGoalForm((prev) => ({ ...prev, targetRevenue: event.target.value }))} />
                <TextField label="Meta de vendas" size="small" value={goalForm.targetSalesCount} onChange={(event) => setGoalForm((prev) => ({ ...prev, targetSalesCount: event.target.value }))} />
                <TextField label="Meta de ticket médio" size="small" value={goalForm.targetAvgTicket} onChange={(event) => setGoalForm((prev) => ({ ...prev, targetAvgTicket: event.target.value }))} />
              </div>
              <div><Button variant="contained" size="small" disabled={saving} onClick={saveGoal}>Salvar meta geral</Button></div>
            </div>
          </div>
        </ChartPanel>

        <ChartPanel title="Mix financeiro">
          <div className="h-[330px]">
            {dashboard?.byTipo.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dashboard.byTipo} dataKey="totalFaturamento" nameKey="tipo" outerRadius={110} label>
                    {dashboard.byTipo.map((row, index) => <Cell key={row.tipo || `tipo-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </div>
        </ChartPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Ritmo diário">
          <div className="h-[320px]">
            {dashboard?.byPeriod.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.byPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11 }} tickFormatter={(value) => formatShortDate(String(value))} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => [name === "Faturamento" ? formatCurrency(Number(value)) : formatNumber(Number(value)), name]} labelFormatter={(label) => formatShortDate(String(label))} />
                  <Legend />
                  <Line type="monotone" dataKey="totalFaturamento" name="Faturamento" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="totalCompras" name="Compras" stroke="#16a34a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </div>
        </ChartPanel>

        <ChartPanel title="Principais operadores por faturamento">
          <div className="h-[320px]">
            {dashboard?.byOperator.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.byOperator.slice(0, 10)} margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="operadorNome" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} tickFormatter={(value) => shortLabel(String(value), 14)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
                  <Bar dataKey="totalFaturamento" name="Faturamento" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </div>
        </ChartPanel>
      </section>
    </ReportShell>
  );
}
