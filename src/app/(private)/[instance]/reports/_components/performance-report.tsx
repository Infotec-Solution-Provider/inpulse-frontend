"use client";

import axios from "axios";
import { useContext } from "react";
import { Alert } from "@mui/material";
import { AuthContext } from "@/app/auth-context";
import { ReportPageShell } from "@/components/reports/ReportWorkflow";
import { ReportFormControls, ReportQueryStatus } from "@/components/reports/ReportFormControls";
import {
  defaultOperatorReportFilters,
  operatorFiltersLabels,
  operatorFiltersParams,
  OperatorReportFields,
  type OperatorReportFilters,
} from "@/components/reports/OperatorReportFilters";
import { validateReportPeriod } from "@/lib/reports/filters";
import { useReportForm } from "@/lib/reports/use-report-form";
import type {
  OperatorPerformanceDailySeriesRow,
  OperatorPerformanceRow,
  OperatorPerformanceSummary,
} from "../dashboard/dashboard-context";
import GeneralPerformanceReport from "../dashboard/general-performance-report";
import OperatorPerformanceReport from "../dashboard/operator-performance-report";

interface PerformanceData {
  summary: OperatorPerformanceSummary | null;
  previousSummary: OperatorPerformanceSummary | null;
  operatorPerformance: OperatorPerformanceRow[];
  dailySeries: OperatorPerformanceDailySeriesRow[];
}

const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL || "http://localhost:8005";

export default function PerformanceReport({ individual = false }: { individual?: boolean }) {
  const { instance, token, user } = useContext(AuthContext);
  const scope = `${instance}:${user?.CODIGO ?? ""}:${individual ? "individual" : "general"}`;
  const form = useReportForm({
    scope,
    defaults: defaultOperatorReportFilters,
    validate: (filters: OperatorReportFilters) => validateReportPeriod(filters.period),
    execute: async (filters, signal) => {
      const response = await axios.get<{ data: PerformanceData }>(
        `${WHATSAPP_URL}/api/whatsapp/dashboard/operator-performance`,
        {
          headers: { authorization: `Bearer ${token}` },
          params: operatorFiltersParams(filters),
          signal,
        },
      );
      return response.data.data;
    },
  });

  const title = individual ? "Performance por Operador" : "Performance Geral";
  const description = individual
    ? "Compare produtividade, tempos de resposta e transferências por operador."
    : "Acompanhe os indicadores de atendimento da equipe e compare períodos.";
  const data = form.result;
  return (
    <ReportPageShell
      instance={instance}
      title={title}
      category="Atendimento e WhatsApp"
      description={description}
    >
      <ReportFormControls
        form={form}
        period={form.draft.period}
        disabled={!token}
        setPeriod={(period) => form.setDraft((current) => ({ ...current, period }))}
      >
        <OperatorReportFields
          filters={form.draft}
          onChange={form.setDraft}
          scope={scope}
          token={token ?? ""}
        />
      </ReportFormControls>
      <ReportQueryStatus query={form} labels={operatorFiltersLabels(form.applied)} />
      {data &&
        form.applied &&
        (data.operatorPerformance.length === 0 ? (
          <Alert severity="info">Nenhum desempenho encontrado para os filtros aplicados.</Alert>
        ) : individual ? (
          <OperatorPerformanceReport
            summary={data.summary}
            previousSummary={data.previousSummary}
            data={data.operatorPerformance}
            dailySeries={data.dailySeries}
            isLoading={form.loading}
            exportDisabled={form.locked}
            filters={{
              ...form.applied.period,
              sectors: operatorFiltersParams(form.applied).SETORES,
              operators: operatorFiltersParams(form.applied).OPERADORES,
            }}
          />
        ) : (
          <GeneralPerformanceReport
            summary={data.summary}
            previousSummary={data.previousSummary}
            operators={data.operatorPerformance}
            dailySeries={data.dailySeries}
            isLoading={form.loading}
            exportDisabled={form.locked}
          />
        ))}
    </ReportPageShell>
  );
}
