"use client";

import { useContext } from "react";
import { Alert } from "@mui/material";
import { AuthContext } from "@/app/auth-context";
import { ReportExecutionStatus, ReportPageShell } from "@/components/reports/ReportWorkflow";
import FinancialFilters from "./financial-filters";
import { useFinancialContext } from "./financial-context";
import SummaryCards from "./summary-cards";
import ByPeriodChart from "./by-period-chart";
import BreakdownCharts from "./breakdown-charts";
import ByOperatorTable from "./by-operator-table";
import GoalsModal from "./goals-modal";
import OperatorCharts from "./operator-charts";
import CrmPurchasesReportLink from "@/lib/components/crm-purchases-report-link";

export default function FinancialReport() {
  const { instance } = useContext(AuthContext);
  const { data, isLoading, error, generatedAt, appliedFilters, dirty } = useFinancialContext();
  const labels = appliedFilters
    ? [
        `${appliedFilters.startDate.split("-").reverse().join("/")} a ${appliedFilters.endDate.split("-").reverse().join("/")}`,
        appliedFilters.operadorId !== undefined
          ? `${appliedFilters.operadorNome ?? "Operador"} #${appliedFilters.operadorId}`
          : "Todos os operadores permitidos",
        appliedFilters.situacao === "F"
          ? "Faturado"
          : appliedFilters.situacao === "C"
            ? "Cancelado"
            : "Todas as situações",
        appliedFilters.groupBy === "month" ? "Agrupado por mês" : "Agrupado por dia",
      ]
    : [];
  return (
    <ReportPageShell
      instance={instance}
      category="Comercial"
      title="Vendas"
      description="Analise vendas, faturamento e metas do CRM, com comparação ao intervalo anterior de mesma duração."
    >
      <CrmPurchasesReportLink />
      <FinancialFilters />
      <ReportExecutionStatus
        loading={isLoading}
        error={error}
        generatedAt={generatedAt}
        hasResult={data !== null}
        labels={labels}
      />
      {data && (
        <>
          {data.summary.totalCompras === 0 && (
            <Alert severity="info">Nenhuma venda encontrada para os filtros aplicados.</Alert>
          )}
          <fieldset
            disabled={dirty || isLoading || Boolean(error)}
            className="m-0 grid min-w-0 gap-6 border-0 p-0"
            aria-label="Resultado de vendas"
          >
            <SummaryCards />
            <ByPeriodChart />
            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
              <BreakdownCharts />
            </div>
            <OperatorCharts />
            <ByOperatorTable />
          </fieldset>
        </>
      )}
      <GoalsModal />
    </ReportPageShell>
  );
}
