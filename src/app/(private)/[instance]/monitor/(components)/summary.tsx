"use client";

import { Alert, Button, Chip } from "@mui/material";
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

export default function MonitorSummary() {
  const {
    summary,
    summaryError,
    appliedFilters,
    setOperationalStatus,
    isLoading,
    isRefreshing,
    refetch,
  } = useMonitorContext();
  const activeIndicator = indicators.find(
    (indicator) => indicator.status === appliedFilters.operationalStatus,
  );

  return (
    <section aria-label="Indicadores da monitoria" className="space-y-2">
      {summaryError && (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              disabled={isLoading || isRefreshing}
              onClick={refetch}
            >
              Tentar novamente
            </Button>
          }
        >
          {summary
            ? "Os indicadores podem estar desatualizados. "
            : "Não foi possível carregar os indicadores. "}
          {summaryError}
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
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
                  : indicator.hint
              }
              onClick={() => setOperationalStatus(selected ? "all" : indicator.status)}
              className={`min-w-0 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-default ${selected ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40" : "border-slate-200 bg-white enabled:hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:enabled:hover:border-indigo-400"}`}
            >
              <span className="block min-h-8 text-xs font-medium text-slate-600 dark:text-slate-300">
                {indicator.label}
              </span>
              <span
                className={`mt-1 block text-2xl font-semibold tabular-nums ${selected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-900 dark:text-slate-100"}`}
              >
                {summary && !slaUnavailable ? summary[indicator.key].toLocaleString("pt-BR") : "—"}
              </span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                {slaUnavailable && summary
                  ? "SLA não configurado"
                  : indicator.status === "overdue" && summary?.slaMinutes
                    ? `Limite: ${summary.slaMinutes} min`
                    : indicator.hint}
              </span>
            </button>
          );
        })}
      </div>
      {activeIndicator && (
        <Chip
          color="primary"
          size="small"
          variant="outlined"
          label={`Filtro rápido: ${activeIndicator.label}`}
          onDelete={() => setOperationalStatus("all")}
        />
      )}
    </section>
  );
}
