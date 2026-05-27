"use client";

import { AuthContext } from "@/app/auth-context";
import { getLostReasons, LostReasonsResult } from "@/lib/services/marketing.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { MenuItem, TextField } from "@mui/material";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartPanel, DateRangeToolbar, EmptyState, formatNumber, formatPercent, getCurrentMonthRange, MetricCard, ReportShell, formatShortDate, shortLabel } from "../_components/report-ui";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#06b6d4", "#8b5cf6", "#64748b"];

export default function LostReasonsPage() {
  const { token } = useContext(AuthContext);
  const [dateRange, setDateRange] = useState(() => getCurrentMonthRange());
  const [channel, setChannel] = useState("");
  const [data, setData] = useState<LostReasonsResult | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const result = await getLostReasons(token, { ...dateRange, ...(channel ? { channel } : {}) });
      setData(result);
    } catch (error) {
      toast.error(`Falha ao carregar motivos de perda.\n${sanitizeErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [channel, dateRange, token]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const reasonRows = useMemo(() => (data?.byReason || []).slice(0, 10), [data]);
  const operatorRows = useMemo(() => (data?.byOperator || []).slice(0, 10), [data]);

  return (
    <ReportShell title="Motivos de Perda" subtitle="Encerramentos sem avanço comercial classificados pelos resultados reais do CRM.">
      <DateRangeToolbar value={dateRange} onChange={setDateRange} onRefresh={loadReport} loading={loading}>
        <TextField select label="Canal" size="small" value={channel} onChange={(event) => setChannel(event.target.value)} className="w-44">
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
          <MenuItem value="TELEFONIA">Telefonia</MenuItem>
        </TextField>
      </DateRangeToolbar>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard loading={loading && !data} label="Atendimentos finalizados" value={formatNumber(data?.summary.totalFinishedAttendances)} />
        <MetricCard loading={loading && !data} label="Perdas" value={formatNumber(data?.summary.totalLosses)} detail={formatPercent(data?.summary.lossRate)} tone="red" />
        <MetricCard loading={loading && !data} label="Principal motivo" value={data?.summary.topReason || "-"} tone="amber" />
        <MetricCard loading={loading && !data} label="Operadores impactados" value={formatNumber(data?.summary.operatorsImpacted)} tone="blue" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <ChartPanel title="Ranking de motivos">
          <div className="h-[340px]">
            {reasonRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonRows} layout="vertical" margin={{ left: 42, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="resultName" type="category" tick={{ fontSize: 11 }} width={170} tickFormatter={(value) => shortLabel(String(value), 22)} />
                  <Tooltip formatter={(value, name) => [formatNumber(Number(value)), name]} />
                  <Legend />
                  <Bar dataKey="lossesCount" name="Perdas" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </ChartPanel>

        <ChartPanel title="Canal">
          <div className="h-[340px]">
            {data?.byChannel.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.byChannel} dataKey="lossesCount" nameKey="channel" outerRadius={110} label>
                    {data.byChannel.map((row, index) => <Cell key={row.channel} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [formatNumber(Number(value)), name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </ChartPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Tendência diária">
          <div className="h-[300px]">
            {data?.dailySeries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(value) => formatShortDate(String(value))} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => [formatNumber(Number(value)), name]} labelFormatter={(label) => formatShortDate(String(label))} />
                  <Line type="monotone" dataKey="lossesCount" name="Perdas" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </ChartPanel>

        <ChartPanel title="Operadores">
          <div className="h-[300px]">
            {operatorRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operatorRows} margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="operatorName" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} tickFormatter={(value) => shortLabel(String(value), 14)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => [formatNumber(Number(value)), name]} />
                  <Bar dataKey="lossesCount" name="Perdas" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </ChartPanel>
      </section>

      <ChartPanel title="Tabela de motivos">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950/40">
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                <th className="px-3 py-3">Motivo</th>
                <th className="px-3 py-3 text-right">Perdas</th>
                <th className="px-3 py-3 text-right">Participação</th>
              </tr>
            </thead>
            <tbody>
              {(data?.byReason || []).map((row) => (
                <tr key={`${row.resultId ?? "none"}-${row.resultName}`} className="border-b border-slate-100 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-950/40">
                  <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">{row.resultName}</td>
                  <td className="px-3 py-3 text-right">{formatNumber(row.lossesCount)}</td>
                  <td className="px-3 py-3 text-right">{formatPercent(row.share)}</td>
                </tr>
              ))}
              {!data?.byReason.length && (
                <tr>
                  <td colSpan={3} className="px-3 py-10 text-center text-slate-500">Sem perdas classificadas no período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartPanel>
    </ReportShell>
  );
}
