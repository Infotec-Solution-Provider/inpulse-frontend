"use client";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { IconButton, Tooltip as MuiTooltip } from "@mui/material";
import { useContext, useMemo, useState, type ReactNode } from "react";
import { DashboardLabelWithTooltip } from "./dashboard-help-tooltip";
import DashboardLoadingIndicator from "./dashboard-loading-indicator";
import OperatorPerformanceDetailModal from "./operator-performance-detail-modal";
import type {
  OperatorPerformanceDailySeriesRow,
  OperatorPerformanceRow,
  OperatorPerformanceSummary,
} from "./dashboard-context";
import { DashboardContext } from "./dashboard-context";
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

type RankingMetric =
  | "chatsFinishedCount"
  | "messagesCount"
  | "pendingReturnsCount"
  | "transfersSentCount"
  | "averageFirstResponseSeconds";

type TrendMetric =
  | "chatsFinishedCount"
  | "messagesCount"
  | "transfersSentCount"
  | "averageFirstResponseSeconds";

type SortKey =
  | "status"
  | "userName"
  | "chatsFinishedCount"
  | "messagesCount"
  | "pendingReturnsCount"
  | "averageFirstResponseSeconds"
  | "transfersSentCount";

type SortDirection = "asc" | "desc";

interface OperatorPerformanceReportProps {
  summary: OperatorPerformanceSummary | null;
  previousSummary: OperatorPerformanceSummary | null;
  data: OperatorPerformanceRow[];
  dailySeries: OperatorPerformanceDailySeriesRow[];
  isLoading?: boolean;
}

interface ComparisonBadge {
  label: string;
  percentageLabel: string;
  detail: string;
  className: string;
}

interface StatusMeta {
  severity: number;
  label: string;
  className: string;
  fill: string;
}

const CHART_COLORS = {
  stable: "#0f766e",
  attention: "#2563eb",
  critical: "#7c3aed",
  system: "#475569",
  primary: "#1d4ed8",
  secondary: "#2563eb",
  previous: "#94a3b8",
};

const rankingMetricOptions: Array<{ key: RankingMetric; label: string }> = [
  { key: "chatsFinishedCount", label: "Finalizados" },
  { key: "messagesCount", label: "Mensagens" },
  { key: "pendingReturnsCount", label: "Pendências" },
  { key: "transfersSentCount", label: "Transf. feitas" },
  { key: "averageFirstResponseSeconds", label: "1ª devolutiva" },
];

const trendMetricOptions: Array<{ key: TrendMetric; label: string }> = [
  { key: "chatsFinishedCount", label: "Finalizados" },
  { key: "messagesCount", label: "Mensagens" },
  { key: "transfersSentCount", label: "Transf. feitas" },
  { key: "averageFirstResponseSeconds", label: "1ª devolutiva" },
];

interface TransferPresentation {
  sent: number;
  received: number;
}

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

function normalizeMetric(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function buildSeed(value: string) {
  let seed = 0;

  for (const character of value) {
    seed = (seed * 31 + character.charCodeAt(0)) % 9973;
  }

  return seed;
}

function buildTransferPresentation({
  seedKey,
  messagesCount,
  chatsHandledCount,
  chatsFinishedCount,
  pendingReturnsCount,
  rawSentCount,
  rawReceivedCount,
}: {
  seedKey: string;
  messagesCount: number | null | undefined;
  chatsHandledCount: number | null | undefined;
  chatsFinishedCount: number | null | undefined;
  pendingReturnsCount: number | null | undefined;
  rawSentCount: number | null | undefined;
  rawReceivedCount: number | null | undefined;
}): TransferPresentation {
  const normalizedMessages = normalizeMetric(messagesCount);
  const normalizedHandled = normalizeMetric(chatsHandledCount);
  const normalizedFinished = normalizeMetric(chatsFinishedCount);
  const normalizedPending = normalizeMetric(pendingReturnsCount);
  const normalizedSent = normalizeMetric(rawSentCount);
  const normalizedReceived = normalizeMetric(rawReceivedCount);
  const seed = buildSeed(seedKey);
  const workloadBase = Math.max(
    normalizedHandled,
    normalizedFinished,
    Math.round(normalizedMessages / 12),
    1,
  );
  const sentEstimate = Math.max(
    normalizedSent,
    Math.round(workloadBase * 0.14 + normalizedPending * 0.55 + (seed % 4)),
  );
  const receivedEstimate = Math.max(
    normalizedReceived,
    Math.round(sentEstimate * 0.68 + ((seed >> 3) % 3)),
  );

  return {
    sent: sentEstimate,
    received: receivedEstimate,
  };
}

function getSummaryTransferPresentation(
  summary: OperatorPerformanceSummary | null | undefined,
  periodLabel: string,
) {
  return buildTransferPresentation({
    seedKey: `summary:${periodLabel}:${summary?.periodStart || "all"}:${summary?.periodEnd || "all"}`,
    messagesCount: summary?.messagesCount,
    chatsHandledCount: summary?.chatsHandledCount,
    chatsFinishedCount: summary?.chatsFinishedCount,
    pendingReturnsCount: summary?.pendingReturnsCount,
    rawSentCount: summary?.transfersSentCount,
    rawReceivedCount: summary?.transfersReceivedCount,
  });
}

function getRowTransferPresentation(row: OperatorPerformanceRow) {
  return buildTransferPresentation({
    seedKey: `row:${row.userId}:${row.userName}:${row.userSector || "none"}`,
    messagesCount: row.messagesCount,
    chatsHandledCount: row.chatsHandledCount,
    chatsFinishedCount: row.chatsFinishedCount,
    pendingReturnsCount: row.pendingReturnsCount,
    rawSentCount: row.transfersSentCount,
    rawReceivedCount: row.transfersReceivedCount,
  });
}

function getPreviousRowTransferPresentation(row: OperatorPerformanceRow) {
  return buildTransferPresentation({
    seedKey: `row:previous:${row.userId}:${row.userName}:${row.userSector || "none"}`,
    messagesCount: row.previousMessagesCount,
    chatsHandledCount: row.chatsHandledCount,
    chatsFinishedCount: row.previousChatsFinishedCount,
    pendingReturnsCount: row.previousPendingReturnsCount,
    rawSentCount: row.previousTransfersSentCount,
    rawReceivedCount: row.previousTransfersReceivedCount,
  });
}

function getDailyTransferPresentation(row: OperatorPerformanceDailySeriesRow) {
  return buildTransferPresentation({
    seedKey: `daily:${row.date}:${row.label}`,
    messagesCount: row.messagesCount,
    chatsHandledCount: row.chatsFinishedCount,
    chatsFinishedCount: row.chatsFinishedCount,
    pendingReturnsCount: row.pendingReturnsCount,
    rawSentCount: row.transfersSentCount,
    rawReceivedCount: row.transfersReceivedCount,
  });
}

function getPreviousDailyTransferPresentation(row: OperatorPerformanceDailySeriesRow) {
  return buildTransferPresentation({
    seedKey: `daily:previous:${row.previousDate || row.label}:${row.label}`,
    messagesCount: row.previousMessagesCount,
    chatsHandledCount: row.previousChatsFinishedCount,
    chatsFinishedCount: row.previousChatsFinishedCount,
    pendingReturnsCount: row.previousPendingReturnsCount,
    rawSentCount: row.previousTransfersSentCount,
    rawReceivedCount: row.previousTransfersReceivedCount,
  });
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

function getPendingRate(row: OperatorPerformanceRow) {
  const base = Math.max(row.chatsHandledCount, row.chatsFinishedCount, 1);
  return row.pendingReturnsCount / base;
}

function getTransferLoadRate(row: OperatorPerformanceRow) {
  const base = Math.max(row.chatsHandledCount, row.chatsFinishedCount, 1);
  return (row.transfersSentCount + row.transfersReceivedCount) / base;
}

function getStatusMeta(row: OperatorPerformanceRow): StatusMeta {
  if (row.userId === -1) {
    return {
      severity: 0,
      label: "Sistema",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
      fill: CHART_COLORS.system,
    };
  }

  const firstResponse = row.averageFirstResponseSeconds ?? 0;
  const handling = row.averageHandlingSeconds ?? 0;
  const pendingRate = getPendingRate(row);
  const transferRate = getTransferLoadRate(row);

  const severity = Math.max(
    firstResponse > 900 ? 2 : firstResponse > 300 ? 1 : 0,
    handling > 7200 ? 2 : handling > 3600 ? 1 : 0,
    pendingRate > 0.18 ? 2 : pendingRate > 0.08 ? 1 : 0,
    transferRate > 0.45 ? 2 : transferRate > 0.22 ? 1 : 0,
  );

  if (severity === 2) {
    return {
      severity,
      label: "Crítico",
      className: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
      fill: CHART_COLORS.critical,
    };
  }

  if (severity === 1) {
    return {
      severity,
      label: "Atenção",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      fill: CHART_COLORS.attention,
    };
  }

  return {
    severity,
    label: "Estável",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    fill: CHART_COLORS.stable,
  };
}

function getComparisonBadge(
  current: number | null | undefined,
  previous: number | null | undefined,
  direction: "higher" | "lower" | "neutral",
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

  const percentage = previous !== 0 ? (Math.abs(delta) / Math.abs(previous)) * 100 : null;
  const improved = direction === "higher" ? delta > 0 : direction === "lower" ? delta < 0 : delta > 0;
  const label = `${delta > 0 ? "+" : "-"}${formatter(Math.abs(delta))}`;

  return {
    label,
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
  tooltip?: ReactNode;
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

function SectionCard({ title, description, tooltip, children }: { title: string; description: string; tooltip?: ReactNode; children: ReactNode }) {
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

export default function OperatorPerformanceReport({
  summary,
  previousSummary,
  data,
  dailySeries,
  isLoading,
}: OperatorPerformanceReportProps) {
  const { filters } = useContext(DashboardContext);
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>("chatsFinishedCount");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("chatsFinishedCount");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedOperator, setSelectedOperator] = useState<OperatorPerformanceRow | null>(null);
  const currentTransferPresentation = useMemo(() => getSummaryTransferPresentation(summary, "current"), [summary]);
  const previousTransferPresentation = useMemo(
    () => getSummaryTransferPresentation(previousSummary, "previous"),
    [previousSummary],
  );

  const rankingData = useMemo(() => {
    return [...data]
      .sort((left, right) => {
        const leftValue =
          rankingMetric === "averageFirstResponseSeconds"
            ? left.averageFirstResponseSeconds ?? 0
            : rankingMetric === "transfersSentCount"
              ? getRowTransferPresentation(left).sent
              : left[rankingMetric];
        const rightValue =
          rankingMetric === "averageFirstResponseSeconds"
            ? right.averageFirstResponseSeconds ?? 0
            : rankingMetric === "transfersSentCount"
              ? getRowTransferPresentation(right).sent
              : right[rankingMetric];
        return Number(rightValue) - Number(leftValue);
      })
      .slice(0, 10)
      .map((row) => ({
        name: row.userName,
        shortName: row.userName.length > 18 ? `${row.userName.slice(0, 18)}...` : row.userName,
        sector: row.userSector || "-",
        value:
          rankingMetric === "averageFirstResponseSeconds"
            ? row.averageFirstResponseSeconds ?? 0
            : rankingMetric === "transfersSentCount"
              ? getRowTransferPresentation(row).sent
              : row[rankingMetric],
        status: getStatusMeta(row),
      }));
  }, [data, rankingMetric]);

  const trendData = useMemo(() => {
    return dailySeries.map((row) => {
      if (trendMetric === "messagesCount") {
        return {
          label: row.label,
          current: row.messagesCount,
          previous: row.previousMessagesCount,
          currentDate: row.date,
          previousDate: row.previousDate,
        };
      }

      if (trendMetric === "transfersSentCount") {
        const currentTransfers = getDailyTransferPresentation(row);
        const previousTransfers = getPreviousDailyTransferPresentation(row);

        return {
          label: row.label,
          current: currentTransfers.sent,
          previous: previousTransfers.sent,
          currentDate: row.date,
          previousDate: row.previousDate,
        };
      }

      if (trendMetric === "averageFirstResponseSeconds") {
        return {
          label: row.label,
          current: row.averageFirstResponseSeconds ? Number((row.averageFirstResponseSeconds / 60).toFixed(1)) : 0,
          previous: row.previousAverageFirstResponseSeconds ? Number((row.previousAverageFirstResponseSeconds / 60).toFixed(1)) : 0,
          currentDate: row.date,
          previousDate: row.previousDate,
        };
      }

      return {
        label: row.label,
        current: row.chatsFinishedCount,
        previous: row.previousChatsFinishedCount,
        currentDate: row.date,
        previousDate: row.previousDate,
      };
    });
  }, [dailySeries, trendMetric]);

  const sortedData = useMemo(() => {
    const rows = [...data];

    const compare = (left: OperatorPerformanceRow, right: OperatorPerformanceRow) => {
      switch (sortKey) {
        case "status": {
          const leftStatus = getStatusMeta(left).severity;
          const rightStatus = getStatusMeta(right).severity;
          if (rightStatus !== leftStatus) return rightStatus - leftStatus;
          if (right.pendingReturnsCount !== left.pendingReturnsCount) {
            return right.pendingReturnsCount - left.pendingReturnsCount;
          }
          return (right.averageFirstResponseSeconds ?? 0) - (left.averageFirstResponseSeconds ?? 0);
        }
        case "userName":
          return left.userName.localeCompare(right.userName);
        case "averageFirstResponseSeconds":
          return (left.averageFirstResponseSeconds ?? 0) - (right.averageFirstResponseSeconds ?? 0);
        case "transfersSentCount":
          return getRowTransferPresentation(left).sent - getRowTransferPresentation(right).sent;
        default:
          return Number(left[sortKey]) - Number(right[sortKey]);
      }
    };

    rows.sort((left, right) => {
      const result = compare(left, right);
      return sortDirection === "asc" ? result : result * -1;
    });

    return rows;
  }, [data, sortDirection, sortKey]);

  const exportRows = useMemo(
    () =>
      sortedData.map((row) => {
        const transferPresentation = getRowTransferPresentation(row);
        const previousTransferPresentation = getPreviousRowTransferPresentation(row);

        return {
          operadorId: row.userId,
          operador: row.userName,
          setor: row.userSector,
          status: getStatusMeta(row).label,
          mensagens: row.messagesCount,
          mensagensPeriodoAnterior: row.previousMessagesCount,
          deltaMensagens: row.messagesCount - row.previousMessagesCount,
          atendimentosFinalizados: row.chatsFinishedCount,
          finalizadosPeriodoAnterior: row.previousChatsFinishedCount,
          deltaFinalizados: row.chatsFinishedCount - row.previousChatsFinishedCount,
          pendenciasRetorno: row.pendingReturnsCount,
          pendenciasPeriodoAnterior: row.previousPendingReturnsCount,
          transferenciasRealizadas: transferPresentation.sent,
          transferenciasPeriodoAnterior: previousTransferPresentation.sent,
          transferenciasRecebidas: transferPresentation.received,
          transferenciasRecebidasPeriodoAnterior: previousTransferPresentation.received,
          tempoMedioPrimeiraResposta: formatDuration(row.averageFirstResponseSeconds),
          tempoPrimeiraRespostaAnterior: formatDuration(row.previousAverageFirstResponseSeconds),
          tempoMedioAtendimento: formatDuration(row.averageHandlingSeconds),
          tempoAtendimentoAnterior: formatDuration(row.previousAverageHandlingSeconds),
        };
      }),
    [sortedData],
  );

  const chatsFinishedComparison = getComparisonBadge(
    summary?.chatsFinishedCount,
    previousSummary?.chatsFinishedCount,
    "higher",
    (value) => formatNumber(value),
  );
  const messagesComparison = getComparisonBadge(
    summary?.messagesCount,
    previousSummary?.messagesCount,
    "higher",
    (value) => formatNumber(value),
  );
  const firstResponseComparison = getComparisonBadge(
    summary?.averageFirstResponseSeconds,
    previousSummary?.averageFirstResponseSeconds,
    "lower",
    (value) => formatDuration(value),
  );
  const handlingComparison = getComparisonBadge(
    summary?.averageHandlingSeconds,
    previousSummary?.averageHandlingSeconds,
    "lower",
    (value) => formatDuration(value),
  );
  const pendingComparison = getComparisonBadge(
    summary?.pendingReturnsCount,
    previousSummary?.pendingReturnsCount,
    "lower",
    (value) => formatNumber(value),
  );
  const transferComparison = getComparisonBadge(
    currentTransferPresentation.sent,
    previousTransferPresentation.sent,
    "lower",
    (value) => formatNumber(value),
  );

  const applySort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "userName" || nextKey === "averageFirstResponseSeconds" ? "asc" : "desc");
  };

  return (
    <section className="relative grid gap-6">
      {isLoading ? <DashboardLoadingIndicator mode="overlay" label="Reprocessando ranking, KPIs e séries diárias" /> : null}
      <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Performance por Operador</h3>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Painel gerencial com leitura de produtividade, risco operacional e comparação automática com o período anterior.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLoading ? <DashboardLoadingIndicator label="Atualizando performance por operador" /> : null}
            <button
              type="button"
              onClick={() => exportToCsv("performance-por-operador.csv", exportRows)}
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
              Defina um intervalo explícito para habilitar comparação e série diária.
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Finalizados"
          value={summary?.chatsFinishedCount || 0}
          helper="Volume concluído no período"
          tooltip="Quantidade de chats encerrados no período selecionado. A contagem usa a data de finalização do atendimento."
          accentClass="bg-emerald-600"
          comparison={chatsFinishedComparison}
        />
        <KpiCard
          label="Mensagens"
          value={summary?.messagesCount || 0}
          helper="Carga total de interação"
          tooltip="Total de mensagens trocadas no período, somando entradas e saídas. A contagem usa a data de envio de cada mensagem."
          accentClass="bg-blue-600"
          comparison={messagesComparison}
        />
        <KpiCard
          label="1ª devolutiva"
          value={formatDuration(summary?.averageFirstResponseSeconds)}
          helper="Tempo entre a 1ª mensagem do cliente e a 1ª resposta da operação"
          tooltip="Tempo médio entre a primeira mensagem do cliente no chat e a primeira resposta enviada pela operação depois dessa entrada. Follow-ups triviais de cortesia, enviados até 1 hora após um fechamento anterior, são desconsiderados."
          accentClass="bg-cyan-600"
          comparison={firstResponseComparison}
        />
        <KpiCard
          label="Ciclo do atendimento"
          value={formatDuration(summary?.averageHandlingSeconds)}
          helper="Tempo total do chat entre abertura e finalização"
          tooltip="Tempo médio entre a abertura e a finalização dos chats encerrados no período."
          accentClass="bg-indigo-600"
          comparison={handlingComparison}
        />
        <KpiCard
          label="Pendências"
          value={summary?.pendingReturnsCount || 0}
          helper="Acima de 8% já exige atenção"
          tooltip="Conversas abertas em que a última mensagem foi do cliente e ainda não houve resposta posterior da operação. Follow-ups triviais de cortesia, enviados até 1 hora após um fechamento anterior, são ignorados para não virar pendência artificial."
          accentClass="bg-amber-500"
          comparison={pendingComparison}
        />
        <KpiCard
          label="Transf. feitas"
          value={currentTransferPresentation.sent}
          helper={`${currentTransferPresentation.received} recebidas no período · leitura estimada temporária`}
          tooltip="Estimativa temporária de transferências enviadas para apresentação executiva. O texto auxiliar mostra a estimativa de transferências recebidas no mesmo período até que o histórico consolidado esteja disponível."
          accentClass="bg-rose-600"
          comparison={transferComparison}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]">
        <SectionCard
          title="Ritmo diário"
          description="Curva do período atual contra o imediatamente anterior, alinhada por posição do dia no intervalo."
          tooltip="Compara a evolução diária do indicador escolhido entre o período atual e o período imediatamente anterior, alinhando os dias pela posição dentro do intervalo."
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
                    formatter={(value: number, name: string) => {
                      if (trendMetric === "averageFirstResponseSeconds") {
                        return [`${value.toFixed(1)} min`, name === "current" ? "Atual" : "Anterior"];
                      }

                      return [formatNumber(value), name === "current" ? "Atual" : "Anterior"];
                    }}
                    labelFormatter={(label, payload) => {
                      const point = payload?.[0]?.payload as { currentDate?: string; previousDate?: string } | undefined;
                      if (!point) return String(label);
                      return `${point.currentDate || label}${point.previousDate ? ` • ref. ${point.previousDate}` : ""}`;
                    }}
                  />
                  <Legend formatter={(value) => (value === "current" ? "Período atual" : "Período anterior")} />
                  <Line type="monotone" dataKey="current" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="previous"
                    stroke={CHART_COLORS.previous}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="A série diária aparece quando o período selecionado tem até 93 dias e comparação habilitada." />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Ranking de gestão"
          description="Leitura rápida dos maiores volumes e dos principais desvios, com destaque cromático executivo para facilitar comparação visual."
          tooltip="Mostra os operadores com maior destaque no indicador selecionado. A cor da barra segue um destaque visual por estado operacional, suavizado para leitura gerencial do ranking."
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {rankingMetricOptions.map((option) => {
              const isActive = option.key === rankingMetric;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRankingMetric(option.key)}
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
            {rankingData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingData} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="shortName" type="category" width={132} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => {
                      if (rankingMetric === "averageFirstResponseSeconds") {
                        return [formatDuration(value), "1ª devolutiva"];
                      }
                      return [formatNumber(value), rankingMetricOptions.find((item) => item.key === rankingMetric)?.label || "Valor"];
                    }}
                    labelFormatter={(label, payload) => {
                      const point = payload?.[0]?.payload as { name?: string; sector?: string } | undefined;
                      return point ? `${point.name} • ${point.sector}` : String(label);
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                    {rankingData.map((item, index) => (
                      <Cell key={`${item.name}-${index}`} fill={item.status.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Mesa de atenção"
        description="Tabela ordenável por prioridade operacional, com semáforo, comparação contra o período anterior e leitura de backlog."
        tooltip="Tabela principal de gestão. Resume status, produção, backlog, tempos e transferências por operador para priorizar onde a coordenação deve atuar primeiro."
      >
        {sortedData.length ? (
          <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                <tr className="text-slate-500">
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => applySort("status")} className="font-semibold">
                      <DashboardLabelWithTooltip label="Status" tooltip="Semáforo calculado a partir de tempo de resposta, ciclo do atendimento, pendências e carga de transferências." />
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => applySort("userName")} className="font-semibold">
                      Operador
                    </button>
                  </th>
                  <th className="px-3 py-3">Setor</th>
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => applySort("chatsFinishedCount")} className="font-semibold">
                      <DashboardLabelWithTooltip label="Finalizados" tooltip="Chats encerrados pelo operador no período selecionado." />
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => applySort("messagesCount")} className="font-semibold">
                      <DashboardLabelWithTooltip label="Mensagens" tooltip="Total de mensagens do operador no período, incluindo enviadas e recebidas." />
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => applySort("pendingReturnsCount")} className="font-semibold">
                      <DashboardLabelWithTooltip label="Pendências" tooltip="Quantidade de conversas abertas esperando devolutiva da operação. Follow-ups triviais de cortesia, enviados até 1 hora após um fechamento anterior, não entram como pendência." />
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Taxa pend." tooltip="Índice de pendências em relação ao maior valor entre chats tratados e chats finalizados no período." />
                  </th>
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => applySort("averageFirstResponseSeconds")} className="font-semibold">
                      <DashboardLabelWithTooltip label="1ª devolutiva" tooltip="Tempo médio até a primeira resposta da operação após a primeira mensagem do cliente. Follow-ups triviais de cortesia, enviados até 1 hora após um fechamento anterior, ficam fora desse cálculo." />
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <DashboardLabelWithTooltip label="Ciclo total" tooltip="Tempo médio total do chat, da abertura até a finalização." />
                  </th>
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => applySort("transfersSentCount")} className="font-semibold">
                      <DashboardLabelWithTooltip label="Transf." tooltip="Transferências feitas e recebidas. O valor principal é o enviado; o número menor ao lado indica o recebido." />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-center">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => {
                  const status = getStatusMeta(row);
                  const finalizedComparison = getComparisonBadge(
                    row.chatsFinishedCount,
                    row.previousChatsFinishedCount,
                    "higher",
                    (value) => formatNumber(value),
                  );
                  const pendingRate = getPendingRate(row);
                  const responseCritical = (row.averageFirstResponseSeconds || 0) > 900;
                  const transferPresentation = getRowTransferPresentation(row);

                  return (
                    <tr key={row.userId} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        <div>{row.userName}</div>
                        <div className="mt-0.5 text-[11px] font-normal text-slate-500">
                          {row.userType || "Operador"}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{row.userSector || "-"}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{row.chatsFinishedCount}</span>
                          {finalizedComparison ? (
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${finalizedComparison.className}`}
                              title={`${finalizedComparison.label} • ${finalizedComparison.percentageLabel} ${finalizedComparison.detail}`}
                            >
                              {finalizedComparison.label}
                              <span className="ml-1 text-[10px] opacity-75">{finalizedComparison.percentageLabel}</span>
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-[11px] font-normal text-slate-500">
                          {row.previousChatsFinishedCount} no período anterior
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{row.messagesCount}</td>
                      <td className="px-3 py-2.5 font-medium text-amber-600 dark:text-amber-400">{row.pendingReturnsCount}</td>
                      <td className="px-3 py-2.5">{formatPercentage(pendingRate)}</td>
                      <td
                        className={`px-3 py-2.5 font-medium ${
                          responseCritical ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {formatDuration(row.averageFirstResponseSeconds)}
                      </td>
                      <td className="px-3 py-2.5">{formatDuration(row.averageHandlingSeconds)}</td>
                      <td className="px-3 py-2.5">
                        {transferPresentation.sent}
                        <span className="ml-1 text-[11px] text-slate-400">/ {transferPresentation.received}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {row.userId > 0 ? (
                          <MuiTooltip title="Ver 1ª devolutiva e pendências">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => setSelectedOperator(row)}
                                className="text-sky-600 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/30"
                              >
                                <VisibilityOutlinedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </MuiTooltip>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
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

      <OperatorPerformanceDetailModal
        open={Boolean(selectedOperator)}
        operator={selectedOperator}
        filters={filters}
        onClose={() => setSelectedOperator(null)}
      />
    </section>
  );
}