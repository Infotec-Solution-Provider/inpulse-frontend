"use client";

import { Clock3, CheckCircle2, Users, ArrowRightLeft, Eye, MoreHorizontal } from "lucide-react";
import {
  Avatar,
  Button,
  Chip,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { useEffect, useId, useRef, useState } from "react";
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
  onMenuOpenChange?: (open: boolean) => void;
}

const typeLabels = {
  "external-chat": "Atendimento",
  "finished-chat": "Finalizado",
  "internal-chat": "Conversa interna",
  "internal-group": "Grupo interno",
  schedule: "Agendamento",
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
  onMenuOpenChange,
}: MonitorCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = useRef(false);
  useEffect(
    () => () => {
      // Release only the interlock owned by this card when its row is removed.
      if (menuOpen.current) onMenuOpenChange?.(false);
    },
    [onMenuOpenChange],
  );
  const openMenu = (anchor: HTMLElement) => {
    menuOpen.current = true;
    onMenuOpenChange?.(true);
    setMenuAnchor(anchor);
  };
  const closeMenu = () => {
    menuOpen.current = false;
    setMenuAnchor(null);
    onMenuOpenChange?.(false);
  };
  const menuId = useId();
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
      className={`ip-result-card w-full min-w-0 list-none rounded-xl border ${compact ? "p-3" : "p-4"}`}
      style={{
        borderColor: "var(--ip-border)",
        background: "var(--ip-surface)",
        color: "var(--ip-text)",
      }}
    >
      <article aria-label={`${title}, ${status ? statusLabels[status] : typeLabels[type]}`}>
        <div
          className={`grid min-w-0 gap-3 ${compact ? "lg:grid-cols-[minmax(160px,1.2fr)_minmax(110px,.8fr)_minmax(200px,1.4fr)_auto] lg:items-center" : "sm:grid-cols-[minmax(0,1fr)_auto]"}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              alt=""
              src={imageUrl || undefined}
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                bgcolor: "var(--ip-accent-soft)",
                color: "var(--ip-accent)",
                fontSize: 14,
              }}
            >
              {type === "internal-group" ? <Users size={17} /> : title.charAt(0).toUpperCase()}
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-sm font-semibold" title={title}>
                {title}
              </h3>
              <p
                className="ip-muted mt-0.5 truncate text-xs"
                title={contactNumber || typeLabels[type]}
              >
                {contactNumber || typeLabels[type]}
              </p>
            </div>
          </div>
          <div className={`min-w-0 ${compact ? "" : "sm:col-start-1"}`}>
            <p className="truncate text-sm font-medium" title={userName || undefined}>
              {userName || "Sem atendente"}
            </p>
            <p className="ip-muted mt-0.5 truncate text-xs">
              {sectorName || "Setor não informado"}
            </p>
          </div>
          <div className={`min-w-0 space-y-1.5 ${compact ? "" : "sm:col-span-2"}`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip
                size="small"
                label={status ? statusLabels[status] : typeLabels[type]}
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
                <span className="ip-muted text-xs">{operational.channel}</span>
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
            <p
              className="ip-muted truncate text-xs"
              title={operational?.lastMessagePreview || undefined}
            >
              {operational?.lastMessagePreview ||
                (type === "schedule" ? "Conversa agendada" : "Prévia da mensagem indisponível")}
            </p>
            {(waitTime || lastMessageAt || unread > 0) && (
              <p className="ip-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {waitTime && (
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${operational?.slaBreached ? "text-[var(--ip-danger)]" : "text-[var(--ip-warning)]"}`}
                  >
                    <Clock3 size={13} aria-hidden="true" />
                    Aguardando há {waitTime}
                  </span>
                )}
                {(lastMessageAt || unread > 0) && (
                  <span
                    className="inline-flex items-center gap-1.5"
                    title={unread > 0 ? unreadLabel : undefined}
                  >
                    {lastMessageAt && (
                      <time
                        dateTime={operational?.lastMessageAt || undefined}
                        className={unread > 0 ? "font-semibold text-[var(--ip-danger)]" : ""}
                      >
                        Última mensagem: {lastMessageAt}
                      </time>
                    )}
                    {unread > 0 && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--ip-danger)]">
                        <span className="sr-only">{unreadLabel}</span>
                      </span>
                    )}
                  </span>
                )}
              </p>
            )}
          </div>
          <div
            className={`flex min-w-0 items-center justify-end gap-1 ${compact ? "lg:col-start-4 lg:row-start-1" : "sm:col-start-2 sm:row-span-2 sm:row-start-1"}`}
          >
            {handleView && (
              <Button
                variant="outlined"
                size="small"
                aria-label={`Visualizar conversa de ${title}`}
                onClick={handleView}
                startIcon={<Eye size={15} />}
              >
                Visualizar
              </Button>
            )}
            {(handleTransfer || handleFinish) && (
              <>
                <Tooltip title="Mais ações">
                  <IconButton
                    aria-label={`Mais ações de ${title}`}
                    aria-haspopup="menu"
                    aria-expanded={Boolean(menuAnchor)}
                    aria-controls={menuAnchor ? menuId : undefined}
                    onClick={(event) => openMenu(event.currentTarget)}
                    size="small"
                  >
                    <MoreHorizontal size={19} />
                  </IconButton>
                </Tooltip>
                <Menu
                  id={menuId}
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={closeMenu}
                >
                  {handleTransfer && (
                    <MenuItem
                      aria-label={`Transferir atendimento de ${title}`}
                      onClick={() => {
                        closeMenu();
                        handleTransfer();
                      }}
                    >
                      <ListItemIcon>
                        <ArrowRightLeft size={16} />
                      </ListItemIcon>
                      Transferir atendimento
                    </MenuItem>
                  )}
                  {handleFinish && (
                    <MenuItem
                      aria-label={`Finalizar atendimento de ${title}`}
                      onClick={() => {
                        closeMenu();
                        handleFinish();
                      }}
                    >
                      <ListItemIcon>
                        <CheckCircle2 size={16} />
                      </ListItemIcon>
                      Finalizar atendimento
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
          </div>
        </div>
        {!compact && (
          <div
            className="ip-muted mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-xs"
            style={{ borderColor: "var(--ip-border)" }}
          >
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
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ip-warning)]">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={14} aria-hidden="true" />
              Agendado para: {scheduledFor || "Data não informada"}
            </span>
            {!compact && scheduledAt && <span>Criado em: {scheduledAt}</span>}
          </div>
        )}
      </article>
    </li>
  );
}
