"use client";

import { useContext, useMemo, useState } from "react";
import { Alert, MenuItem, TextField } from "@mui/material";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { AuthContext } from "@/app/auth-context";
import { ReportFormControls } from "@/components/reports/ReportFormControls";
import {
  SearchableEntityFilter,
  type EntityOption,
} from "@/components/reports/SearchableEntityFilter";
import { defaultReportPeriod, validateReportPeriod } from "@/lib/reports/filters";
import { reportOperatorOptions } from "@/lib/reports/operator-options";
import { useReportForm } from "@/lib/reports/use-report-form";
import type { ChatsReportFormat } from "@/lib/sdk-local";
import { ChatsReportContext } from "./chats-reports-context";

const defaults = () => ({
  period: defaultReportPeriod(),
  operator: null as EntityOption | null,
  format: "pdf" as ChatsReportFormat,
});

export default function ChatReportForm({ instance }: { instance: string }) {
  const { token, user } = useContext(AuthContext);
  const { generateReport } = useContext(ChatsReportContext);
  const scope = instance + ":" + user?.CODIGO + ":chat-export";
  const options = useMemo(() => reportOperatorOptions(token ?? ""), [token]);
  const [notification, setNotification] = useState<string | null>(null);
  const form = useReportForm({
    scope,
    defaults,
    validate: (filters) => validateReportPeriod(filters.period),
    execute: async (filters) => {
      setNotification(null);
      try {
        await generateReport({
          ...filters.period,
          userId: String(filters.operator?.id ?? "*"),
          format: filters.format,
        });
        setNotification("Arquivo solicitado. Acompanhe o processamento no histórico abaixo.");
        // A solicitação cria um item no histórico, não um resultado vinculado aos filtros atuais.
        return null;
      } catch (error) {
        throw new Error(sanitizeErrorMessage(error) ?? "Falha ao solicitar o arquivo.");
      }
    },
  });

  return (
    <>
      <ReportFormControls
        form={{ ...form, dirty: false }}
        period={form.draft.period}
        setPeriod={(period) => form.setDraft({ ...form.draft, period })}
        submitLabel="Gerar arquivo"
        pendingLabel="Solicitando arquivo…"
        disabled={!token}
      >
        <SearchableEntityFilter
          label="Operador"
          scope={scope}
          value={form.draft.operator}
          loadOptions={options}
          onChange={(operator) => form.setDraft({ ...form.draft, operator })}
        />
        <TextField
          select
          size="small"
          label="Formato"
          value={form.draft.format}
          onChange={(event) =>
            form.setDraft({ ...form.draft, format: event.target.value as ChatsReportFormat })
          }
        >
          <MenuItem value="pdf">PDF</MenuItem>
          <MenuItem value="csv">CSV</MenuItem>
          <MenuItem value="txt">TXT</MenuItem>
        </TextField>
      </ReportFormControls>
      {form.error && <Alert severity="error">{form.error}</Alert>}
      {notification && !form.error && <Alert severity="success">{notification}</Alert>}
    </>
  );
}
