"use client";

import { useMemo, useState } from "react";
import { DashboardHelpTooltip, DashboardLabelWithTooltip } from "./dashboard-help-tooltip";
import DashboardLoadingIndicator from "./dashboard-loading-indicator";
import type {
  OperatorPerformanceDailySeriesRow,
  OperatorPerformanceRow,
  OperatorPerformanceSummary,
} from "./dashboard-context";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendMetric = "chatsFinishedCount" | "messagesCount" | "pendingReturnsCount" | "transfersSentCount";

interface GeneralPerformanceReportProps {
  summary: OperatorPerformanceSummary | null;
  previousSummary: OperatorPerformanceSummary | null;
  operators: OperatorPerformanceRow[];
  dailySeries: OperatorPerformanceDailySeriesRow[];
  isLoading?: boolean;
}

interface SectorOverviewRow {
  sectorName: string;
  operatorsCount: number;
  stableOperatorsCount: number;
  attentionOperatorsCount: number;
  criticalOperatorsCount: number;
  messagesCount: number;
  previousMessagesCount: number;
  chatsFinishedCount: number;
  previousChatsFinishedCount: number;
  pendingReturnsCount: number;
  previousPendingReturnsCount: number;
  transfersCount: number;
  averageFirstResponseSeconds: number | null;
  averageHandlingSeconds: number | null;
}

interface ComparisonBadge {
  label: string;
  percentageLabel: string;
  detail: string;
  className: string;
}

const CHART_COLORS = {
  primary: "#1d4ed8",
  previous: "#94a3b8",
  stable: "#0f766e",
  attention: "#d97706",
  critical: "#be123c",
  neutral: "#475569",
};

const trendMetricOptions: Array<{ key: TrendMetric; label: string }> = [
  { key: "chatsFinishedCount", label: "Finalizados" },
  { key: "messagesCount", label: "Mensagens" },
  { key: "pendingReturnsCount", label: "Pendências" },
  { key: "transfersSentCount", label: "Transf. feitas" },
];

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return "-";

  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
  }

  return `${remainingSeconds}s`;
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercentage(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatDateRange(summary: OperatorPerformanceSummary | null) {
  if (!summary?.periodStart || !summary?.periodEnd) return "Período amplo";
  const [startYear, startMonth, startDay] = summary.periodStart.split("-");
  const [endYear, endMonth, endDay] = summary.periodEnd.split("-");

  if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
    return "Período selecionado";
  }

  return `${startDay}/${startMonth}/${startYear} a ${endDay}/${endMonth}/${endYear}`;
}

function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const stringValue = value == null ? "" : String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const csv = [headers.join(";"), ...rows.map((row) => headers.map((header) => escape(row[header])).join(";"))].join(
    "\n",
  );

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function EmptyState({ message = "Sem dados para este relatório." }: { message?: string }) {
  return <div className="text-sm text-slate-500">{message}</div>;
}

function getPendingRate(row: Pick<OperatorPerformanceRow, "pendingReturnsCount" | "chatsHandledCount" | "chatsFinishedCount">) {
  const base = Math.max(row.chatsHandledCount, row.chatsFinishedCount, 1);
  return row.pendingReturnsCount / base;
}

function getTransferLoadRate(
  row: Pick<OperatorPerformanceRow, "transfersSentCount" | "transfersReceivedCount" | "chatsHandledCount" | "chatsFinishedCount">,
) {
  const base = Math.max(row.chatsHandledCount, row.chatsFinishedCount, 1);
  return (row.transfersSentCount + row.transfersReceivedCount) / base;
}

function getOperatorSeverity(row: OperatorPerformanceRow) {
  if (row.userId === -1) return 0;

  const firstResponse = row.averageFirstResponseSeconds ?? 0;
  const handling = row.averageHandlingSeconds ?? 0;
  const pendingRate = getPendingRate(row);
  const transferRate = getTransferLoadRate(row);

  return Math.max(
    firstResponse > 900 ? 2 : firstResponse > 300 ? 1 : 0,
    handling > 7200 ? 2 : handling > 3600 ? 1 : 0,
    pendingRate > 0.18 ? 2 : pendingRate > 0.08 ? 1 : 0,
    transferRate > 0.45 ? 2 : transferRate > 0.22 ? 1 : 0,
  );
}

function getComparisonBadge(
  current: number | null | undefined,
  previous: number | null | undefined,
  direction: "higher" | "lower",
  formatter: (value: number) => string,
): ComparisonBadge | null {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }

  const delta = current - previous;
  if (delta === 0) {
    return {
      label: "0",
      percentageLabel: "0%",
      detail: "vs período anterior",
      className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  const improved = direction === "higher" ? delta > 0 : delta < 0;
  const percentage = previous !== 0 ? (Math.abs(delta) / Math.abs(previous)) * 100 : null;

  return {
    label: `${delta > 0 ? "+" : "-"}${formatter(Math.abs(delta))}`,
    percentageLabel: percentage != null ? `${percentage.toFixed(0)}%` : "s/base",
    detail: "vs período anterior",
    className: improved
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  };
}

function KpiCard({
  label,
  value,
  helper,
  tooltip,
  accentClass,
  comparison,
}: {
  label: string;
  value: string | number;
  helper?: string;
  tooltip?: React.ReactNode;
  accentClass: string;
  comparison?: ComparisonBadge | null;
}) {
  return (
    <div className="relative flex min-h-[172px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClass}`} />
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <DashboardLabelWithTooltip label={label} tooltip={tooltip} className="inline-flex items-center gap-1.5" />
        </div>
        <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      </div>
      {helper ? <div className="mt-2 text-xs text-slate-500">{helper}</div> : null}
      {comparison ? (
        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Variação</div>
              <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{comparison.percentageLabel}</div>
            </div>
            <div className="text-right">
              <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${comparison.className}`}>
                {comparison.label}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{comparison.detail}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SectionCard({ title, description, tooltip, children }: { title: string; description: string; tooltip?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-4">
        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          <DashboardLabelWithTooltip label={title} tooltip={tooltip} className="inline-flex items-center gap-1.5" />
        </h4>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </header>
      {children}
    </section>
  );
}

export default function GeneralPerformanceReport({
  summary,
  previousSummary,
  operators,
  dailySeries,
  isLoading,
}: GeneralPerformanceReportProps) {
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("chatsFinishedCount");

  const filteredOperators = useMemo(() => operators.filter((row) => row.userId > 0), [operators]);

  const sectorRows = useMemo<SectorOverviewRow[]>(() => {
    const map = new Map<string, SectorOverviewRow & { responseWeight: number; handlingWeight: number }>();

    for (const row of filteredOperators) {
      const sectorName = row.userSector || "Sem setor";
      const current = map.get(sectorName) || {
        sectorName,
        operatorsCount: 0,
        stableOperatorsCount: 0,
        attentionOperatorsCount: 0,
        criticalOperatorsCount: 0,
        messagesCount: 0,
        previousMessagesCount: 0,
        chatsFinishedCount: 0,
        previousChatsFinishedCount: 0,
        pendingReturnsCount: 0,
        previousPendingReturnsCount: 0,
        transfersCount: 0,
        averageFirstResponseSeconds: null,
        averageHandlingSeconds: null,
        responseWeight: 0,
        handlingWeight: 0,
      };

      current.operatorsCount += 1;
      current.messagesCount += row.messagesCount;
      current.previousMessagesCount += row.previousMessagesCount;
      current.chatsFinishedCount += row.chatsFinishedCount;
      current.previousChatsFinishedCount += row.previousChatsFinishedCount;
      current.pendingReturnsCount += row.pendingReturnsCount;
      current.previousPendingReturnsCount += row.previousPendingReturnsCount;
      current.transfersCount += row.transfersSentCount + row.transfersReceivedCount;

      const severity = getOperatorSeverity(row);
      if (severity === 2) current.criticalOperatorsCount += 1;
      else if (severity === 1) current.attentionOperatorsCount += 1;
      else current.stableOperatorsCount += 1;

      if (row.averageFirstResponseSeconds != null) {
        current.averageFirstResponseSeconds =
          (current.averageFirstResponseSeconds ?? 0) + row.averageFirstResponseSeconds * Math.max(row.respondedChatsCount, 1);
        current.responseWeight += Math.max(row.respondedChatsCount, 1);
      }

      if (row.averageHandlingSeconds != null) {
        current.averageHandlingSeconds =
          (current.averageHandlingSeconds ?? 0) + row.averageHandlingSeconds * Math.max(row.chatsFinishedCount, 1);
        current.handlingWeight += Math.max(row.chatsFinishedCount, 1);
      }

      map.set(sectorName, current);
    }

    return Array.from(map.values())
      .map((row) => ({
        sectorName: row.sectorName,
        operatorsCount: row.operatorsCount,
        stableOperatorsCount: row.stableOperatorsCount,
        attentionOperatorsCount: row.attentionOperatorsCount,
        criticalOperatorsCount: row.criticalOperatorsCount,
        messagesCount: row.messagesCount,
        previousMessagesCount: row.previousMessagesCount,
        chatsFinishedCount: row.chatsFinishedCount,
        previousChatsFinishedCount: row.previousChatsFinishedCount,
        pendingReturnsCount: row.pendingReturnsCount,
        previousPendingReturnsCount: row.previousPendingReturnsCount,
        transfersCount: row.transfersCount,
        averageFirstResponseSeconds: row.responseWeight
          ? (row.averageFirstResponseSeconds ?? 0) / row.responseWeight
          : null,
        averageHandlingSeconds: row.handlingWeight ? (row.averageHandlingSeconds ?? 0) / row.handlingWeight : null,
      }))
      .sort((left, right) => {
        if (right.criticalOperatorsCount !== left.criticalOperatorsCount) {
          return right.criticalOperatorsCount - left.criticalOperatorsCount;
        }
        if (right.pendingReturnsCount !== left.pendingReturnsCount) {
          return right.pendingReturnsCount - left.pendingReturnsCount;
        }
        return right.chatsFinishedCount - left.chatsFinishedCount;
      });
  }, [filteredOperators]);

  const topOperators = useMemo(
    () => [...filteredOperators].sort((left, right) => right.chatsFinishedCount - left.chatsFinishedCount).slice(0, 5),
    [filteredOperators],
  );

  const pressureOperators = useMemo(
    () =>
      [...filteredOperators]
        .sort((left, right) => {
          const leftSeverity = getOperatorSeverity(left);
          const rightSeverity = getOperatorSeverity(right);
          if (rightSeverity !== leftSeverity) return rightSeverity - leftSeverity;
          if (right.pendingReturnsCount !== left.pendingReturnsCount) return right.pendingReturnsCount - left.pendingReturnsCount;
          return (right.averageFirstResponseSeconds ?? 0) - (left.averageFirstResponseSeconds ?? 0);
        })
        .slice(0, 5),
    [filteredOperators],
  );

  const trendData = useMemo(() => {
    return dailySeries.map((row) => {
      if (trendMetric === "messagesCount") {
        return { label: row.label, current: row.messagesCount, previous: row.previousMessagesCount, currentDate: row.date, previousDate: row.previousDate };
      }
      if (trendMetric === "pendingReturnsCount") {
        return { label: row.label, current: row.pendingReturnsCount, previous: row.previousPendingReturnsCount, currentDate: row.date, previousDate: row.previousDate };
      }
      if (trendMetric === "transfersSentCount") {
        return { label: row.label, current: row.transfersSentCount, previous: row.previousTransfersSentCount, currentDate: row.date, previousDate: row.previousDate };
      }
      return { label: row.label, current: row.chatsFinishedCount, previous: row.previousChatsFinishedCount, currentDate: row.date, previousDate: row.previousDate };
    });
  }, [dailySeries, trendMetric]);

  const sectorChartData = useMemo(
    () => sectorRows.slice(0, 8).map((row) => ({ name: row.sectorName, finalizados: row.chatsFinishedCount, pendencias: row.pendingReturnsCount })),
    [sectorRows],
  );

  const mixData = useMemo(
    () => [
      { name: "Recebidas", value: summary?.receivedMessagesCount || 0, fill: CHART_COLORS.primary },
      { name: "Enviadas", value: summary?.sentMessagesCount || 0, fill: "#0891b2" },
      { name: "Transf. feitas", value: summary?.transfersSentCount || 0, fill: CHART_COLORS.attention },
      { name: "Transf. recebidas", value: summary?.transfersReceivedCount || 0, fill: CHART_COLORS.critical },
    ],
    [summary],
  );

  const exportRows = useMemo(
    () =>
      sectorRows.map((row) => ({
        setor: row.sectorName,
        operadoresAtivos: row.operatorsCount,
        operadoresEstaveis: row.stableOperatorsCount,
        operadoresAtencao: row.attentionOperatorsCount,
        operadoresCriticos: row.criticalOperatorsCount,
        mensagens: row.messagesCount,
        mensagensPeriodoAnterior: row.previousMessagesCount,
        finalizados: row.chatsFinishedCount,
        finalizadosPeriodoAnterior: row.previousChatsFinishedCount,
        pendencias: row.pendingReturnsCount,
        pendenciasPeriodoAnterior: row.previousPendingReturnsCount,
        transferencias: row.transfersCount,
        tempoMedioPrimeiraDevolutiva: formatDuration(row.averageFirstResponseSeconds),
        cicloMedioAtendimento: formatDuration(row.averageHandlingSeconds),
      })),
    [sectorRows],
  );

  const finalizadosComparison = getComparisonBadge(summary?.chatsFinishedCount, previousSummary?.chatsFinishedCount, "higher", formatNumber);
  const mensagensComparison = getComparisonBadge(summary?.messagesCount, previousSummary?.messagesCount, "higher", formatNumber);
  const primeiraDevolutivaComparison = getComparisonBadge(
    summary?.averageFirstResponseSeconds,
    previousSummary?.averageFirstResponseSeconds,
    "lower",
    formatDuration,
  );
  const cicloComparison = getComparisonBadge(summary?.averageHandlingSeconds, previousSummary?.averageHandlingSeconds, "lower", formatDuration);
  const pendenciasComparison = getComparisonBadge(summary?.pendingReturnsCount, previousSummary?.pendingReturnsCount, "lower", formatNumber);

  return (
    <section className="relative grid gap-6">
      {isLoading ? <DashboardLoadingIndicator mode="overlay" label="Consolidando setores, backlog e ritmo diário" /> : null}
      <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Performance Geral</h3>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Visão consolidada da operação com foco em produção, backlog, ritmo diário e concentração de risco por setor.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLoading ? <DashboardLoadingIndicator label="Atualizando visão consolidada" /> : null}
            <button
              type="button"
              onClick={() => exportToCsv("performance-geral.csv", exportRows)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Atual: {formatDateRange(summary)}
          </span>
          {previousSummary ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              Comparativo: {formatDateRange(previousSummary)}
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              Defina um período explícito para habilitar comparativo do relatório.
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Operadores ativos" value={summary?.operatorsCount || 0} helper="Com movimentação no período" tooltip="Quantidade de operadores com alguma movimentação contabilizada no período selecionado." accentClass="bg-slate-600" />
        <KpiCard label="Finalizados" value={summary?.chatsFinishedCount || 0} helper="Produção consolidada" tooltip="Quantidade total de chats encerrados no período em toda a operação." accentClass="bg-emerald-600" comparison={finalizadosComparison} />
        <KpiCard label="Mensagens" value={summary?.messagesCount || 0} helper="Carga total de interação" tooltip="Volume total de mensagens trocadas no período, somando recebidas e enviadas." accentClass="bg-blue-600" comparison={mensagensComparison} />
        <KpiCard
          label="1ª devolutiva"
          value={formatDuration(summary?.averageFirstResponseSeconds)}
          helper="Da 1ª mensagem do cliente à 1ª resposta da operação"
          tooltip="Tempo médio entre a primeira mensagem do cliente e a primeira resposta operacional no chat. Follow-ups triviais de cortesia, enviados até 1 hora após um fechamento anterior, são desconsiderados."
          accentClass="bg-cyan-600"
          comparison={primeiraDevolutivaComparison}
        />
        <KpiCard
          label="Ciclo do atendimento"
          value={formatDuration(summary?.averageHandlingSeconds)}
          helper="Tempo total entre abertura e finalização"
          tooltip="Tempo médio completo do atendimento, da abertura até o encerramento do chat."
          accentClass="bg-indigo-600"
          comparison={cicloComparison}
        />
        <KpiCard label="Pendências" value={summary?.pendingReturnsCount || 0} helper="Conversas aguardando retorno" tooltip="Conversas abertas cuja última interação foi do cliente e ainda aguardam resposta da operação. Follow-ups triviais de cortesia, enviados até 1 hora após um fechamento anterior, não entram como pendência." accentClass="bg-amber-500" comparison={pendenciasComparison} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <SectionCard
          title="Ritmo diário da operação"
          description="Acompanhamento da cadência do período atual versus o anterior, alinhado dia a dia no intervalo escolhido."
          tooltip="Mostra a evolução diária do indicador selecionado no período atual comparada ao intervalo anterior equivalente."
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {trendMetricOptions.map((option) => {
              const isActive = option.key === trendMetric;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTrendMetric(option.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="h-[340px]">
            {trendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatNumber(value), name === "current" ? "Atual" : "Anterior"]}
                    labelFormatter={(label, payload) => {
                      const point = payload?.[0]?.payload as { currentDate?: string; previousDate?: string } | undefined;
                      return point ? `${point.currentDate || label}${point.previousDate ? ` • ref. ${point.previousDate}` : ""}` : String(label);
                    }}
                  />
                  <Legend formatter={(value) => (value === "current" ? "Período atual" : "Período anterior")} />
                  <Line type="monotone" dataKey="current" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="previous" stroke={CHART_COLORS.previous} strokeWidth={2} strokeDasharray="6 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Selecione um período explícito para visualizar a série diária comparativa." />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Leitura por setor"
          description="Setores ordenados por concentração de risco e backlog, com finalizados e pendências no mesmo plano de leitura."
          tooltip="Compara setores pelo volume encerrado e pelo backlog pendente, destacando onde a operação está mais pressionada."
        >
          <div className="h-[340px]">
            {sectorChartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorChartData} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="finalizados" fill={CHART_COLORS.primary} name="Finalizados" radius={[0, 10, 10, 0]} />
                  <Bar dataKey="pendencias" fill={CHART_COLORS.attention} name="Pendências" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Composição operacional"
          description="Distribuição do volume entre entrada, saída e repasse para ler a pressão da operação no período."
          tooltip="Distribui o volume total entre mensagens recebidas, enviadas e transferências para indicar a composição da carga operacional."
        >
          <div className="h-[300px]">
            {mixData.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mixData} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number) => [formatNumber(value), "Volume"]} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {mixData.map((item) => (
                      <Cell key={item.name} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Destaques operacionais"
          description="Resumo rápido de quem mais produziu e de onde a coordenação deve olhar primeiro."
          tooltip="Combina produção e criticidade para destacar os operadores com maior entrega e os pontos que exigem atenção imediata."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40">
              <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <DashboardLabelWithTooltip label="Maior produção" tooltip="Operadores com maior número de atendimentos finalizados no período." className="inline-flex items-center gap-1.5" />
              </div>
              <div className="grid gap-2">
                {topOperators.length ? (
                  topOperators.map((row) => (
                    <div key={row.userId} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 dark:bg-slate-900">
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{row.userName}</div>
                        <div className="text-[11px] text-slate-500">{row.userSector || "Sem setor"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.chatsFinishedCount}</div>
                        <div className="text-[11px] text-slate-500">finalizados</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState />
                )}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40">
              <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <DashboardLabelWithTooltip label="Pontos de atenção" tooltip="Operadores priorizados por criticidade, backlog e lentidão de resposta." className="inline-flex items-center gap-1.5" />
              </div>
              <div className="grid gap-2">
                {pressureOperators.length ? (
                  pressureOperators.map((row) => {
                    const severity = getOperatorSeverity(row);
                    const severityClass = severity === 2
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                      : severity === 1
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

                    return (
                      <div key={row.userId} className="rounded-lg bg-white px-3 py-2 dark:bg-slate-900">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{row.userName}</div>
                            <div className="text-[11px] text-slate-500">{row.userSector || "Sem setor"}</div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${severityClass}`}>
                            {severity === 2 ? "Crítico" : severity === 1 ? "Atenção" : "Estável"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                          <span>Pend.: {row.pendingReturnsCount}</span>
                          <span>1ª dev.: {formatDuration(row.averageFirstResponseSeconds)}</span>
                          <span>Transf.: {row.transfersSentCount + row.transfersReceivedCount}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState />
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Tabela gerencial por setor"
        description="Visão analítica consolidada do desempenho por setor, já ordenada por criticidade e backlog."
        tooltip="Tabela consolidada para leitura gerencial por setor, cruzando equipe, produção, backlog e tempos médios."
      >
        {sectorRows.length ? (
          <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                <tr className="text-slate-500">
                  <th className="px-3 py-3">Setor</th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Ops" tooltip="Quantidade de operadores considerados naquele setor." />
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Estável" tooltip="Operadores sem sinais relevantes de risco operacional no período." />
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Atenção" tooltip="Operadores com sinais moderados de risco, como pendência ou tempo acima do esperado." />
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Crítico" tooltip="Operadores com maior severidade operacional no período analisado." />
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Finalizados" tooltip="Quantidade de chats encerrados pelo setor no período." />
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Delta" tooltip="Diferença de finalizados em relação ao período comparativo anterior." />
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Mensagens" tooltip="Total de mensagens ligadas ao setor no período." />
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Pendências" tooltip="Conversas do setor que seguem abertas aguardando resposta da operação. Follow-ups triviais de cortesia, enviados até 1 hora após um fechamento anterior, ficam fora dessa contagem." />
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Taxa pend." tooltip="Índice de pendências em relação ao volume finalizado do setor." />
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="1ª devolutiva" tooltip="Tempo médio até a primeira resposta operacional aos clientes do setor. Follow-ups triviais de cortesia, enviados até 1 hora após um fechamento anterior, não entram nesse cálculo." />
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Ciclo" tooltip="Tempo médio total do atendimento até a finalização." />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectorRows.map((row) => {
                  const pendingRate = row.pendingReturnsCount / Math.max(row.chatsFinishedCount, 1);
                  const deltaFinished = row.chatsFinishedCount - row.previousChatsFinishedCount;

                  return (
                    <tr key={row.sectorName} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">{row.sectorName}</td>
                      <td className="px-3 py-2.5">{row.operatorsCount}</td>
                      <td className="px-3 py-2.5 text-emerald-600 dark:text-emerald-400">{row.stableOperatorsCount}</td>
                      <td className="px-3 py-2.5 text-amber-600 dark:text-amber-400">{row.attentionOperatorsCount}</td>
                      <td className="px-3 py-2.5 text-rose-600 dark:text-rose-400">{row.criticalOperatorsCount}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{row.chatsFinishedCount}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            deltaFinished >= 0
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                          }`}
                        >
                          {deltaFinished > 0 ? "+" : ""}
                          {deltaFinished}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">{row.messagesCount}</td>
                      <td className="px-3 py-2.5 font-medium text-amber-600 dark:text-amber-400">{row.pendingReturnsCount}</td>
                      <td className="px-3 py-2.5">{formatPercentage(pendingRate)}</td>
                      <td className="px-3 py-2.5">{formatDuration(row.averageFirstResponseSeconds)}</td>
                      <td className="px-3 py-2.5">{formatDuration(row.averageHandlingSeconds)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </SectionCard>
    </section>
  );
}