"use client";

import { Alert, Button } from "@mui/material";
import { Clock3, MessageSquare, CalendarClock, Mail, Timer, UserRound } from "lucide-react";
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
const icons = [MessageSquare, UserRound, Clock3, Mail, Timer, CalendarClock];

export function quickFilterLabel(status: string): string | null {
  return indicators.find((indicator) => indicator.status === status)?.label ?? null;
}

/** The API indicators also act as explicit operational quick filters. */
export default function MonitorSummary() {
  const { summary, appliedFilters, setOperationalStatus } = useMonitorContext();

  return (
    <section
      aria-label="Indicadores da monitoria"
      className="ip-summary shrink-0 grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6"
      style={{ display: "grid" }}
    >
      {indicators.map((indicator, index) => {
        const Icon = icons[index];
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
            className="ip-stat min-w-0 rounded-xl border p-3 text-left transition-colors disabled:cursor-default disabled:opacity-60"
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 4,
              borderColor: selected ? "var(--ip-accent)" : "var(--ip-border)",
              background: selected ? "var(--ip-accent-soft)" : "var(--ip-surface)",
              color: "var(--ip-text)",
            }}
          >
            <span className="ip-muted flex items-center gap-2 text-xs">
              <Icon size={14} aria-hidden="true" />
              {indicator.label}
            </span>
            <span
              className="mt-1 block text-xl font-semibold tabular-nums"
              style={{ color: selected ? "var(--ip-accent)" : undefined }}
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
