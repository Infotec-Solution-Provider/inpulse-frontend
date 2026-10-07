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
  { key: "overdue", status: "overdue", label: "Fora do SLA", hint: "Tempo de resposta excedido" },
  { key: "scheduled", status: "scheduled", label: "Agendamentos", hint: "Até 24h e vencidos" },
] as const;

export function quickFilterLabel(status: string): string | null {
  return indicators.find((indicator) => indicator.status === status)?.label ?? null;
}

/** Quick filters as one row of pills; the description of each one is in its tooltip. */
export default function MonitorSummary() {
  const { summary, appliedFilters, setOperationalStatus } = useMonitorContext();

  return (
    <section aria-label="Indicadores da monitoria" className="flex flex-wrap gap-1.5">
      {indicators.map((indicator) => {
        const selected = appliedFilters.operationalStatus === indicator.status;
        const slaUnavailable = indicator.status === "overdue" && summary?.slaMinutes == null;
        const disabled = !summary || slaUnavailable;
        return (
          <button
            key={indicator.key}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            title={
              slaUnavailable
                ? "O prazo de SLA não está configurado para esta instância."
                : indicator.status === "overdue" && summary?.slaMinutes
                  ? `${indicator.hint} · Limite: ${summary.slaMinutes} min`
                  : indicator.hint
            }
            onClick={() => setOperationalStatus(selected ? "all" : indicator.status)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default ${selected ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40" : "border-slate-200 bg-white enabled:hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:enabled:hover:border-indigo-400"}`}
          >
            <span className="text-slate-600 dark:text-slate-300">{indicator.label}</span>
            <span
              className={`text-sm font-semibold tabular-nums ${selected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-900 dark:text-slate-100"}`}
            >
              {summary && !slaUnavailable ? summary[indicator.key].toLocaleString("pt-BR") : "—"}
            </span>
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
