"use client";

import { Button, Tooltip } from "@mui/material";
import { CalendarClock, Eye, Pencil, Phone, UserRound } from "lucide-react";
import type { TelephonyMonitorItem, TelephonyMonitorMode, TelephonyMonitorView } from "../types";
import { displayDate, displayDuration, displayMonth, telephonyModes } from "./presentation";

interface TelephonyResultsProps {
  items: TelephonyMonitorItem[];
  mode: TelephonyMonitorMode;
  view: TelephonyMonitorView;
  referenceMonth: string;
  onPreview: (customerId: number) => void;
  onEditSchedule: (scheduleId: number) => void;
}

function Activity({ item }: { item: TelephonyMonitorItem }) {
  return (
    <div className="space-y-1.5 text-xs">
      <p className="tabular-nums">
        <strong className="font-medium">{item.metrics.monthCalls}</strong>{" "}
        {item.metrics.monthCalls === 1 ? "ligação" : "ligações"}
        <span className="ip-muted"> · </span>
        <strong className="font-medium">{item.metrics.monthContacts}</strong>{" "}
        {item.metrics.monthContacts === 1 ? "contato" : "contatos"}
      </p>
      {item.metrics.neverWorked && <span className="ip-badge">Nunca trabalhado</span>}
    </div>
  );
}

function EventInfo({ item, mode }: { item: TelephonyMonitorItem; mode: TelephonyMonitorMode }) {
  if (mode === "schedules")
    return (
      <div className="space-y-1">
        <p className="flex items-start gap-1.5 font-semibold tabular-nums">
          <CalendarClock size={15} className="mt-0.5 shrink-0 text-[var(--ip-accent)]" />
          {displayDate(item.schedule?.at ?? null)}
        </p>
        <p className="ip-muted text-xs">{item.schedule?.campaignName || "Sem campanha"}</p>
        <p className="text-xs">
          <span className="ip-muted">Operador da agenda: </span>
          {item.schedule?.operatorName || "Sem operador"}
        </p>
      </div>
    );
  if (mode === "calls")
    return (
      <div className="space-y-1">
        <p className="flex items-start gap-1.5 font-semibold tabular-nums">
          <Phone size={15} className="mt-0.5 shrink-0 text-[var(--ip-accent)]" />
          {displayDate(item.call?.startedAt ?? item.call?.finishedAt ?? null)}
        </p>
        {!item.call?.startedAt && item.call?.finishedAt && (
          <p className="ip-muted text-xs">Data de finalização; início não informado.</p>
        )}
        <p className="text-xs">
          {item.call?.result || "Resultado não informado"}
          <span className="ip-muted"> · {displayDuration(item.call?.durationSeconds ?? null)}</span>
        </p>
        {item.call?.operatorName && (
          <p className="text-xs">
            <span className="ip-muted">Operador da ligação: </span>
            {item.call.operatorName}
          </p>
        )}
        {item.call?.phone && item.call.phone !== item.customer.phone && (
          <p className="ip-muted text-xs">Telefone utilizado: {item.call.phone}</p>
        )}
      </div>
    );
  return (
    <div className="space-y-1 text-xs">
      <p>
        Último contato:{" "}
        <span className="tabular-nums">{displayDate(item.metrics.lastContactAt, false)}</span>
      </p>
      <p className="ip-muted">Última compra: {displayDate(item.metrics.lastPurchaseAt, false)}</p>
    </div>
  );
}

function CustomerInfo({ item }: { item: TelephonyMonitorItem }) {
  const { customer } = item;
  return (
    <div className="min-w-0 space-y-1">
      <p className="break-words font-semibold">{customer.name || `Cliente #${customer.id}`}</p>
      {customer.tradeName && customer.tradeName !== customer.name && (
        <p className="ip-muted break-words text-xs">{customer.tradeName}</p>
      )}
      <p className="ip-muted break-words text-xs">
        #{customer.id}
        {customer.document ? ` · ${customer.document}` : ""}
      </p>
      {customer.phone && <p className="text-xs tabular-nums">{customer.phone}</p>}
      {(customer.city || customer.state) && (
        <p className="ip-muted break-words text-xs">
          {[customer.neighborhood, customer.city, customer.state].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

export default function TelephonyResults({
  items,
  mode,
  view,
  referenceMonth,
  onPreview,
  onEditSchedule,
}: TelephonyResultsProps) {
  const eventLabel =
    mode === "schedules" ? "Agendamento" : mode === "calls" ? "Ligação" : "Atividade recente";
  const actions = (item: TelephonyMonitorItem) => (
    <div className="ip-actions flex flex-col items-start gap-1">
      {mode === "schedules" && item.schedule && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Pencil size={14} />}
          onClick={() => onEditSchedule(item.schedule!.id)}
          aria-label={`Editar agendamento ${item.schedule.id} de ${item.customer.name || item.customer.id}`}
          sx={{ whiteSpace: "nowrap" }}
        >
          Editar agendamento
        </Button>
      )}
      <Button
        size="small"
        startIcon={<Eye size={15} />}
        onClick={() => onPreview(item.customer.id)}
        aria-label={`Ver cliente ${item.customer.name || item.customer.id}`}
        sx={{ whiteSpace: "nowrap" }}
      >
        Ver cliente
      </Button>
    </div>
  );
  return (
    <>
      {view === "compact" && (
        <div className="ip-results hidden lg:block" style={{ overflowX: "auto" }}>
          <table className="ip-table w-full text-left text-sm">
            <caption className="sr-only">{telephonyModes[mode].description}</caption>
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">{eventLabel}</th>
                <th scope="col">Operador do cliente</th>
                <th scope="col">
                  <Tooltip
                    describeChild
                    title="Contatos telefônicos efetivos e registros de ligações no mês de referência."
                  >
                    <span tabIndex={0}>Atividade em {displayMonth(referenceMonth)}</span>
                  </Tooltip>
                </th>
                <th scope="col">Previsão de recompra</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="min-w-44">
                    <CustomerInfo item={item} />
                  </td>
                  <td className="min-w-44">
                    <EventInfo item={item} mode={mode} />
                  </td>
                  <td className="text-xs">
                    {item.customer.operatorName || "Sem operador"}
                    <span className="ip-muted mt-1 block text-[11px]">Cadastro do cliente</span>
                  </td>
                  <td>
                    <Activity item={item} />
                  </td>
                  <td className="text-xs tabular-nums">
                    {displayDate(item.metrics.nextRepurchaseAt, false)}
                  </td>
                  <td>{actions(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ul
        aria-label={telephonyModes[mode].label}
        className={
          view === "cards"
            ? "grid min-w-0 gap-3 xl:grid-cols-2 2xl:grid-cols-3"
            : "min-w-0 space-y-3 lg:hidden"
        }
      >
        {items.map((item) => (
          <li key={item.id} className="ip-result-card flex min-w-0 flex-col p-4 text-sm">
            <CustomerInfo item={item} />
            <div className="my-3 border-y border-[var(--ip-border)] py-3">
              <p className="ip-muted mb-1.5 text-xs">{eventLabel}</p>
              <EventInfo item={item} mode={mode} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="ip-muted flex items-center gap-1">
                  <UserRound size={12} />
                  Operador do cliente
                </dt>
                <dd className="mt-1 break-words">{item.customer.operatorName || "Sem operador"}</dd>
              </div>
              <div>
                <dt className="ip-muted">Previsão de recompra</dt>
                <dd className="mt-1 tabular-nums">
                  {displayDate(item.metrics.nextRepurchaseAt, false)}
                </dd>
              </div>
            </dl>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
              <div>
                <p className="ip-muted mb-1.5 text-xs">
                  Atividade em {displayMonth(referenceMonth)}
                </p>
                <Activity item={item} />
              </div>
              {actions(item)}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
