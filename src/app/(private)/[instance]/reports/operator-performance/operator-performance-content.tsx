"use client";

import { useContext, useEffect } from "react";
import dynamic from "next/dynamic";
import { DashboardContext } from "../dashboard/dashboard-context";
import DashboardFilters from "../dashboard/dashboard-filters";
import DashboardLoadingIndicator from "../dashboard/dashboard-loading-indicator";

const OperatorPerformanceReport = dynamic(
  () => import("../dashboard/operator-performance-report"),
  { ssr: false },
);

export default function OperatorPerformanceContent() {
  const {
    loadReport,
    loading,
    operatorPerformanceSummary,
    operatorPerformancePreviousSummary,
    operatorPerformance,
    operatorPerformanceDailySeries,
  } = useContext(DashboardContext);

  useEffect(() => {
    loadReport("operatorPerformance");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto grid w-[min(96vw,1800px)] min-w-[1280px] gap-6">
      <div>
        <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-white">
          Performance por Operador
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Análise de desempenho individual dos operadores com comparativo de períodos
        </p>
      </div>

      <DashboardFilters />

      {loading ? <DashboardLoadingIndicator label="Carregando dados de performance" /> : null}

      <OperatorPerformanceReport
        summary={operatorPerformanceSummary}
        previousSummary={operatorPerformancePreviousSummary}
        data={operatorPerformance}
        dailySeries={operatorPerformanceDailySeries}
        isLoading={loading}
      />
    </div>
  );
}
