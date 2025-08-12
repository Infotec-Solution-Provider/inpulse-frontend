"use client";

import SqlReportsProvider from "./sql-reports-context";
import SqlReportForm from "./form";
import SqlReportHistoryList from "./history-list";

export default function SqlReportsPage() {
  return (
    <SqlReportsProvider>
      <div className="flex flex-col gap-6 max-w-[90rem] mx-auto p-4 md:p-6">
        <div className="md:grid md:grid-cols-[2fr_1fr] gap-6 w-full">
          <div className="md:order-1">
            <SqlReportForm />
          </div>
          <div className="hidden md:block order-2">
            <SqlReportHistoryList />
          </div>
        </div>
        <div className="md:hidden w-full">
          <SqlReportHistoryList />
        </div>
      </div>
    </SqlReportsProvider>
  );
}
