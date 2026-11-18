"use client";
import { ReportPageShell } from "@/components/reports/ReportWorkflow";

import { useParams } from "next/navigation";
import SqlReportsProvider from "./sql-reports-context";
import SqlReportForm from "./form";
import SqlReportHistoryList from "./history-list";

export default function SqlReportsPage() {
  const { instance } = useParams<{ instance: string }>();
  return (
    <SqlReportsProvider>
      <ReportPageShell
        instance={instance}
        category="Ferramentas avançadas"
        title="Consultas SQL"
        description="Prepare a consulta e acompanhe o histórico dos relatórios."
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <SqlReportForm />
          <SqlReportHistoryList />
        </div>
      </ReportPageShell>
    </SqlReportsProvider>
  );
}
