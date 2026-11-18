"use client";

import { useContext, useState } from "react";
import TextField from "@mui/material/TextField";
import { normalizeReportSearch } from "@/lib/reports/catalog";
import { SqlReportsContext } from "./sql-reports-context";
import SqlReportHistoryListItem from "./history-list-item";

export default function SqlReportHistoryList() {
  const { history, loading } = useContext(SqlReportsContext);

  const [search, setSearch] = useState("");
  const visible = history.filter((report) =>
    normalizeReportSearch(report.description).includes(normalizeReportSearch(search)),
  );
  return (
    <aside className="scrollbar-whatsapp max-h-[600px] rounded-md border bg-[var(--ip-surface)] p-4 shadow-none">
      <h2 className="mb-4 text-lg font-semibold text-[var(--ip-text)]">Execuções recentes</h2>
      <TextField
        size="small"
        fullWidth
        label="Pesquisar histórico"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ mb: 2 }}
      />
      {loading && <p>Carregando histórico...</p>}
      {!loading && visible.length === 0 && (
        <p>
          {history.length
            ? "Nenhuma consulta corresponde à pesquisa."
            : "Nenhuma consulta no histórico."}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {visible.map((report) => (
          <SqlReportHistoryListItem key={report.id} report={report} />
        ))}
      </ul>
    </aside>
  );
}
