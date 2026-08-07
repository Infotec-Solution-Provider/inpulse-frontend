"use client";

import { AuthContext } from "@/app/auth-context";
import { getLeadOriginQuality, LeadOriginQualityResult } from "@/lib/services/marketing.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IconButton, Tooltip as MuiTooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableViewIcon from "@mui/icons-material/TableView";
import {
  ChartPanel,
  DateRangeToolbar,
  EmptyState,
  formatCurrency,
  formatCurrencyPrecise,
  formatNumber,
  formatPercent,
  getCurrentMonthRange,
  MetricCard,
  ReportShell,
  shortLabel,
} from "../_components/report-ui";

const METRIC_HELP = {
  leads: "Total de clientes cadastrados no CRM no período selecionado.",
  conversao:
    "Percentual de leads que efetuaram pelo menos uma compra (compradores ÷ leads).",
  faturamento: "Soma do valor de todas as compras realizadas no período.",
  bestOrigin:
    "Origem com maior receita por lead — equilíbrio entre volume de leads e conversão real em vendas.",
} as const;

const COLUMN_HELP: Record<string, string> = {
  Leads: "Quantidade de clientes cadastrados com esta origem no período.",
  Compradores: "Leads desta origem que realizaram ao menos uma compra.",
  Conversão: "Compradores ÷ Leads (em %).",
  Faturamento: "Receita total gerada pelos clientes desta origem.",
  "Ticket médio": "Faturamento ÷ número de compras desta origem.",
  "Receita por lead": "Faturamento ÷ quantidade de leads desta origem.",
  Qualidade:
    "Score relativo que combina conversão e receita por lead em relação às demais origens.",
};

function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const escape = (value: string | number | null | undefined) => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",;\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const csv = [headers.map(escape).join(";"), ...rows.map((row) => row.map(escape).join(";"))].join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPdfFromNode(node: HTMLElement | null, title: string) {
  if (!node) return;
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
  if (!printWindow) {
    toast.error("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.");
    return;
  }
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join("\n");
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${title}</title>
${styles}
<style>
  body { background: #fff !important; color: #0f172a !important; padding: 24px; }
  .no-print { display: none !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  @page { size: A4 landscape; margin: 12mm; }
</style>
</head>
<body>
<h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">${title}</h1>
${node.outerHTML}
</body>
</html>`);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 400);
}

function MetricLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <MuiTooltip title={help} arrow placement="top">
        <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.6, cursor: "help" }} />
      </MuiTooltip>
    </span>
  );
}

function ColumnHeader({ label, align = "right" }: { label: string; align?: "left" | "right" }) {
  const help = COLUMN_HELP[label];
  const alignClass = align === "right" ? "justify-end" : "justify-start";
  return (
    <span className={`inline-flex w-full items-center gap-1 ${alignClass}`}>
      {label}
      {help ? (
        <MuiTooltip title={help} arrow placement="top">
          <InfoOutlinedIcon sx={{ fontSize: 13, opacity: 0.55, cursor: "help" }} />
        </MuiTooltip>
      ) : null}
    </span>
  );
}

export default function LeadOriginQualityReport() {
  const { token } = useContext(AuthContext);
  const [dateRange, setDateRange] = useState(() => getCurrentMonthRange());
  const [data, setData] = useState<LeadOriginQualityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hiddenOrigins, setHiddenOrigins] = useState<Set<string>>(new Set());

  const loadReport = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const result = await getLeadOriginQuality(token, dateRange);
      setData(result);
      setHiddenOrigins(new Set());
    } catch (error) {
      toast.error(`Falha ao carregar origem dos leads.\n${sanitizeErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [dateRange, token]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const visibleOrigins = useMemo(
    () => (data?.origins || []).filter((row) => !hiddenOrigins.has(row.originName)),
    [data, hiddenOrigins],
  );

  const chartRows = useMemo(
    () =>
      visibleOrigins.slice(0, 10).map((row) => ({
        name: row.originName,
        leads: row.leadsCount,
        compradores: row.customersWithPurchases,
        conversao: row.conversionRate,
      })),
    [visibleOrigins],
  );

  const revenueRows = useMemo(
    () =>
      visibleOrigins.slice(0, 10).map((row) => ({
        name: row.originName,
        receita: row.revenue,
        receitaPorLead: row.revenuePerLead,
      })),
    [visibleOrigins],
  );

  const toggleOrigin = useCallback((origin: string) => {
    setHiddenOrigins((prev) => {
      const next = new Set(prev);
      if (next.has(origin)) next.delete(origin);
      else next.add(origin);
      return next;
    });
  }, []);

  const clearHidden = useCallback(() => setHiddenOrigins(new Set()), []);

  const handleExportCsv = useCallback(() => {
    if (!data?.origins.length) {
      toast.info("Nada para exportar.");
      return;
    }
    downloadCsv(
      `origem-x-qualidade_${dateRange.startDate}_${dateRange.endDate}.csv`,
      [
        "Origem",
        "Leads",
        "Compradores",
        "Conversão (%)",
        "Faturamento",
        "Ticket médio",
        "Receita por lead",
        "Qualidade",
        "Score qualidade",
      ],
      data.origins.map((row) => [
        row.originName,
        row.leadsCount,
        row.customersWithPurchases,
        (row.conversionRate ?? 0).toFixed(2).replace(".", ","),
        (row.revenue ?? 0).toFixed(2).replace(".", ","),
        (row.averageTicket ?? 0).toFixed(2).replace(".", ","),
        (row.revenuePerLead ?? 0).toFixed(2).replace(".", ","),
        row.qualityLabel,
        row.qualityScore,
      ]),
    );
  }, [data, dateRange]);

  const handleExportPdf = useCallback(() => {
    const node = document.getElementById("lead-origin-quality-report");
    exportPdfFromNode(node, `Origem x Qualidade — ${dateRange.startDate} a ${dateRange.endDate}`);
  }, [dateRange]);

  const exportActions = (
    <div className="no-print flex items-center gap-1">
      <MuiTooltip title="Exportar CSV" arrow>
        <span>
          <IconButton size="small" onClick={handleExportCsv} disabled={!data?.origins.length}>
            <TableViewIcon fontSize="small" />
          </IconButton>
        </span>
      </MuiTooltip>
      <MuiTooltip title="Exportar PDF (abre janela de impressão)" arrow>
        <span>
          <IconButton size="small" onClick={handleExportPdf} disabled={!data?.origins.length}>
            <PictureAsPdfIcon fontSize="small" />
          </IconButton>
        </span>
      </MuiTooltip>
    </div>
  );

  return (
    <ReportShell title="Origem x Qualidade" subtitle="Leads por origem, conversão comercial e faturamento real do CRM.">
      <DateRangeToolbar value={dateRange} onChange={setDateRange} onRefresh={loadReport} loading={loading}>
        {exportActions}
      </DateRangeToolbar>

      <div id="lead-origin-quality-report" className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={<MetricLabel label="Leads" help={METRIC_HELP.leads} />}
            value={formatNumber(data?.summary.totalLeads)}
            detail="clientes cadastrados"
            loading={loading && !data}
          />
          <MetricCard
            label={<MetricLabel label="Conversão" help={METRIC_HELP.conversao} />}
            value={formatPercent(data?.summary.conversionRate)}
            detail={`${formatNumber(data?.summary.totalCustomersWithPurchases)} com compra`}
            tone="green"
            loading={loading && !data}
          />
          <MetricCard
            label={<MetricLabel label="Faturamento" help={METRIC_HELP.faturamento} />}
            value={formatCurrency(data?.summary.totalRevenue)}
            detail={`${formatNumber(data?.summary.totalPurchases)} compras`}
            tone="blue"
            loading={loading && !data}
          />
          <MetricCard
            label={<MetricLabel label="Melhor origem" help={METRIC_HELP.bestOrigin} />}
            value={data?.summary.bestOrigin || "-"}
            detail={`Receita por lead ${formatCurrencyPrecise(data?.summary.revenuePerLead)}`}
            tone="amber"
            loading={loading && !data}
          />
        </section>

        {data?.origins.length ? (
          <section className="no-print flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Origens
            </span>
            <MuiTooltip title="Clique em uma origem para ocultá-la dos gráficos." arrow placement="top">
              <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.55, cursor: "help" }} />
            </MuiTooltip>
            {data.origins.map((row) => {
              const hidden = hiddenOrigins.has(row.originName);
              return (
                <button
                  key={`toggle-${row.originId ?? "none"}-${row.originName}`}
                  type="button"
                  onClick={() => toggleOrigin(row.originName)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    hidden
                      ? "border-slate-200 bg-slate-100 text-slate-400 line-through dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500"
                      : "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300"
                  }`}
                  title={hidden ? "Mostrar nos gráficos" : "Ocultar dos gráficos"}
                >
                  {row.originName}
                </button>
              );
            })}
            {hiddenOrigins.size > 0 ? (
              <button
                type="button"
                onClick={clearHidden}
                className="ml-auto rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Mostrar todas ({hiddenOrigins.size} ocultas)
              </button>
            ) : null}
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-2">
          <ChartPanel title="Conversão por origem">
            <div className="h-[340px]">
              {chartRows.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={78} tickFormatter={(value) => shortLabel(String(value), 14)} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value, name) => [name === "Conversão" ? formatPercent(Number(value)) : formatNumber(Number(value)), name]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="compradores" name="Compradores" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="conversao" name="Conversão" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </ChartPanel>

          <ChartPanel title="Receita por origem">
            <div className="h-[340px]">
              {revenueRows.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueRows} margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={78} tickFormatter={(value) => shortLabel(String(value), 14)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
                    <Legend />
                    <Bar dataKey="receita" name="Receita" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="receitaPorLead" name="Receita por lead" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </ChartPanel>
        </section>

        <ChartPanel title="Ranking por origem" action={exportActions}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                  <th className="px-3 py-3">Origem</th>
                  <th className="px-3 py-3 text-right"><ColumnHeader label="Leads" /></th>
                  <th className="px-3 py-3 text-right"><ColumnHeader label="Compradores" /></th>
                  <th className="px-3 py-3 text-right"><ColumnHeader label="Conversão" /></th>
                  <th className="px-3 py-3 text-right"><ColumnHeader label="Faturamento" /></th>
                  <th className="px-3 py-3 text-right"><ColumnHeader label="Ticket médio" /></th>
                  <th className="px-3 py-3 text-right"><ColumnHeader label="Receita por lead" /></th>
                  <th className="px-3 py-3 text-right"><ColumnHeader label="Qualidade" /></th>
                </tr>
              </thead>
              <tbody>
                {(data?.origins || []).map((row) => {
                  const hidden = hiddenOrigins.has(row.originName);
                  return (
                    <tr
                      key={`${row.originId ?? "none"}-${row.originName}`}
                      className={`border-b border-slate-100 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-950/40 ${
                        hidden ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">{row.originName}</td>
                      <td className="px-3 py-3 text-right">{formatNumber(row.leadsCount)}</td>
                      <td className="px-3 py-3 text-right">{formatNumber(row.customersWithPurchases)}</td>
                      <td className="px-3 py-3 text-right">{formatPercent(row.conversionRate)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(row.revenue)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrencyPrecise(row.averageTicket)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrencyPrecise(row.revenuePerLead)}</td>
                      <td className="px-3 py-3 text-right font-semibold">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {row.qualityLabel} ({formatNumber(row.qualityScore)})
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!data?.origins.length && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-slate-500">Sem origens no período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartPanel>
      </div>
    </ReportShell>
  );
}
