"use client";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import GroupIcon from "@mui/icons-material/Group";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Avatar, Chip, IconButton, Tooltip } from "@mui/material";
import type { MonitorOperational } from "../types";

export interface MonitorCardProps {
  type: "external-chat" | "internal-chat" | "internal-group" | "schedule" | "finished-chat";
  startDate?: string | null | false;
  endDate?: string | null | false;
  userName: string;
  sectorName?: string | null;
  imageUrl?: string | null;
  chatTitle: string;
  customerName?: string | null;
  contactNumber?: string | null;
  customerDocument?: string | null;
  scheduledAt?: string | null;
  scheduledFor?: string | null;
  participants?: string[];
  groupName?: string | null;
  groupDescription?: string | null;
  isScheduled?: boolean;
  isFinished?: boolean;
  operational?: MonitorOperational;
  compact?: boolean;
  handleTransfer?: (() => void) | null;
  handleView?: (() => void) | null;
  handleFinish?: (() => void) | null;
}

const typeConfig = {
  "external-chat": { color: "#4f46e5", label: "Atendimento" },
  "finished-chat": { color: "#64748b", label: "Finalizado" },
  "internal-chat": { color: "#9333ea", label: "Conversa interna" },
  "internal-group": { color: "#0d9488", label: "Grupo interno" },
  schedule: { color: "#d97706", label: "Agendamento" },
};

const statusLabels = {
  in_progress: "Em atendimento",
  waiting_agent: "Aguardando atendente",
  waiting_customer: "Aguardando cliente",
  finished: "Finalizado",
  scheduled: "Agendado",
};

const deliveryLabels: Record<string, string> = {
  PENDING: "Envio pendente",
  QUEUED: "Na fila de envio",
  SENDING: "Enviando",
  PROCESSING: "Envio em processamento",
  UNKNOWN: "Envio sem confirmação",
  FAILED: "Falha no envio",
  ERROR: "Falha no envio",
  SENT: "Enviada",
  DELIVERED: "Entregue",
  // READ has no tag: a read message is the normal end state and only adds noise.
  RECEIVED: "Entregue",
  DOWNLOADED: "Mídia baixada",
  REVOKED: "Mensagem removida",
};

function elapsedTime(value: string) {
  const milliseconds = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(milliseconds)) return null;
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "dia" : "dias"}${hours % 24 ? ` ${hours % 24} h` : ""}`;
}

function messageDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
}

export default function MonitorCard({
  type,
  startDate,
  endDate,
  userName,
  sectorName,
  imageUrl,
  chatTitle,
  customerName,
  contactNumber,
  customerDocument,
  scheduledAt,
  scheduledFor,
  isScheduled = false,
  participants,
  groupName,
  groupDescription,
  operational,
  compact = false,
  handleTransfer,
  handleView,
  handleFinish,
}: MonitorCardProps) {
  const config = typeConfig[type];
  const title = groupName || chatTitle || "Conversa sem título";
  const status = operational?.status;
  const waiting = status === "waiting_agent" || status === "waiting_customer";
  const waitTime =
    waiting && operational?.waitingSince ? elapsedTime(operational.waitingSince) : null;
  const lastMessageAt = operational?.lastMessageAt ? messageDate(operational.lastMessageAt) : null;
  const unread = operational?.unreadCount ?? 0;
  const unreadLabel = `${unread} ${unread === 1 ? "mensagem não lida" : "mensagens não lidas"}`;
  const deliveryStatus = operational?.deliveryStatus?.toUpperCase();
  const deliveryLabel = deliveryStatus ? deliveryLabels[deliveryStatus] : null;
  const deliveryFailed = deliveryStatus === "FAILED" || deliveryStatus === "ERROR";
  const deliveryPending =
    deliveryStatus &&
    ["PENDING", "QUEUED", "SENDING", "PROCESSING", "UNKNOWN"].includes(deliveryStatus);

  return (
    <li
      className={`w-full list-none rounded-xl border border-l-4 border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 ${compact ? "px-3 py-2" : "p-3"}`}
      style={{ borderLeftColor: operational?.slaBreached ? "#dc2626" : config.color }}
    >
      <article aria-label={`${title}, ${status ? statusLabels[status] : config.label}`}>
        {/* Actions sit on the title line (CSS order keeps the DOM order); the compact list
            puts all three blocks on one line on wide screens. */}
        <div
          className={`flex min-w-0 flex-wrap items-start gap-x-3 gap-y-2 ${compact ? "xl:flex-nowrap xl:items-center" : ""}`}
        >
          <div
            className={`order-1 flex min-w-0 flex-1 gap-3 ${compact ? "xl:w-64 xl:flex-none" : ""}`}
          >
            <Avatar
              alt=""
              src={imageUrl || undefined}
              sx={{ width: compact ? 36 : 44, height: compact ? 36 : 44, flexShrink: 0 }}
            >
              {type === "internal-group" ? (
                <GroupIcon fontSize="small" />
              ) : (
                title.charAt(0).toUpperCase()
              )}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="min-w-0 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </h3>
                {!compact && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{config.label}</span>
                )}
              </div>
              <p
                className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400"
                title={[userName, sectorName].filter(Boolean).join(" · ")}
              >
                {userName || "Sem atendente"}
                {sectorName && ` · ${sectorName}`}
              </p>
            </div>
          </div>

          <div
            className={`order-3 min-w-0 basis-full space-y-1 ${compact ? "xl:order-2 xl:flex-1 xl:basis-0" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip
                size="small"
                label={status ? statusLabels[status] : config.label}
                color={
                  status === "waiting_agent"
                    ? "warning"
                    : status === "finished"
                      ? "default"
                      : "primary"
                }
                variant="outlined"
              />
              {operational?.slaBreached && <Chip size="small" color="error" label="Fora do SLA" />}
              {operational?.channel && (
                <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                  {operational.channel}
                </span>
              )}
              {deliveryLabel && (
                <Chip
                  size="small"
                  variant="outlined"
                  color={deliveryFailed ? "error" : deliveryPending ? "warning" : "default"}
                  label={deliveryLabel}
                />
              )}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <p
                className="min-w-0 truncate text-sm text-slate-600 dark:text-slate-300"
                title={operational?.lastMessagePreview || undefined}
              >
                {operational?.lastMessagePreview ||
                  (type === "schedule" ? "Conversa agendada" : "Prévia da mensagem indisponível")}
              </p>
              {unread > 0 && (
                <span
                  title={unreadLabel}
                  className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold tabular-nums leading-none text-white"
                >
                  <span aria-hidden="true">{unread > 99 ? "99+" : unread}</span>
                  <span className="sr-only">{unreadLabel}</span>
                </span>
              )}
            </div>
            {(waitTime || lastMessageAt) && (
              <p className="flex flex-wrap items-center gap-x-3 text-xs">
                {waitTime && (
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${operational?.slaBreached ? "text-red-600 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}
                  >
                    <AccessTimeIcon sx={{ fontSize: 14 }} /> Aguardando há {waitTime}
                  </span>
                )}
                {lastMessageAt && (
                  <span className="text-slate-500 dark:text-slate-400">
                    Última mensagem:{" "}
                    <time dateTime={operational?.lastMessageAt || undefined}>{lastMessageAt}</time>
                  </span>
                )}
              </p>
            )}
          </div>

          <div
            className={`order-2 flex shrink-0 items-center gap-1 ${compact ? "xl:order-3 xl:ml-auto" : ""}`}
          >
            {handleView && (
              <Tooltip title="Visualizar conversa" arrow>
                <IconButton
                  aria-label={`Visualizar conversa de ${title}`}
                  onClick={handleView}
                  size="small"
                  color="primary"
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {handleTransfer && (
              <Tooltip title="Transferir atendimento" arrow>
                <IconButton
                  aria-label={`Transferir atendimento de ${title}`}
                  onClick={handleTransfer}
                  size="small"
                  color="primary"
                >
                  <SyncAltIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {handleFinish && (
              <Tooltip title="Finalizar atendimento" arrow>
                <IconButton
                  aria-label={`Finalizar atendimento de ${title}`}
                  onClick={handleFinish}
                  size="small"
                  color="success"
                >
                  <AssignmentTurnedInIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </div>

        {!compact && (
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {contactNumber && <span>Telefone: {contactNumber}</span>}
            {customerName && <span>Cliente: {customerName}</span>}
            {customerDocument && <span>Documento: {customerDocument}</span>}
            {type === "internal-group" && (
              <span>
                {participants?.length || 0} participantes
                {groupDescription ? ` · ${groupDescription}` : ""}
              </span>
            )}
            {startDate && <span>Início: {startDate}</span>}
            {endDate && <span>Fim: {endDate}</span>}
          </div>
        )}
        {(isScheduled || type === "schedule") && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-700 dark:text-amber-300">
            <span className="inline-flex items-center gap-1">
              <AccessTimeIcon sx={{ fontSize: 14 }} /> Agendado para:{" "}
              {scheduledFor || "Data não informada"}
            </span>
            {!compact && scheduledAt && <span>Criado em: {scheduledAt}</span>}
          </div>
        )}
      </article>
    </li>
  );
}
