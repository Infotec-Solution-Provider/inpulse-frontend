"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import { Alert } from "@mui/material";
import { ReportResultChart, ReportResultTable } from "./ReportResults";
import {
  defaultReportPeriod,
  downloadReportCsv,
  validateReportPeriod,
  type ReportPeriod,
} from "@/lib/reports/filters";
import { useReportExecution } from "@/lib/reports/use-report-execution";
import { ReportExecutionStatus, ReportFilterPanel, ReportPageShell } from "./ReportWorkflow";

interface OperatorMessages {
  userId: number;
  userName: string;
  messagesCount: number;
  sentMessagesCount: number;
  receivedMessagesCount: number;
}
const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL || "http://localhost:8005";

export function MessagesPerOperatorReport({
  instance,
  token,
  scope,
}: {
  instance: string;
  token: string;
  scope: string;
}) {
  const [draft, setDraft] = useState(defaultReportPeriod);
  const execute = useCallback(
    async (period: ReportPeriod, signal: AbortSignal) => {
      const response = await axios.get<{ data: { messagesPerUser: OperatorMessages[] } }>(
        `${WHATSAPP_URL}/api/whatsapp/dashboard/messages-per-user`,
        {
          signal,
          headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` },
          params: { date: `${period.startDate}_${period.endDate}` },
        },
      );
      return response.data.data.messagesPerUser;
    },
    [token],
  );
  const execution = useReportExecution({ scope, execute, validate: validateReportPeriod });
  const dirty = Boolean(
    execution.applied &&
      (draft.startDate !== execution.applied.startDate ||
        draft.endDate !== execution.applied.endDate),
  );
  const rows = execution.result ?? [];
  const labels = execution.applied
    ? [
        `${execution.applied.startDate.split("-").reverse().join("/")} a ${execution.applied.endDate.split("-").reverse().join("/")}`,
      ]
    : [];
  return (
    <ReportPageShell
      instance={instance}
      category="Atendimento e WhatsApp"
      title="Mensagens por Operador"
      description="Consulte as mensagens enviadas e recebidas por operador no período selecionado."
    >
      <ReportFilterPanel
        period={draft}
        onPeriodChange={setDraft}
        onGenerate={() => void execution.generate(draft)}
        onClear={() => setDraft(defaultReportPeriod())}
        onRestore={execution.applied ? () => setDraft(execution.applied!) : undefined}
        dirty={dirty}
        loading={execution.loading}
      />
      <ReportExecutionStatus
        loading={execution.loading}
        error={execution.error}
        generatedAt={execution.generatedAt}
        hasResult={execution.result !== null}
        labels={labels}
      />
      {execution.result !== null &&
        (rows.length === 0 ? (
          <Alert severity="info">Nenhuma mensagem encontrada para o período selecionado.</Alert>
        ) : (
          <>
            <ReportResultChart
              title="Distribuição por operador"
              metric="Mensagens"
              directions
              hideXAxis
              note="O gráfico mostra até 20 operadores. A tabela inclui todos os operadores retornados."
              points={rows
                .slice(0, 20)
                .map((row) => ({
                  label: row.userName,
                  total: row.messagesCount,
                  sent: row.sentMessagesCount,
                  received: row.receivedMessagesCount,
                }))}
            />
            <ReportResultTable
              columns={[
                { label: "Operador" },
                ...["Mensagens", "Enviadas", "Recebidas"].map((label) => ({
                  label,
                  numeric: true,
                })),
              ]}
              rows={rows.map((row) => ({
                key: row.userId,
                search: `${row.userName} ${row.userId}`,
                cells: [
                  <>
                    {row.userName} <span className="text-xs text-slate-500">#{row.userId}</span>
                  </>,
                  row.messagesCount,
                  row.sentMessagesCount,
                  row.receivedMessagesCount,
                ],
              }))}
              searchHint="Nome ou código do operador"
              exportDisabled={dirty || execution.loading || Boolean(execution.error)}
              onExport={() =>
                downloadReportCsv(
                  `mensagens-por-operador_${execution.applied!.startDate}_${execution.applied!.endDate}.csv`,
                  ["Código", "Operador", "Mensagens", "Enviadas", "Recebidas"],
                  rows.map((row) => [
                    row.userId,
                    row.userName,
                    row.messagesCount,
                    row.sentMessagesCount,
                    row.receivedMessagesCount,
                  ]),
                )
              }
            />
          </>
        ))}
    </ReportPageShell>
  );
}
