"use client";

import { useParams } from "next/navigation";
import { MenuItem, TextField } from "@mui/material";
import { ReportResultChart, ReportResultTable } from "@/components/reports/ReportResults";
import mailingService, { type MailingTipo } from "@/lib/services/mailing-analysis.service";
import {
  PortfolioReport,
  portfolioParams,
  type PortfolioFilters,
} from "../_components/portfolio-report";

const types: Record<MailingTipo, string> = {
  AMBOS: "Ativo e receptivo",
  ATIVO: "Ativo",
  RECEPTIVO: "Receptivo",
};

async function load(token: string, signal: AbortSignal) {
  const { campaigns, operadores } = await mailingService.getFilters(token, signal);
  const portfolios = new Map(
    campaigns.flatMap((campaign) =>
      campaign.carteiras.map(
        (item) =>
          [
            item.codigo,
            { id: item.codigo, label: item.unidade + " · " + campaign.campanhaNome },
          ] as const,
      ),
    ),
  );
  return {
    campaigns,
    portfolios: Array.from(portfolios.values()),
    operators: operadores.map((item) => ({ id: item.CODIGO, label: item.NOME })),
  };
}

function params(filters: PortfolioFilters<MailingTipo>, catalog: Awaited<ReturnType<typeof load>>) {
  const base = portfolioParams(filters, catalog);
  const selected = new Set(base.carteiras);
  return {
    ...base,
    tipo: filters.mode,
    campanhaNames: catalog.campaigns
      .filter((campaign) => campaign.carteiras.some((item) => selected.has(item.codigo)))
      .map((campaign) => campaign.campanhaNome),
  };
}

const definition = {
  id: "analise-mailing",
  title: "Análise de Mailing",
  description: "Acompanhe a cobertura da base e o resultado dos contatos por carteira.",
  defaultMode: "AMBOS" as MailingTipo,
  load,
  run: (
    token: string,
    filters: PortfolioFilters<MailingTipo>,
    catalog: Awaited<ReturnType<typeof load>>,
    signal: AbortSignal,
  ) => mailingService.getReport(token, params(filters, catalog), signal),
  download: (
    token: string,
    filters: PortfolioFilters<MailingTipo>,
    catalog: Awaited<ReturnType<typeof load>>,
    format: "pdf" | "csv",
  ) => mailingService.exportReport(token, { ...params(filters, catalog), format }),
  fields: (mode: MailingTipo, onChange: (mode: MailingTipo) => void) => (
    <TextField
      select
      label="Tipo de atendimento"
      size="small"
      value={mode}
      onChange={(event) => onChange(event.target.value as MailingTipo)}
    >
      {Object.entries(types).map(([value, label]) => (
        <MenuItem key={value} value={value}>
          {label}
        </MenuItem>
      ))}
    </TextField>
  ),
  labels: (mode: MailingTipo) => [types[mode]],
  render: (
    data: Awaited<ReturnType<typeof mailingService.getReport>>,
    exportCsv: () => void,
    exportDisabled: boolean,
  ) => {
    const result = [
      ...data.ativo.map((row) => ({ ...row, tipo: "Ativo" })),
      ...data.receptivo.map((row) => ({ ...row, tipo: "Receptivo" })),
    ];
    const totals = new Map<string, number>();
    for (const row of data.timeline)
      totals.set(row.data, (totals.get(row.data) ?? 0) + row.quantidade);
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Clientes na base", data.summary.totalClientes],
              ["Ligações", data.summary.totalLigacoes],
              ["Contatos por telefone", data.summary.totalContatosLigacao],
              ["Contatos por WhatsApp", data.summary.totalContatosWhatsapp],
              ["Contatos no total", data.summary.totalContatosTotal],
              ["Nunca contatados", data.summary.totalClientesNuncaContatados],
              ["Clientes desativados", data.summary.totalClientesDesativados],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {(value ?? 0).toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
        </div>
        {data.timeline.length > 0 && (
          <ReportResultChart
            title="Contatos ao longo do período"
            metric="Contatos"
            initialType="line"
            points={Array.from(totals, ([label, total]) => ({
              label: label.slice(0, 10).split("-").reverse().join("/"),
              total,
            }))}
          />
        )}
        <ReportResultTable
          title="Resultados por tipo de atendimento"
          searchHint="Tipo ou resultado"
          onExport={exportCsv}
          exportDisabled={exportDisabled}
          columns={[
            { label: "Atendimento" },
            { label: "Resultado" },
            { label: "Quantidade", numeric: true },
          ]}
          rows={result.map((row, index) => ({
            key: index,
            search: row.tipo + " " + row.nome,
            cells: [row.tipo, row.nome, row.quantidade],
          }))}
        />
        {data.timeline.length > 0 && (
          <ReportResultTable
            title="Resultados por dia"
            searchHint="Data ou resultado"
            exportDisabled
            columns={[
              { label: "Dia" },
              { label: "Resultado" },
              { label: "Quantidade", numeric: true },
            ]}
            rows={data.timeline.map((row, index) => ({
              key: index,
              search: row.data + " " + row.resultado,
              cells: [
                row.data.slice(0, 10).split("-").reverse().join("/"),
                row.resultado,
                row.quantidade,
              ],
            }))}
          />
        )}
      </>
    );
  },
};

export default function MailingAnalysisPage() {
  const { instance } = useParams<{ instance: string }>();
  return <PortfolioReport instance={instance} definition={definition} />;
}
