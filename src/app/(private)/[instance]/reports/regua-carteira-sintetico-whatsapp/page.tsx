"use client";

import { useParams } from "next/navigation";
import { MenuItem, TextField } from "@mui/material";
import { ReportResultTable } from "@/components/reports/ReportResults";
import reguaService, {
  type OperadorAtivoFiltro,
  type ReguaMode,
  type ReguaReportData,
  type ReguaReportParams,
} from "@/lib/services/regua-carteira-sintetico-whatsapp.service";
import {
  PortfolioReport,
  portfolioParams,
  type PortfolioFilters,
} from "../_components/portfolio-report";

const modes: Record<ReguaMode, string> = {
  SINTETICO: "Sintético por carteira",
  ANALITICO: "Analítico por operador",
};
const status: Record<OperadorAtivoFiltro, string> = {
  AMBOS: "Todos",
  SIM: "Ativos",
  NAO: "Inativos",
};
type Mode = Pick<ReguaReportParams, "modoRelatorio" | "operadorAtivo">;

async function load(token: string, signal: AbortSignal) {
  const { carteiras, operadores } = await reguaService.getFilters(token, signal);
  return {
    portfolios: carteiras.map((item) => ({
      id: item.CODIGO,
      label: item.NOME + (item.TIPO ? " · " + item.TIPO : ""),
    })),
    operators: operadores.map((item) => ({
      id: item.CODIGO,
      label: item.NOME + (item.ATIVO === "NAO" ? " · Inativo" : ""),
    })),
  };
}

function params(
  filters: PortfolioFilters<Mode>,
  catalog: Awaited<ReturnType<typeof load>>,
): ReguaReportParams {
  return { ...portfolioParams(filters, catalog), ...filters.mode };
}

const percent = (value: number) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";

function result(data: ReguaReportData, onExport: () => void, exportDisabled: boolean) {
  if (data.modoRelatorio === "ANALITICO") {
    const detailColumns = [
      "Base",
      "Ligações",
      "Contatos por telefone",
      "Conversas no WhatsApp",
      "Contatos no WhatsApp",
      "Contatos no total",
      "Sucessos",
    ];
    return (
      <>
        <ReportResultTable
          title="Totais por operador"
          searchHint="Nome do operador"
          onExport={onExport}
          exportDisabled={exportDisabled}
          columns={[
            { label: "Operador" },
            ...[...detailColumns, "Aproveitamento", "Conversão"].map((label) => ({
              label,
              numeric: true,
            })),
          ]}
          rows={data.rows.map(({ operador, totais }, index) => ({
            key: index,
            search: operador,
            cells: [
              operador,
              totais.quantidadeBase,
              totais.discadas,
              totais.contatosTelefonia,
              totais.conversasWhatsapp,
              totais.contatosWhatsapp,
              totais.contatosTotal,
              totais.sucessos,
              percent(totais.aproveitamento),
              percent(totais.conversao),
            ],
          }))}
        />
        <ReportResultTable
          title="Detalhamento por tipo de carteira"
          searchHint="Operador ou tipo de carteira"
          exportDisabled
          columns={[
            { label: "Operador" },
            { label: "Tipo" },
            ...detailColumns.map((label) => ({ label, numeric: true })),
          ]}
          rows={data.rows.flatMap(({ operador, tipoMetrics }, index) =>
            data.tipos.flatMap((tipo) => {
              const item = tipoMetrics[tipo];
              return item
                ? [
                    {
                      key: index + ":" + tipo,
                      search: operador + " " + tipo,
                      cells: [
                        operador,
                        tipo,
                        item.quantidadeBase,
                        item.discadas,
                        item.contatosTelefonia,
                        item.conversasWhatsapp,
                        item.contatosWhatsapp,
                        item.contatosTotal,
                        item.sucessos,
                      ],
                    },
                  ]
                : [];
            }),
          )}
        />
      </>
    );
  }
  return (
    <ReportResultTable
      title="Resultados por carteira"
      searchHint="Tipo de carteira"
      onExport={onExport}
      exportDisabled={exportDisabled}
      columns={[
        { label: "Tipo" },
        ...[
          "Base",
          "Clientes trabalhados",
          "Ligações",
          "Contatos por telefone",
          "Conversas no WhatsApp",
          "Contatos no WhatsApp",
          "Contatos no total",
          "Aproveitamento",
          "Sucessos",
          "Conversão",
          "Clientes contatados",
        ].map((label) => ({ label, numeric: true })),
      ]}
      rows={data.rows.map((row, index) => ({
        key: index,
        search: row.tipo,
        cells: [
          row.tipo,
          row.quantidadeBase,
          row.clientesTrabalhados,
          row.ligacoes,
          row.contatosTelefonia,
          row.conversasWhatsapp,
          row.contatosWhatsapp,
          row.contatosTotal,
          percent(row.aproveitamento),
          row.sucessos,
          percent(row.conversao),
          row.clientesContato,
        ],
      }))}
    />
  );
}

const definition = {
  id: "regua-carteira",
  title: "Régua por Carteira",
  description: "Acompanhe contatos e conversão por carteira ou analise o desempenho por operador.",
  defaultMode: { modoRelatorio: "SINTETICO", operadorAtivo: "AMBOS" } satisfies Mode,
  load,
  run: (
    token: string,
    filters: PortfolioFilters<Mode>,
    catalog: Awaited<ReturnType<typeof load>>,
    signal: AbortSignal,
  ) => reguaService.getReport(token, params(filters, catalog), signal),
  download: (
    token: string,
    filters: PortfolioFilters<Mode>,
    catalog: Awaited<ReturnType<typeof load>>,
    format: "csv" | "pdf",
  ) => reguaService.exportReport(token, params(filters, catalog), format),
  fields: (mode: Mode, onChange: (mode: Mode) => void) => (
    <>
      <TextField
        select
        label="Visão do relatório"
        size="small"
        value={mode.modoRelatorio}
        onChange={(event) => onChange({ ...mode, modoRelatorio: event.target.value as ReguaMode })}
      >
        {Object.entries(modes).map(([value, label]) => (
          <MenuItem key={value} value={value}>
            {label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Situação do operador"
        size="small"
        value={mode.operadorAtivo}
        onChange={(event) =>
          onChange({ ...mode, operadorAtivo: event.target.value as OperadorAtivoFiltro })
        }
      >
        {Object.entries(status).map(([value, label]) => (
          <MenuItem key={value} value={value}>
            {label}
          </MenuItem>
        ))}
      </TextField>
    </>
  ),
  labels: (mode: Mode) => [modes[mode.modoRelatorio], "Situação: " + status[mode.operadorAtivo]],
  render: result,
};

export default function ReguaCarteiraPage() {
  const { instance } = useParams<{ instance: string }>();
  return <PortfolioReport instance={instance} definition={definition} />;
}
