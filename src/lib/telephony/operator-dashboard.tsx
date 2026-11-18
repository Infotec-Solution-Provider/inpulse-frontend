"use client";

import { useEffect, useId, useState } from "react";
import { Alert, Dialog, DialogContent, IconButton, Tooltip } from "@mui/material";
import { ChartNoAxesColumnIncreasing } from "lucide-react";
import { UiIcon } from "@/lib/ui-system/icons";
import type { RuntimeOperatorState } from "./runtime-client";
import type { PhoneState } from "./types";
import { TelephonyDialogTitle } from "./dialog-title";

export interface OperatorDashboardMetrics {
  serverNow: string;
  crmDay: string;
  conversationSeconds: number;
  attempts: number;
  pauseSeconds: number;
  productivePauseSeconds: number;
  connectedSeconds: number | null;
  contacts: number | null;
  closedOrders: number | null;
  closedOrderValue: string | null;
  productivityPercent: number | null;
  quotesToClose: number | null;
  scheduledCustomers: number | null;
  overdueSchedules: number | null;
  expectedSeconds: number | null;
  expectedSource: "campaign" | "receptive" | null;
  minimumConversationSeconds: number | null;
  incompleteCalls: number;
  visibility: { orders: boolean; productivity: boolean };
  availability: Record<string, boolean>;
}
export function operatorDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "Indisponível";
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 3600)
    .toString()
    .padStart(
      2,
      "0",
    )}:${Math.floor(value / 60) % 60 < 10 ? "0" : ""}${Math.floor(value / 60) % 60}:${(value % 60).toString().padStart(2, "0")}`;
}
function count(value: number | null | undefined) {
  return value == null ? "Indisponível" : value.toLocaleString("pt-BR");
}
export function operatorDashboardCards(metrics: OperatorDashboardMetrics) {
  const cards: Array<[string, string]> = [
    ["Tempo conectado", operatorDuration(metrics.connectedSeconds)],
    ["Conversa hoje", operatorDuration(metrics.conversationSeconds)],
    ["Pausas", operatorDuration(metrics.pauseSeconds)],
    ["Ligações", count(metrics.attempts)],
    ["Contatos", count(metrics.contacts)],
    ["Clientes agendados", count(metrics.scheduledCustomers)],
    ["Agendamentos atrasados", count(metrics.overdueSchedules)],
    ["Cotações a fechar", count(metrics.quotesToClose)],
  ];
  if (metrics.visibility.orders)
    cards.push([
      "Pedidos fechados",
      metrics.closedOrders == null || metrics.closedOrderValue == null
        ? "Indisponível"
        : `${count(metrics.closedOrders)} · ${Number(metrics.closedOrderValue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    ]);
  if (metrics.visibility.productivity)
    cards.push([
      "Produtividade",
      metrics.productivityPercent == null
        ? "Indisponível"
        : `${metrics.productivityPercent.toLocaleString("pt-BR")}%`,
    ]);
  return cards;
}
export default function OperatorDashboard({
  metrics,
  state,
  phone,
  loading = false,
}: {
  metrics: OperatorDashboardMetrics | null;
  state: RuntimeOperatorState | null;
  phone: PhoneState;
  loading?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!["dialing", "ringing", "active", "incoming"].includes(phone.phase)) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [phone.phase]);
  const total = phone.startedAt ? Math.max(0, (now - Date.parse(phone.startedAt)) / 1000) : null;
  const answeredAt = (phone as PhoneState & { answeredAt?: string | null }).answeredAt;
  const conversation = answeredAt ? Math.max(0, (now - Date.parse(answeredAt)) / 1000) : null;
  const expected = metrics?.expectedSeconds,
    minimum = metrics?.minimumConversationSeconds;
  if (state?.enabled === false) return null;
  return (
    <section
      aria-label="Meu desempenho na telefonia"
      className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Minha telefonia</h3>
        <span className="text-xs text-slate-500">
          {metrics
            ? `Dia do CRM: ${metrics.crmDay.split("-").reverse().join("/")}`
            : loading
              ? "Atualizando indicadores…"
              : "Indicadores indisponíveis"}
        </span>
      </div>
      {metrics && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {operatorDashboardCards({
            ...metrics,
            conversationSeconds:
              metrics.conversationSeconds + (phone.phase === "active" ? conversation || 0 : 0),
          }).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {["dialing", "ringing", "active", "incoming"].includes(phone.phase) && (
        <dl className="flex flex-wrap gap-5 border-t border-slate-200 pt-3 dark:border-slate-700">
          <div>
            <dt className="text-xs text-slate-500">Ligação atual</dt>
            <dd className="tabular-nums">{operatorDuration(total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Conversa atual</dt>
            <dd className="tabular-nums">{operatorDuration(conversation)}</dd>
          </div>
          {expected != null && expected > 0 && (
            <div>
              <dt className="text-xs text-slate-500">
                Previsto ({metrics?.expectedSource === "campaign" ? "campanha" : "receptivo"})
              </dt>
              <dd className="tabular-nums">{operatorDuration(expected)}</dd>
            </div>
          )}
        </dl>
      )}
      {expected != null &&
        expected > 0 &&
        total != null &&
        total > expected &&
        ["dialing", "ringing", "active"].includes(phone.phase) && (
          <Alert severity="warning">A ligação ultrapassou o tempo previsto.</Alert>
        )}
      {minimum != null &&
        minimum > 0 &&
        conversation != null &&
        conversation < minimum &&
        phone.phase === "active" && (
          <Alert severity="info">
            Conversa mínima configurada: {operatorDuration(minimum)}. Faltam{" "}
            {operatorDuration(minimum - conversation)}.
          </Alert>
        )}
      {!!metrics?.incompleteCalls && (
        <p className="text-xs text-slate-500">
          Há ligações sem encerramento confirmado. O total de conversa inclui somente os intervalos
          registrados.
        </p>
      )}
    </section>
  );
}
/** Keep indicators accessible without consuming the chat list's fixed sidebar height. */
export function OperatorDashboardDialog(props: Parameters<typeof OperatorDashboard>[0]) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = () => setOpen(false);
  return (
    <>
      <Tooltip title="Meus indicadores de telefonia">
        <IconButton
          size="small"
          aria-label="Meus indicadores de telefonia"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <UiIcon icon={ChartNoAxesColumnIncreasing} />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={close} fullWidth maxWidth="md" aria-labelledby={titleId}>
        <TelephonyDialogTitle id={titleId} onClose={close}>
          Meus indicadores de telefonia
        </TelephonyDialogTitle>
        <DialogContent>
          <OperatorDashboard {...props} />
        </DialogContent>
      </Dialog>
    </>
  );
}
