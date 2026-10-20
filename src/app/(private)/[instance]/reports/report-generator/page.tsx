"use client";

import { CrmPage } from "@/lib/ui-system";
import SqlReportsProvider from "./sql-reports-context";
import SqlReportForm from "./form";
import SqlReportHistoryList from "./history-list";

export default function SqlReportsPage() {
  return (
    <SqlReportsProvider>
      <CrmPage
        title="Gerador de relatórios"
        description="Prepare a consulta e acompanhe o histórico dos relatórios."
        breadcrumbs={[{ label: "Relatórios" }, { label: "Gerador de relatórios" }]}
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <SqlReportForm />
          <SqlReportHistoryList />
        </div>
      </CrmPage>
    </SqlReportsProvider>
  );
}
