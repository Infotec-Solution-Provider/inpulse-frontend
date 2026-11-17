"use client";

import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { Alert, Button, MenuItem, TablePagination, TextField } from "@mui/material";
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
import {
  defaultReportPeriod,
  downloadReportCsv,
  validateReportPeriod,
  type ReportPeriod,
} from "@/lib/reports/filters";
import { normalizeReportSearch } from "@/lib/reports/catalog";
import { useReportExecution } from "@/lib/reports/use-report-execution";
import { ReportExecutionStatus, ReportFilterPanel, ReportPageShell } from "./ReportWorkflow";

interface OperatorMessages {
  userId: number;
  userName: string;
  messagesCount: number;
  sentMessagesCount: number;
  receivedMessagesCount: number;
}
const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL || "http://localhost:8005";
const COLORS = ["#6366f1", "#0891b2", "#d97706", "#059669", "#e11d48"];

export function MessagesPerOperatorReport({
  instance,
  token,
  scope,
}: {
  instance: string;
  token: string;
  scope: string;
}) {
  const [draft, setDraft] = useState(defaultReportPeriod);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [chartType, setChartType] = useState("bar");
  const execute = useCallback(
    async (period: ReportPeriod, signal: AbortSignal) => {
      const response = await axios.get<{ data: { messagesPerUser: OperatorMessages[] } }>(
        `${WHATSAPP_URL}/api/whatsapp/dashboard/messages-per-user`,
        {
          signal,
          headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` },
          params: { date: `${period.startDate}_${period.endDate}` },
        },
      );
      return response.data.data.messagesPerUser;
    },
    [token],
  );
  const execution = useReportExecution({ scope, execute, validate: validateReportPeriod });
  const dirty = Boolean(
    execution.applied &&
      (draft.startDate !== execution.applied.startDate ||
        draft.endDate !== execution.applied.endDate),
  );
  const rows = execution.result ?? [];
  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        normalizeReportSearch(`${row.userName} ${row.userId}`).includes(
          normalizeReportSearch(search),
        ),
      ),
    [rows, search],
  );
  const actualPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1));
  const labels = execution.applied
    ? [
        `${execution.applied.startDate.split("-").reverse().join("/")} a ${execution.applied.endDate.split("-").reverse().join("/")}`,
      ]
    : [];
  const chartRows = rows.slice(0, 20);
  return (
    <ReportPageShell
      instance={instance}
      category="Atendimento e WhatsApp"
      title="Mensagens por Operador"
      description="Consulte as mensagens enviadas e recebidas por operador no período selecionado."
    >
      <ReportFilterPanel
        period={draft}
        onPeriodChange={setDraft}
        onGenerate={() => {
          setPage(0);
          void execution.generate(draft);
        }}
        onClear={() => setDraft(defaultReportPeriod())}
        onRestore={execution.applied ? () => setDraft(execution.applied!) : undefined}
        dirty={dirty}
        loading={execution.loading}
      />
      <ReportExecutionStatus
        loading={execution.loading}
        error={execution.error}
        generatedAt={execution.generatedAt}
        hasResult={execution.result !== null}
        labels={labels}
      />
      {execution.result !== null && (
        <>
          {rows.length === 0 ? (
            <Alert severity="info">Nenhuma mensagem encontrada para o período selecionado.</Alert>
          ) : (
            <>
              <section
                className="grid min-w-0 gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                aria-label="Gráfico de mensagens"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-semibold">Distribuição por operador</h2>
                  <TextField
                    select
                    size="small"
                    label="Tipo de gráfico"
                    value={chartType}
                    onChange={(event) => setChartType(event.target.value)}
                    className="min-w-40"
                  >
                    <MenuItem value="bar">Barras</MenuItem>
                    <MenuItem value="line">Linha</MenuItem>
                    <MenuItem value="pie">Pizza</MenuItem>
                  </TextField>
                </div>
                <div className="h-80 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "pie" ? (
                      <PieChart>
                        <Pie
                          data={chartRows}
                          dataKey="messagesCount"
                          nameKey="userName"
                          outerRadius={100}
                        >
                          {chartRows.map((row, index) => (
                            <Cell key={row.userId} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    ) : chartType === "line" ? (
                      <LineChart data={chartRows}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="userName" hide />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line dataKey="sentMessagesCount" name="Enviadas" stroke="#0891b2" />
                        <Line dataKey="receivedMessagesCount" name="Recebidas" stroke="#6366f1" />
                      </LineChart>
                    ) : (
                      <BarChart data={chartRows}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="userName" hide />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="sentMessagesCount" name="Enviadas" fill="#0891b2" />
                        <Bar dataKey="receivedMessagesCount" name="Recebidas" fill="#6366f1" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-500">
                  Gráfico: até 20 operadores na ordem retornada pelo relatório. A tabela e o CSV
                  incluem todos os {rows.length} operadores retornados.
                </p>
              </section>
              <section
                className="grid min-w-0 gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                aria-label="Mensagens por operador"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TextField
                    size="small"
                    label="Pesquisar nos resultados"
                    placeholder="Nome ou código do operador"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(0);
                    }}
                  />
                  <Button
                    variant="outlined"
                    disabled={dirty || execution.loading || Boolean(execution.error)}
                    onClick={() =>
                      downloadReportCsv(
                        `mensagens-por-operador_${execution.applied!.startDate}_${execution.applied!.endDate}.csv`,
                        ["Código", "Operador", "Mensagens", "Enviadas", "Recebidas"],
                        rows.map((row) => [
                          row.userId,
                          row.userName,
                          row.messagesCount,
                          row.sentMessagesCount,
                          row.receivedMessagesCount,
                        ]),
                      )
                    }
                  >
                    Exportar CSV
                  </Button>
                </div>
                <p className="text-xs text-slate-500" role="status">
                  {filtered.length} de {rows.length} operadores no resultado. A pesquisa abrange
                  todos os registros carregados e não altera os totais do gráfico ou o CSV.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        {["Operador", "Mensagens", "Enviadas", "Recebidas"].map((header) => (
                          <th key={header} className="px-3 py-3">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered
                        .slice(actualPage * rowsPerPage, (actualPage + 1) * rowsPerPage)
                        .map((row) => (
                          <tr
                            key={row.userId}
                            className="border-b border-slate-100 dark:border-slate-800"
                          >
                            <td className="px-3 py-3">
                              {row.userName}{" "}
                              <span className="text-xs text-slate-500">#{row.userId}</span>
                            </td>
                            {[
                              row.messagesCount,
                              row.sentMessagesCount,
                              row.receivedMessagesCount,
                            ].map((value, index) => (
                              <td key={index} className="px-3 py-3 tabular-nums">
                                {value.toLocaleString("pt-BR")}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {!filtered.length && (
                  <p className="text-sm text-slate-500">Nenhum operador corresponde à pesquisa.</p>
                )}
                <TablePagination
                  component="div"
                  count={filtered.length}
                  page={actualPage}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[10, 25, 50]}
                  onPageChange={(_, next) => setPage(next)}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setPage(0);
                  }}
                  labelRowsPerPage="Por página"
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                  sx={{
                    ".MuiTablePagination-toolbar": {
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                      pl: 0,
                    },
                    ".MuiTablePagination-spacer": { display: "none" },
                  }}
                />
              </section>
            </>
          )}
        </>
      )}
    </ReportPageShell>
  );
}
