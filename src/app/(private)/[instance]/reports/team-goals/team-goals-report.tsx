"use client";

import { AuthContext } from "@/app/auth-context";
import { ReportPageShell } from "@/components/reports/ReportWorkflow";
import { ReportFormControls, ReportQueryStatus } from "@/components/reports/ReportFormControls";
import { reportPeriodLabel, validateReportPeriod, type ReportPeriod } from "@/lib/reports/filters";
import { useReportForm } from "@/lib/reports/use-report-form";
import useInternalChatContext from "@/app/(private)/[instance]/internal-context";
import {
  getFinancialDashboard,
  getFinancialGoals,
  upsertOperatorGoal,
} from "@/lib/services/marketing.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { Button, TextField } from "@mui/material";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  SearchableEntityFilter,
  type EntityOption,
} from "@/components/reports/SearchableEntityFilter";
import { reportOperatorOptions } from "@/lib/reports/operator-options";
import { toast } from "react-toastify";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartPanel,
  EmptyState,
  formatCurrency,
  formatCurrencyPrecise,
  formatNumber,
  formatPercent,
  getCurrentMonthRange,
  getMonthYearFromDate,
  MetricCard,
  parseNullableNumber,
  ProgressBar,
  shortLabel,
} from "../_components/report-ui";

interface TeamGoalRow {
  operatorId: number;
  operatorName: string;
  totalCompras: number;
  totalFaturamento: number;
  ticketMedio: number;
  propostasConvertidas: number;
  targetRevenue: number | null;
  targetSalesCount: number | null;
  targetAvgTicket: number | null;
  revenueProgress: number;
  salesProgress: number;
  revenueGap: number;
}

export default function TeamGoalsReport() {
  const { token, instance, user } = useContext(AuthContext);
  const { users } = useInternalChatContext();
  const scope = `${instance}:${user?.CODIGO ?? ""}:team-goals`;
  const form = useReportForm({
    scope,
    defaults: getCurrentMonthRange,
    validate: validateReportPeriod,
    execute: async (period: ReportPeriod, signal) => {
      const month = getMonthYearFromDate(period.startDate);
      const [dashboard, goals] = await Promise.all([
        getFinancialDashboard(token, { ...period, groupBy: "day" }, signal),
        getFinancialGoals(token, month.year, month.month, signal),
      ]);
      return { dashboard, goals };
    },
  });
  const { result, loading } = form;
  const dashboard = result?.dashboard ?? null;
  const goals = result?.goals ?? null;
  const [saving, setSaving] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<EntityOption | null>(null);
  const operatorId = selectedOperator?.id;
  const loadOperators = useMemo(() => reportOperatorOptions(token ?? ""), [token]);
  const [goalForm, setGoalForm] = useState({
    targetRevenue: "",
    targetSalesCount: "",
    targetAvgTicket: "",
  });
  const selectedMonth = getMonthYearFromDate((form.applied ?? form.draft).startDate);
  useEffect(() => setSelectedOperator(null), [scope]);

  const operatorOptions = useMemo(
    () =>
      users
        .filter((user) => Number.isFinite(Number(user.CODIGO)))
        .map((user) => ({
          id: Number(user.CODIGO),
          name: user.NOME || user.LOGIN || `#${user.CODIGO}`,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [users],
  );

  useEffect(() => {
    const selectedGoal = goals?.operators.find((goal) => goal.operadorId === operatorId);
    setGoalForm({
      targetRevenue: selectedGoal?.targetRevenue != null ? String(selectedGoal.targetRevenue) : "",
      targetSalesCount:
        selectedGoal?.targetSalesCount != null ? String(selectedGoal.targetSalesCount) : "",
      targetAvgTicket:
        selectedGoal?.targetAvgTicket != null ? String(selectedGoal.targetAvgTicket) : "",
    });
  }, [goals, operatorId]);

  const rows = useMemo<TeamGoalRow[]>(() => {
    const names = new Map(operatorOptions.map((operator) => [operator.id, operator.name]));
    const goalsMap = new Map((goals?.operators || []).map((goal) => [goal.operadorId, goal]));
    const rowsMap = new Map<number, TeamGoalRow>();

    for (const item of dashboard?.byOperator || []) {
      if (!item.operadorId || item.operadorId <= 0) continue;
      const goal = goalsMap.get(item.operadorId);
      const targetRevenue = goal?.targetRevenue ?? null;
      const targetSalesCount = goal?.targetSalesCount ?? null;
      const targetAvgTicket = goal?.targetAvgTicket ?? null;
      rowsMap.set(item.operadorId, {
        operatorId: item.operadorId,
        operatorName: item.operadorNome || names.get(item.operadorId) || `#${item.operadorId}`,
        totalCompras: item.totalCompras,
        totalFaturamento: item.totalFaturamento,
        ticketMedio: item.ticketMedio,
        propostasConvertidas: item.propostasConvertidas,
        targetRevenue,
        targetSalesCount,
        targetAvgTicket,
        revenueProgress: targetRevenue ? (item.totalFaturamento / targetRevenue) * 100 : 0,
        salesProgress: targetSalesCount ? (item.totalCompras / targetSalesCount) * 100 : 0,
        revenueGap: targetRevenue ? Math.max(targetRevenue - item.totalFaturamento, 0) : 0,
      });
    }

    for (const goal of goals?.operators || []) {
      if (rowsMap.has(goal.operadorId)) continue;
      rowsMap.set(goal.operadorId, {
        operatorId: goal.operadorId,
        operatorName: names.get(goal.operadorId) || `#${goal.operadorId}`,
        totalCompras: 0,
        totalFaturamento: 0,
        ticketMedio: 0,
        propostasConvertidas: 0,
        targetRevenue: goal.targetRevenue,
        targetSalesCount: goal.targetSalesCount,
        targetAvgTicket: goal.targetAvgTicket,
        revenueProgress: 0,
        salesProgress: 0,
        revenueGap: goal.targetRevenue || 0,
      });
    }

    return Array.from(rowsMap.values()).sort(
      (left, right) => right.totalFaturamento - left.totalFaturamento,
    );
  }, [dashboard, goals, operatorOptions]);

  const saveOperatorGoal = async () => {
    if (!token || form.locked || saving) return;
    const parsedOperatorId = Number(operatorId);
    if (!Number.isInteger(parsedOperatorId) || parsedOperatorId <= 0) {
      toast.error("Selecione um operador.");
      return;
    }

    setSaving(true);
    try {
      await upsertOperatorGoal(token, {
        year: selectedMonth.year,
        month: selectedMonth.month,
        operadorId: parsedOperatorId,
        targetRevenue: parseNullableNumber(goalForm.targetRevenue),
        targetSalesCount: parseNullableNumber(goalForm.targetSalesCount),
        targetAvgTicket: parseNullableNumber(goalForm.targetAvgTicket),
      });
      toast.success("Meta do operador salva.");
      await form.refresh();
    } catch (error) {
      toast.error(`Falha ao salvar meta do operador.\n${sanitizeErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const totalTargetRevenue = rows.reduce((sum, row) => sum + (row.targetRevenue || 0), 0);
  const totalRevenue = rows.reduce((sum, row) => sum + row.totalFaturamento, 0);
  const teamProgress = totalTargetRevenue > 0 ? (totalRevenue / totalTargetRevenue) * 100 : 0;
  const rowsWithGoal = rows.filter(
    (row) => row.targetRevenue || row.targetSalesCount || row.targetAvgTicket,
  ).length;

  return (
    <ReportPageShell
      instance={instance}
      category="Comercial"
      title="Equipe x Metas"
      description="Compare o realizado de cada operador com a meta do mês que abre o período."
    >
      <ReportFormControls
        form={form}
        period={form.draft}
        setPeriod={form.setDraft}
        disabled={!token}
      />
      <ReportQueryStatus
        query={form}
        labels={
          form.applied
            ? [
                reportPeriodLabel(form.applied),
                `Metas de ${selectedMonth.month}/${selectedMonth.year}`,
              ]
            : []
        }
      />
      {form.result && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Faturamento equipe"
              value={formatCurrency(totalRevenue)}
              detail={`${formatPercent(teamProgress)} da meta`}
              tone="green"
              loading={loading && !dashboard}
            />
            <MetricCard
              label="Meta equipe"
              value={totalTargetRevenue ? formatCurrency(totalTargetRevenue) : "Sem meta"}
              loading={loading && !dashboard}
            />
            <MetricCard
              label="Operadores com meta"
              value={formatNumber(rowsWithGoal)}
              detail={`${formatNumber(rows.length)} no painel`}
              tone="blue"
              loading={loading && !dashboard}
            />
            <MetricCard
              label="Diferença para a meta"
              value={formatCurrency(Math.max(totalTargetRevenue - totalRevenue, 0))}
              tone="amber"
              loading={loading && !dashboard}
            />
          </section>

          <ChartPanel title={`Meta por operador · ${selectedMonth.month}/${selectedMonth.year}`}>
            <div className="grid gap-3 rounded-md bg-slate-50 p-4 dark:bg-slate-950/40 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:items-end">
              <SearchableEntityFilter
                label="Operador da meta"
                value={selectedOperator}
                onChange={setSelectedOperator}
                scope={scope}
                loadOptions={loadOperators}
              />
              <TextField
                label="Meta de faturamento"
                size="small"
                value={goalForm.targetRevenue}
                onChange={(event) =>
                  setGoalForm((prev) => ({ ...prev, targetRevenue: event.target.value }))
                }
              />
              <TextField
                label="Meta de vendas"
                size="small"
                value={goalForm.targetSalesCount}
                onChange={(event) =>
                  setGoalForm((prev) => ({ ...prev, targetSalesCount: event.target.value }))
                }
              />
              <TextField
                label="Meta de ticket médio"
                size="small"
                value={goalForm.targetAvgTicket}
                onChange={(event) =>
                  setGoalForm((prev) => ({ ...prev, targetAvgTicket: event.target.value }))
                }
              />
              <Button
                variant="contained"
                size="small"
                disabled={saving || form.locked}
                onClick={saveOperatorGoal}
              >
                Salvar
              </Button>
            </div>
          </ChartPanel>

          <ChartPanel title="Realizado versus meta">
            <div className="h-[360px]">
              {rows.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows.slice(0, 12)} margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="operatorName"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={78}
                      tickFormatter={(value) => shortLabel(String(value), 14)}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
                    <Legend />
                    <Bar
                      dataKey="totalFaturamento"
                      name="Realizado"
                      fill="#16a34a"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar dataKey="targetRevenue" name="Meta" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </ChartPanel>

          <ChartPanel title="Ranking da equipe">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/40">
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                    <th className="px-3 py-3">Operador</th>
                    <th className="px-3 py-3 text-right">Faturamento</th>
                    <th className="px-3 py-3 text-right">Meta</th>
                    <th className="px-3 py-3 text-right">Avanço</th>
                    <th className="px-3 py-3 text-right">Vendas</th>
                    <th className="px-3 py-3 text-right">Ticket médio</th>
                    <th className="px-3 py-3 text-right">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.operatorId}
                      className="border-b border-slate-100 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-950/40"
                    >
                      <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {row.operatorName}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {formatCurrency(row.totalFaturamento)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {row.targetRevenue ? formatCurrency(row.targetRevenue) : "-"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="grid min-w-24 gap-1">
                          <ProgressBar value={row.revenueProgress} />
                          <span>{formatPercent(row.revenueProgress)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {formatNumber(row.totalCompras)} /{" "}
                        {row.targetSalesCount ? formatNumber(row.targetSalesCount) : "-"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {formatCurrencyPrecise(row.ticketMedio)} /{" "}
                        {row.targetAvgTicket ? formatCurrencyPrecise(row.targetAvgTicket) : "-"}
                      </td>
                      <td className="px-3 py-3 text-right">{formatCurrency(row.revenueGap)}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                        Sem operadores no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartPanel>
        </>
      )}
    </ReportPageShell>
  );
}
