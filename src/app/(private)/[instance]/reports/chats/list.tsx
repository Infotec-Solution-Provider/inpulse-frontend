"use client";

import { useContext, useState } from "react";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import { Download, Trash2 } from "lucide-react";
import { Formatter } from "@in.pulse-crm/utils";
import { ReportResultTable } from "@/components/reports/ReportResults";
import { reportPeriodLabel } from "@/lib/reports/filters";
import filesService from "@/lib/services/files.service";
import { ChatsReportContext } from "./chats-reports-context";

const statuses = { pending: "Processando", completed: "Finalizado", failed: "Falhou" };

export default function ChatsReportList() {
  const { reports, loading, error, reload, deleteReport, users } = useContext(ChatsReportContext);
  const [status, setStatus] = useState("all");
  const names = new Map(users.map((user) => [String(user.CODIGO), user.NOME]));
  const visible = reports.filter((report) => status === "all" || status === report.status);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <TextField
          select
          size="small"
          label="Situação do arquivo"
          value={status}
          sx={{ minWidth: 190 }}
          onChange={(event) => setStatus(event.target.value)}
        >
          <MenuItem value="all">Todas</MenuItem>
          {Object.entries(statuses).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <Button disabled={loading} onClick={reload}>
          Atualizar histórico
        </Button>
      </div>
      {loading && <Alert severity="info">Carregando histórico…</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading || reports.length > 0 ? (
        <ReportResultTable
          title="Histórico de arquivos"
          columns={[
            "Status",
            "Operador",
            "Solicitado em",
            "Período",
            "Conversas",
            "Mensagens",
            "Formato",
            "Ações",
          ].map((label) => ({ label }))}
          searchHint="Operador, formato, período ou situação"
          exportDisabled
          rows={visible.map((report) => {
            const label = statuses[report.status as keyof typeof statuses] ?? report.status;
            const operator =
              String(report.userId) === "*"
                ? "Todos"
                : names.get(String(report.userId)) || "Operador " + report.userId;
            const period = reportPeriodLabel({
              startDate: report.startDate.slice(0, 10),
              endDate: report.endDate.slice(0, 10),
            });
            const requested = Formatter.date(report.exportDate);
            const format = report.format.toUpperCase();
            return {
              key: report.id,
              search: [label, operator, report.userId, period, requested, format].join(" "),
              cells: [
                label + (report.status === "pending" ? " (" + report.progress + "%)" : ""),
                operator,
                requested,
                period,
                report.chats,
                report.messages,
                format,
                <div key="actions" className="flex items-center gap-2">
                  {report.status === "completed" && report.fileId && (
                    <Button
                      size="small"
                      href={filesService.getFileDownloadUrl(report.fileId)}
                      startIcon={<Download size={15} />}
                    >
                      Baixar
                    </Button>
                  )}
                  <Button
                    size="small"
                    color="error"
                    onClick={() => void deleteReport(report.id)}
                    startIcon={<Trash2 size={15} />}
                  >
                    Excluir
                  </Button>
                </div>,
              ],
            };
          })}
        />
      ) : null}
    </>
  );
}
