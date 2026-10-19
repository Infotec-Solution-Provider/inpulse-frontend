"use client";

import { Alert, Button } from "@mui/material";
import useMonitorContext from "../context";

const indicators = [
  {
    key: "inProgress",
    status: "in_progress",
    label: "Em atendimento",
    hint: "Conversas em andamento",
  },
  {
    key: "waitingAgent",
    status: "waiting_agent",
    label: "Aguardando atendente",
    hint: "Clientes aguardando resposta",
  },
  {
    key: "waitingCustomer",
    status: "waiting_customer",
    label: "Aguardando cliente",
    hint: "Última resposta do atendente",
  },
  {
    key: "unread",
    status: "unread",
    label: "Não lidas",
    hint: "Conversas com mensagens não lidas",
  },
  { key: "scheduled", status: "scheduled", label: "Agendamentos", hint: "Até 24h e vencidos" },
] as const;

export function quickFilterLabel(status: string): string | null {
  return indicators.find((indicator) => indicator.status === status)?.label ?? null;
}

/** The API indicators also act as explicit operational quick filters. */
export default function MonitorSummary() {
  const { summary, appliedFilters, setOperationalStatus } = useMonitorContext();

  return (
    <section aria-label="Indicadores da monitoria" className="ip-conversation-summary">
      {indicators.map((indicator) => {
        const selected = appliedFilters.operationalStatus === indicator.status;
        return (
          <button
            key={indicator.key}
            type="button"
            disabled={!summary}
            aria-pressed={selected}
            title={indicator.hint}
            onClick={() => setOperationalStatus(selected ? "all" : indicator.status)}
            className="ip-conversation-indicator"
          >
            <span>{indicator.label}</span>
            <strong>{summary ? summary[indicator.key].toLocaleString("pt-BR") : "—"}</strong>
          </button>
        );
      })}
    </section>
  );
}

export function MonitorSummaryAlert() {
  const { summary, summaryError, isLoading, isRefreshing, refetch } = useMonitorContext();
  if (!summaryError) return null;
  return (
    <Alert
      severity="warning"
      action={
        <Button color="inherit" size="small" disabled={isLoading || isRefreshing} onClick={refetch}>
          Tentar novamente
        </Button>
      }
    >
      {summary
        ? "Os indicadores podem estar desatualizados. "
        : "Não foi possível carregar os indicadores. "}
      {summaryError}
    </Alert>
  );
}
