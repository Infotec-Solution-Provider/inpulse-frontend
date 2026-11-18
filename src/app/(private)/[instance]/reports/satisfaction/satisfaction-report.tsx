"use client";

import axios from "axios";
import { useContext, useState } from "react";
import { Alert, Tab, Tabs } from "@mui/material";
import { AuthContext } from "@/app/auth-context";
import { ReportPageShell } from "@/components/reports/ReportWorkflow";
import { ReportFormControls, ReportQueryStatus } from "@/components/reports/ReportFormControls";
import { ReportResultTable, type ReportChartType } from "@/components/reports/ReportResults";
import {
  defaultOperatorReportFilters,
  operatorFiltersLabels,
  OperatorReportFields,
  type OperatorReportFilters,
} from "@/components/reports/OperatorReportFilters";
import { downloadReportCsv, validateReportPeriod } from "@/lib/reports/filters";
import { useReportForm } from "@/lib/reports/use-report-form";
import type {
  SatisfactionSurveyAnalyticalRow,
  SatisfactionSurveySyntheticRow,
} from "../dashboard/dashboard-context";
import { SatisfactionSurveySyntheticView } from "./satisfaction-charts";

const REPORTS_URL = process.env.NEXT_PUBLIC_REPORTS_URL || "http://localhost:8006";
const questions = ["q1", "q2", "q3", "q4"] as const;
const columns = [
  ...["Cliente", "Operador", "Contato", "Telefone", "Data"].map((label) => ({ label })),
  ...questions.map((question) => ({ label: question.toUpperCase(), numeric: true })),
];
const csvHeaders = [
  "chatId",
  "operadorId",
  "operador",
  "contato",
  "telefone",
  "clienteId",
  "cliente",
  "cnpj",
  "inicio",
  "fim",
  ...questions,
];

function ratings(row: SatisfactionSurveyAnalyticalRow) {
  return questions.map((question) => row.answers?.[question]?.rating ?? null);
}

export default function SatisfactionReport() {
  const { instance, token, user } = useContext(AuthContext);
  const scope = `${instance}:${user?.CODIGO ?? ""}:satisfaction`;
  const [view, setView] = useState<"analytical" | "synthetic">("analytical");
  const [chartType, setChartType] = useState<ReportChartType>("bar");
  const form = useReportForm({
    scope,
    defaults: defaultOperatorReportFilters,
    validate: (filters: OperatorReportFilters) => validateReportPeriod(filters.period),
    execute: async (filters, signal) => {
      const operators = filters.operators.map((operator) => operator.id).join(",");
      const response = await axios.get<{
        data: {
          analytical: SatisfactionSurveyAnalyticalRow[];
          synthetic: SatisfactionSurveySyntheticRow[];
        };
      }>(`${REPORTS_URL}/api/reports/satisfaction-survey`, {
        headers: { authorization: `Bearer ${token}` },
        signal,
        params: { ...filters.period, ...(operators ? { operators } : {}) },
      });
      return response.data.data;
    },
  });

  const data = form.result;
  return (
    <ReportPageShell
      instance={instance}
      category="Qualidade"
      title="Pesquisa de Satisfação"
      description="Consulte as respostas dos clientes e acompanhe a distribuição das notas por pergunta."
    >
      <ReportFormControls
        form={form}
        period={form.draft.period}
        disabled={!token}
        setPeriod={(period) => form.setDraft((current) => ({ ...current, period }))}
      >
        <OperatorReportFields
          scope={scope}
          token={token ?? ""}
          filters={form.draft}
          onChange={form.setDraft}
          showSectors={false}
        />
      </ReportFormControls>
      <ReportQueryStatus query={form} labels={operatorFiltersLabels(form.applied, false)} />
      {data && (
        <div className="grid min-w-0 gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <Tabs
            value={view}
            onChange={(_, next) => setView(next)}
            aria-label="Visualização da pesquisa"
          >
            <Tab value="analytical" label="Respostas" />
            <Tab value="synthetic" label="Resumo por pergunta" />
          </Tabs>
          {view === "synthetic" ? (
            <SatisfactionSurveySyntheticView
              synthetic={data.synthetic}
              chartType={chartType}
              onChartTypeChange={setChartType}
            />
          ) : data.analytical.length === 0 ? (
            <Alert severity="info">Nenhuma resposta para os filtros aplicados.</Alert>
          ) : (
            <ReportResultTable
              columns={columns}
              exportDisabled={form.locked}
              searchHint="Cliente, contato, telefone ou operador"
              rows={data.analytical.map((row) => ({
                key: row.chatId,
                cells: [
                  row.customerName || row.contactName,
                  row.operatorName ?? row.operatorId,
                  row.contactName,
                  row.contactPhone,
                  row.finishedAt ? new Date(row.finishedAt).toLocaleString("pt-BR") : null,
                  ...ratings(row),
                ],
                search: [
                  row.customerName,
                  row.contactName,
                  row.contactPhone,
                  row.operatorName,
                  row.operatorId,
                  row.customerCnpj,
                ].join(" "),
              }))}
              onExport={() =>
                downloadReportCsv(
                  "pesquisa-satisfacao-analitico.csv",
                  csvHeaders,
                  data.analytical.map((row) => [
                    row.chatId,
                    row.operatorId,
                    row.operatorName,
                    row.contactName,
                    row.contactPhone,
                    row.customerId,
                    row.customerName,
                    row.customerCnpj,
                    row.startedAt,
                    row.finishedAt,
                    ...ratings(row),
                  ]),
                )
              }
            />
          )}
        </div>
      )}
    </ReportPageShell>
  );
}
