"use client";

import { useContext } from "react";
import { SqlReportsContext } from "./sql-reports-context";
import SqlReportHistoryListItem from "./history-list-item";

export default function SqlReportHistoryList() {
  const { history, loading } = useContext(SqlReportsContext);

  return (
    <aside className="scrollbar-whatsapp max-h-[600px] rounded-md border bg-[var(--ip-surface)] p-4 shadow-none">
      <h2 className="mb-4 text-lg font-semibold text-[var(--ip-text)]">Execuções Recentes</h2>
      {loading && <p>Carregando histórico...</p>}
      {!loading && history?.length === 0 && <p>Nenhum relatório gerado ainda.</p>}
      <ul className="flex flex-col gap-2">
        {history?.map((report) => <SqlReportHistoryListItem key={report.id} report={report} />)}
      </ul>
    </aside>
  );
}
