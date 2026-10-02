"use client";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { Button, Chip, Tooltip } from "@mui/material";
import type { TelephonyMonitorItem, TelephonyMonitorMode, TelephonyMonitorView } from "../types";
import { displayDate, displayDuration, displayMonth, telephonyModes } from "./presentation";

interface TelephonyResultsProps {
  items: TelephonyMonitorItem[];
  mode: TelephonyMonitorMode;
  view: TelephonyMonitorView;
  referenceMonth: string;
  onPreview: (customerId: number) => void;
}

function Activity({ item }: { item: TelephonyMonitorItem }) {
  return (
    <div className="space-y-1 text-xs">
      <p>
        {item.metrics.monthCalls} {item.metrics.monthCalls === 1 ? "ligação" : "ligações"} ·{" "}
        {item.metrics.monthContacts} {item.metrics.monthContacts === 1 ? "contato" : "contatos"}
      </p>
      {item.metrics.neverWorked && (
        <Chip size="small" variant="outlined" label="Nunca trabalhado" />
      )}
    </div>
  );
}

function EventInfo({ item, mode }: { item: TelephonyMonitorItem; mode: TelephonyMonitorMode }) {
  if (mode === "schedules")
    return (
      <div className="space-y-0.5">
        <p className="font-medium">{displayDate(item.schedule?.at ?? null)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {item.schedule?.campaignName || "Sem campanha"}
          {item.schedule?.operatorName ? ` · ${item.schedule.operatorName}` : ""}
        </p>
      </div>
    );
  if (mode === "calls")
    return (
      <div className="space-y-0.5">
        <p className="font-medium">
          {displayDate(item.call?.startedAt ?? item.call?.finishedAt ?? null)}
        </p>
        {!item.call?.startedAt && item.call?.finishedAt && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Data de finalização; início não informado.
          </p>
        )}
        <p className="text-xs">
          {item.call?.result || "Resultado não informado"}
          <span className="text-slate-500 dark:text-slate-400">
            {" · "}
            {displayDuration(item.call?.durationSeconds ?? null)}
            {item.call?.operatorName ? ` · ${item.call.operatorName}` : ""}
          </span>
        </p>
        {item.call?.phone && item.call.phone !== item.customer.phone && (
          <p className="text-xs">Telefone utilizado: {item.call.phone}</p>
        )}
      </div>
    );
  return (
    <div className="space-y-0.5">
      <p>Último contato: {displayDate(item.metrics.lastContactAt, false)}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Última compra: {displayDate(item.metrics.lastPurchaseAt, false)}
      </p>
    </div>
  );
}

function CustomerInfo({ item }: { item: TelephonyMonitorItem }) {
  const { customer } = item;
  return (
    <div className="space-y-0.5">
      <p className="break-words">
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {customer.name || `Cliente #${customer.id}`}
        </span>
        {customer.tradeName && customer.tradeName !== customer.name && (
          <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
            {customer.tradeName}
          </span>
        )}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        #{customer.id}
        {customer.document ? ` · ${customer.document}` : ""}
        {customer.phone && (
          <span className="text-slate-700 dark:text-slate-200"> · {customer.phone}</span>
        )}
      </p>
      {(customer.city || customer.state) && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
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
}: TelephonyResultsProps) {
  const eventLabel =
    mode === "schedules" ? "Agendamento" : mode === "calls" ? "Ligação" : "Atividade recente";
  const preview = (item: TelephonyMonitorItem) => (
    <Button
      size="small"
      startIcon={<VisibilityOutlinedIcon />}
      onClick={() => onPreview(item.customer.id)}
      aria-label={`Ver cliente ${item.customer.name || item.customer.id}`}
      sx={{ whiteSpace: "nowrap" }}
    >
      Ver cliente
    </Button>
  );

  // Compact: a table on desktop (cards below lg, where a table would not fit).
  // Cards: the card layout at every width, as a grid on desktop.
  return (
    <>
      {view === "compact" && (
        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 lg:block">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
            <caption className="sr-only">{telephonyModes[mode].description}</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs dark:border-slate-700 dark:bg-slate-900">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Cliente
                </th>
                <th scope="col" className="px-3 py-2">
                  {eventLabel}
                </th>
                <th scope="col" className="px-3 py-2">
                  Operador do cliente
                </th>
                <th scope="col" className="px-3 py-2">
                  <Tooltip
                    describeChild
                    title="Contatos telefônicos efetivos e registros de ligações no mês de referência."
                  >
                    <span tabIndex={0}>Atividade em {displayMonth(referenceMonth)}</span>
                  </Tooltip>
                </th>
                <th scope="col" className="px-3 py-2">
                  Previsão de recompra
                </th>
                <th scope="col" className="px-3 py-2">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="align-top hover:bg-slate-50 dark:hover:bg-slate-900/50"
                >
                  <td className="min-w-44 px-3 py-2">
                    <CustomerInfo item={item} />
                  </td>
                  <td className="px-3 py-2">
                    <EventInfo item={item} mode={mode} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {item.customer.operatorName || "Sem operador"}
                  </td>
                  <td className="px-3 py-2">
                    <Activity item={item} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {displayDate(item.metrics.nextRepurchaseAt, false)}
                  </td>
                  <td className="px-2 py-1">{preview(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ul
        aria-label={telephonyModes[mode].label}
        className={
          view === "cards" ? "grid gap-2 lg:grid-cols-2 2xl:grid-cols-3" : "space-y-2 lg:hidden"
        }
      >
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <CustomerInfo item={item} />
            <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{eventLabel}</p>
              <EventInfo item={item} mode={mode} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Operador do cliente</dt>
                <dd className="mt-1">{item.customer.operatorName || "Sem operador"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Previsão de recompra</dt>
                <dd className="mt-1">{displayDate(item.metrics.nextRepurchaseAt, false)}</dd>
              </div>
            </dl>
            {/* mt-auto aligns the activity row to the bottom of equal-height grid cards. */}
            <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
              <div>
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                  Atividade em {displayMonth(referenceMonth)}
                </p>
                <Activity item={item} />
              </div>
              {preview(item)}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
