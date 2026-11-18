"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import { migratedDashboardPath } from "@/lib/reports/attendance-routes";
import dynamic from "next/dynamic";
import { AuthContext } from "@/app/auth-context";
import {
  DashboardContext,
  SatisfactionSurveyAnalyticalRow,
  SatisfactionSurveySyntheticRow,
} from "./dashboard-context";
import DashboardLoadingIndicator from "./dashboard-loading-indicator";
import SalesFunnelReport from "./sales-funnel-report";
import { MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GeneralPerformanceReport = dynamic(() => import("./general-performance-report"), {
  ssr: false,
});

const CHART_COLORS = ["#6366f1", "#06b6d4", "#f97316", "#10b981", "#f43f5e", "#a855f7"];

function EmptyState() {
  return <div className="text-sm text-slate-500">Sem dados para este relatório.</div>;
}

function SatisfactionSurveyAnalyticalTable({
  data,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  data: SatisfactionSurveyAnalyticalRow[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (!data.length) return <EmptyState />;
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="whitespace-nowrap px-2 py-2">Cliente</th>
              <th className="whitespace-nowrap px-2 py-2">Operador</th>
              <th className="whitespace-nowrap px-2 py-2">Contato</th>
              <th className="whitespace-nowrap px-2 py-2">Telefone</th>
              <th className="whitespace-nowrap px-2 py-2">Data</th>
              <th className="whitespace-nowrap px-2 py-2 text-center">Q1</th>
              <th className="whitespace-nowrap px-2 py-2 text-center">Q2</th>
              <th className="whitespace-nowrap px-2 py-2 text-center">Q3</th>
              <th className="whitespace-nowrap px-2 py-2 text-center">Q4</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row) => (
              <tr key={row.chatId} className="border-t border-slate-100 dark:border-slate-800">
                <td className="whitespace-nowrap px-2 py-1.5 font-medium text-slate-700 dark:text-slate-200">
                  {row.customerName || row.contactName || "-"}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  {row.operatorName || (row.operatorId ? `#${row.operatorId}` : "-")}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">{row.contactName || "-"}</td>
                <td className="whitespace-nowrap px-2 py-1.5">{row.contactPhone || "-"}</td>
                <td className="whitespace-nowrap px-2 py-1.5">{formatDate(row.finishedAt)}</td>
                <td className="px-2 py-1.5 text-center font-semibold">
                  {row.answers.q1?.rating ?? "-"}
                </td>
                <td className="px-2 py-1.5 text-center font-semibold">
                  {row.answers.q2?.rating ?? "-"}
                </td>
                <td className="px-2 py-1.5 text-center font-semibold">
                  {row.answers.q3?.rating ?? "-"}
                </td>
                <td className="px-2 py-1.5 text-center font-semibold">
                  {row.answers.q4?.rating ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{data.length} registro(s)</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Anterior
          </button>
          <span className="px-2 text-xs text-slate-600 dark:text-slate-400">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

function SatisfactionSurveySyntheticView({
  synthetic,
  chartType,
  onChartTypeChange,
}: {
  synthetic: SatisfactionSurveySyntheticRow[];
  chartType: "bar" | "pie" | "line";
  onChartTypeChange: (type: "bar" | "pie" | "line") => void;
}) {
  const DIST_COLORS = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
  ];

  const averageData = synthetic.map((row) => ({
    name: row.questionLabel,
    average: row.averageScore || 0,
    total: row.totalAnswers,
  }));

  const chartHeight = 320;

  return (
    <div className="grid gap-6">
      {/* Average per question */}
      <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800/40">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Nota Média por Pergunta
          </h4>
          <TextField
            select
            size="small"
            label="Gráfico"
            value={chartType}
            onChange={(e) => onChartTypeChange(e.target.value as "bar" | "pie" | "line")}
            className="min-w-[130px]"
          >
            <MenuItem value="bar">Barras</MenuItem>
            <MenuItem value="pie">Pizza</MenuItem>
            <MenuItem value="line">Linha</MenuItem>
          </TextField>
        </div>
        {averageData.length ? (
          <ResponsiveContainer width="100%" height={chartHeight}>
            {chartType === "pie" ? (
              <PieChart>
                <Pie data={averageData} dataKey="average" nameKey="name" outerRadius={90}>
                  {averageData.map((_, index) => (
                    <Cell key={`avg-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value.toFixed(2), "Média"]} />
              </PieChart>
            ) : chartType === "line" ? (
              <LineChart data={averageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="average" stroke="#6366f1" name="Média" />
              </LineChart>
            ) : (
              <BarChart data={averageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#6366f1" name="Média" />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Distribution per question */}
      <div className="grid gap-4 lg:grid-cols-2">
        {synthetic.map((row) => (
          <div key={row.questionKey} className="rounded-md bg-slate-50 p-4 dark:bg-slate-800/40">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {row.questionKey.toUpperCase()}: {row.questionLabel}
              </h4>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {row.totalAnswers} resposta(s)
              </span>
            </div>
            {row.distribution.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={row.distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="score"
                    tick={{ fontSize: 11 }}
                    label={{ value: "Nota", position: "insideBottom", offset: -2, fontSize: 10 }}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [value, "Respostas"]}
                    labelFormatter={(label) => `Nota ${label}`}
                  />
                  <Bar dataKey="count" name="Respostas">
                    {row.distribution.map((entry, idx) => (
                      <Cell key={`dist-${idx}`} fill={DIST_COLORS[Math.min(entry.score - 1, 9)]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">Sem dados</div>
            )}
            {row.averageScore != null && (
              <div className="mt-1 text-right text-xs text-slate-500">
                Média:{" "}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {row.averageScore.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardReports() {
  const router = useRouter();
  const {
    chartTypes,
    setChartType,
    selectedReport,
    setSelectedReport,
    loading,
    operatorPerformanceSummary,
    operatorPerformancePreviousSummary,
    operatorPerformance,
    operatorPerformanceDailySeries,
    satisfactionSurveyAnalytical,
    satisfactionSurveySynthetic,
    satisfactionViewMode,
    setSatisfactionViewMode,
    satisfactionPage,
    setSatisfactionPage,
    satisfactionPageSize,
    setSatisfactionPageSize,
  } = useContext(DashboardContext);

  const { instance } = useContext(AuthContext);
  const isExatronInstance = instance === "exatron";

  const exportToCsv = (filename: string, rows: Record<string, any>[]) => {
    if (!rows.length) {
      toast.info("Sem dados para exportar.");
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (value: unknown) => {
      const stringValue = value == null ? "" : String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    };
    const csv = [
      headers.join(";"),
      ...rows.map((row) => headers.map((h) => escape(row[h])).join(";")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <TextField
          select
          label="Relatório"
          size="small"
          value={selectedReport}
          onChange={(e) => {
            const path = migratedDashboardPath(e.target.value);
            if (path) {
              router.push(`/${instance}/reports/${path}`);
              return;
            }
            setSelectedReport(
              e.target.value as
                | "generalPerformance"
                | "operatorPerformance"
                | "salesFunnel"
                | "satisfactionSurvey",
            );
          }}
          className="min-w-[240px]"
        >
          <MenuItem value="generalPerformance">Performance Geral</MenuItem>
          <MenuItem value="salesFunnel">Funil de Vendas</MenuItem>
          <MenuItem value="messagesPerUser">Mensagens por Operador</MenuItem>
          <MenuItem value="messagesPerContact">Mensagens por Contato</MenuItem>
          <MenuItem value="messagesPerHourDay">Mensagens por Hora e Dia</MenuItem>
          <MenuItem value="contactsAwaitingReturn">Contatos aguardando retorno</MenuItem>
          {isExatronInstance && (
            <MenuItem value="satisfactionSurvey">Pesquisa de Satisfação (Exatron)</MenuItem>
          )}
        </TextField>
      </div>

      {loading ? <DashboardLoadingIndicator label="Atualizando dados do dashboard" /> : null}

      {selectedReport === "generalPerformance" && (
        <GeneralPerformanceReport
          summary={operatorPerformanceSummary}
          previousSummary={operatorPerformancePreviousSummary}
          operators={operatorPerformance}
          dailySeries={operatorPerformanceDailySeries}
          isLoading={loading}
        />
      )}

      {selectedReport === "salesFunnel" && <SalesFunnelReport />}

      {selectedReport === "satisfactionSurvey" && (
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Pesquisa de Satisfação (Exatron)
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {satisfactionViewMode === "analytical"
                  ? "Lista detalhada de cada pesquisa realizada."
                  : "Visão macro com gráficos por pergunta."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {loading ? (
                <DashboardLoadingIndicator label="Atualizando pesquisa de satisfação" />
              ) : null}
              {satisfactionViewMode === "analytical" && (
                <button
                  type="button"
                  onClick={() =>
                    exportToCsv(
                      "pesquisa-satisfacao-analitico.csv",
                      satisfactionSurveyAnalytical.map((row) => ({
                        chatId: row.chatId,
                        operadorId: row.operatorId,
                        operador: row.operatorName,
                        contato: row.contactName,
                        telefone: row.contactPhone,
                        clienteId: row.customerId,
                        cliente: row.customerName,
                        cnpj: row.customerCnpj,
                        inicio: row.startedAt,
                        fim: row.finishedAt,
                        q1: row.answers.q1?.rating,
                        q2: row.answers.q2?.rating,
                        q3: row.answers.q3?.rating,
                        q4: row.answers.q4?.rating,
                      })),
                    )
                  }
                  className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Exportar CSV
                </button>
              )}
            </div>
          </header>

          {/* Sub-selector: Analítico / Sintético */}
          <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setSatisfactionViewMode("analytical")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                satisfactionViewMode === "analytical"
                  ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Analítico
            </button>
            <button
              type="button"
              onClick={() => setSatisfactionViewMode("synthetic")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                satisfactionViewMode === "synthetic"
                  ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Sintético
            </button>
          </div>

          {/* Content based on view mode */}
          {satisfactionViewMode === "analytical" ? (
            <div className="rounded-md border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <SatisfactionSurveyAnalyticalTable
                data={satisfactionSurveyAnalytical}
                page={satisfactionPage}
                pageSize={satisfactionPageSize}
                onPageChange={setSatisfactionPage}
                onPageSizeChange={setSatisfactionPageSize}
              />
            </div>
          ) : (
            <SatisfactionSurveySyntheticView
              synthetic={satisfactionSurveySynthetic}
              chartType={chartTypes.satisfactionSurvey}
              onChartTypeChange={(type) => setChartType("satisfactionSurvey", type)}
            />
          )}
        </section>
      )}
    </div>
  );
}
