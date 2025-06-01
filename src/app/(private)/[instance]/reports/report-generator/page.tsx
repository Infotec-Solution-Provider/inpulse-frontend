"use client";

import SqlReportsProvider from "./sql-reports-context";
import SqlReportForm from "./form";
import SqlReportHistoryList from "./history-list";

export default function SqlReportsPage() {
  return (
    <SqlReportsProvider>
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-w-[90rem] mx-auto p-6">
        <SqlReportForm />
        <SqlReportHistoryList />
      </div>
    </SqlReportsProvider>
  );
}
