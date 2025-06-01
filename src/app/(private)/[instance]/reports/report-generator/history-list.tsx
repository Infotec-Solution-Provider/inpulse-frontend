"use client";

import { useContext } from "react";
import { SqlReportsContext } from "./sql-reports-context";
import SqlReportHistoryListItem from "./history-list-item";

export default function SqlReportHistoryList() {
  const { history, loading } = useContext(SqlReportsContext);

  return (
    <aside className="bg-white p-4 border rounded-md shadow-md max-h-[600px] overflow-y-auto">
      <h2 className="mb-4 font-semibold text-lg text-gray-800">Execuções Recentes</h2>
      {loading && <p>Carregando histórico...</p>}
      {!loading && history?.length === 0 && <p>Nenhum relatório gerado ainda.</p>}
      <ul className="flex flex-col gap-2">
        {history?.map((report) => (
          <SqlReportHistoryListItem key={report.id} report={report} />
        ))}
      </ul>
    </aside>
  );
}
