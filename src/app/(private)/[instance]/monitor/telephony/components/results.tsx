"use client";

import { Tooltip } from "@mui/material";
import { CalendarClock, Eye, Pencil, Phone } from "lucide-react";
import { OperationalIconButton } from "@/lib/ui-system";
import formatCpfCnpj from "@/lib/utils/format-cnpj";
import type { TelephonyMonitorItem, TelephonyMonitorMode, TelephonyMonitorView } from "../types";
import { displayDate, displayDuration, displayMonth, telephonyModes } from "./presentation";
import "./telephony-density.css";

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
      <div className="space-y-0.5">
        <p className="flex items-start gap-1.5 font-semibold tabular-nums">
          <CalendarClock size={15} className="ip-muted mt-0.5 shrink-0" />
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
      <div className="space-y-0.5">
        <p className="flex items-start gap-1.5 font-semibold tabular-nums">
          <Phone size={15} className="ip-muted mt-0.5 shrink-0" />
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
  const name = customer.name?.trim() || `Cliente #${customer.id}`;
  const tradeName = customer.tradeName?.trim();
  const distinctTradeName =
    tradeName && tradeName.toLocaleLowerCase("pt-BR") !== name.toLocaleLowerCase("pt-BR")
      ? tradeName
      : null;
  const location = [customer.city, customer.state].filter(Boolean).join(" · ");
  const identityContext = [distinctTradeName, location].filter(Boolean).join(" · ");
  const phoneAndDocument = [customer.phone, formatCpfCnpj(customer.document?.trim() || null)]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="ip-telephony-identity min-w-0 space-y-0.5">
      <p className="ip-telephony-customer-name font-semibold" title={name}>
        {name}
      </p>
      {identityContext && (
        <p className="ip-telephony-customer-context ip-muted text-xs" title={identityContext}>
          {identityContext}
        </p>
      )}
      {phoneAndDocument && (
        <p className="ip-telephony-customer-context text-xs tabular-nums" title={phoneAndDocument}>
          {phoneAndDocument}
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
    <div
      className="ip-telephony-actions flex shrink-0 items-center gap-0.5"
      role="group"
      aria-label={`Ações de ${item.customer.name || `cliente ${item.customer.id}`}`}
    >
      <OperationalIconButton
        size="small"
        label={`Ver cliente ${item.customer.name || item.customer.id}`}
        tooltip="Ver cliente"
        onClick={() => onPreview(item.customer.id)}
      >
        <Eye size={17} />
      </OperationalIconButton>
      {mode === "schedules" && item.schedule && (
        <OperationalIconButton
          size="small"
          onClick={() => onEditSchedule(item.schedule!.id)}
          label={`Editar agendamento ${item.schedule.id} de ${item.customer.name || item.customer.id}`}
          tooltip="Editar agendamento"
        >
          <Pencil size={17} />
        </OperationalIconButton>
      )}
    </div>
  );
  return (
    <>
      {view === "compact" && (
        <div className="ip-results hidden lg:block" style={{ overflowX: "auto" }}>
          <table className="ip-table ip-telephony-table w-full text-left text-sm">
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
                <tr key={item.id}>
                  <td className="ip-telephony-customer-cell">
                    <CustomerInfo item={item} />
                  </td>
                  <td className="ip-telephony-event-cell">
                    <EventInfo item={item} mode={mode} />
                  </td>
                  <td className="text-xs">{item.customer.operatorName || "Sem operador"}</td>
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
          <li
            key={item.id}
            className="ip-result-card ip-telephony-card flex min-w-0 flex-col gap-3 p-3 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <CustomerInfo item={item} />
              {actions(item)}
            </div>
            <div>
              <p className="sr-only">{eventLabel}</p>
              <EventInfo item={item} mode={mode} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="ip-muted">Operador do cliente</dt>
                <dd className="mt-1 break-words">{item.customer.operatorName || "Sem operador"}</dd>
              </div>
              <div>
                <dt className="ip-muted">Previsão de recompra</dt>
                <dd className="mt-1 tabular-nums">
                  {displayDate(item.metrics.nextRepurchaseAt, false)}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <p className="ip-muted">Atividade em {displayMonth(referenceMonth)}</p>
              <Activity item={item} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
