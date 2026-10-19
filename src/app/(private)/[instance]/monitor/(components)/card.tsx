"use client";

import { Clock3, CheckCircle2, Users, ArrowRightLeft, Eye, MoreHorizontal } from "lucide-react";
import { Avatar, ListItemIcon, Menu, MenuItem } from "@mui/material";
import { OperationalIconButton } from "@/lib/ui-system";
import formatCpfCnpj from "@/lib/utils/format-cnpj";
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
  const companyName =
    customerName &&
    customerName.trim().toLocaleLowerCase("pt-BR") !== title.trim().toLocaleLowerCase("pt-BR")
      ? customerName
      : null;
  const documentValue =
    customerDocument && customerDocument !== "Documento não informado"
      ? formatCpfCnpj(customerDocument.trim())
      : null;
  const scheduleLabel =
    isScheduled || type === "schedule"
      ? `Agendado para: ${scheduledFor || "Data não informada"}`
      : null;
  const operationalDescription =
    status === "waiting_agent"
      ? waitTime
        ? `Cliente aguarda há ${waitTime}`
        : "Cliente aguarda resposta"
      : status === "waiting_customer"
        ? waitTime
          ? `Aguardando cliente há ${waitTime}`
          : "Aguardando cliente"
        : status === "scheduled" || type === "schedule"
          ? scheduleLabel || "Agendado"
          : status
            ? statusLabels[status]
            : typeLabels[type];

  return (
    <li
      className={`ip-result-card ip-conversation-card ${compact ? "ip-conversation-card--compact" : "ip-conversation-card--expanded"}`}
    >
      <article aria-label={`${title}, ${status ? statusLabels[status] : typeLabels[type]}`}>
        <div className="ip-conversation-grid">
          <div className="ip-conversation-identity">
            <Avatar
              alt=""
              src={imageUrl || undefined}
              sx={{
                width: 32,
                height: 32,
                flexShrink: 0,
                bgcolor: "var(--ip-accent-soft)",
                color: "var(--ip-accent)",
                fontSize: 14,
              }}
            >
              {type === "internal-group" ? <Users size={17} /> : title.charAt(0).toUpperCase()}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="ip-conversation-title">
                <h3 title={title}>{title}</h3>
                {unread > 0 && (
                  <span className="ip-conversation-unread" title={unreadLabel}>
                    <span className="sr-only">{unreadLabel}</span>
                  </span>
                )}
              </div>
              {companyName && (
                <p className="ip-conversation-company" title={companyName}>
                  <span className="sr-only">Cliente: </span>
                  {companyName}
                </p>
              )}
              <div className="ip-conversation-contact">
                {contactNumber && <span title={`Telefone: ${contactNumber}`}>{contactNumber}</span>}
                {documentValue && (
                  <span title={`CPF/CNPJ: ${documentValue}`}>
                    <span className="sr-only">CPF/CNPJ: </span>
                    {documentValue}
                  </span>
                )}
                {!contactNumber && !documentValue && !companyName && (
                  <span>{typeLabels[type]}</span>
                )}
              </div>
            </div>
          </div>
          <div className="ip-conversation-owner">
            <p className="truncate text-sm font-medium" title={userName || undefined}>
              {userName || "Sem atendente"}
            </p>
            <p className="ip-muted mt-0.5 truncate text-xs">
              {sectorName || "Setor não informado"}
            </p>
          </div>
          <div className="ip-conversation-activity">
            <p
              className="ip-muted ip-conversation-message"
              title={
                [
                  operational?.lastMessagePreview,
                  lastMessageAt ? `Última mensagem: ${lastMessageAt}` : null,
                  operational?.channel,
                ]
                  .filter(Boolean)
                  .join("\n") || undefined
              }
            >
              {operational?.lastMessagePreview ||
                (type === "schedule" ? "Conversa agendada" : "Prévia da mensagem indisponível")}
            </p>
            <p className="ip-conversation-operation">
              <span className="ip-conversation-status">
                {waitTime && <Clock3 size={12} aria-hidden="true" />}
                {operationalDescription}
              </span>
              {operational?.slaBreached && (
                <span className="ip-conversation-alert">Fora do SLA</span>
              )}
              {deliveryLabel && (
                <span
                  className={
                    deliveryFailed
                      ? "ip-conversation-alert"
                      : deliveryPending
                        ? "ip-conversation-delivery-pending"
                        : "ip-muted"
                  }
                >
                  {deliveryLabel}
                </span>
              )}
            </p>
            {(lastMessageAt || operational?.channel) && (
              <p
                className={`ip-muted ip-conversation-metadata ${compact ? "ip-conversation-metadata--compact" : ""}`}
              >
                {operational?.channel && <span>{operational.channel}</span>}
                {lastMessageAt && (
                  <time dateTime={operational?.lastMessageAt || undefined}>
                    Última mensagem: {lastMessageAt}
                  </time>
                )}
              </p>
            )}
          </div>
          <div className="ip-conversation-actions">
            {handleView && (
              <OperationalIconButton
                label={`Visualizar conversa de ${title}`}
                tooltip="Visualizar conversa"
                onClick={handleView}
              >
                <Eye size={18} />
              </OperationalIconButton>
            )}
            {(handleTransfer || handleFinish) && (
              <>
                <OperationalIconButton
                  label={`Mais ações de ${title}`}
                  tooltip="Mais ações"
                  aria-haspopup="menu"
                  aria-expanded={Boolean(menuAnchor)}
                  aria-controls={menuAnchor ? menuId : undefined}
                  onClick={(event) => openMenu(event.currentTarget)}
                >
                  <MoreHorizontal size={19} />
                </OperationalIconButton>
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
            className="ip-muted ip-conversation-details mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-xs"
            style={{ borderColor: "var(--ip-border)" }}
          >
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
        {scheduleLabel &&
          (operationalDescription !== scheduleLabel || (!compact && scheduledAt)) && (
            <div className="ip-muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {operationalDescription !== scheduleLabel && <span>{scheduleLabel}</span>}
              {!compact && scheduledAt && <span>Criado em: {scheduledAt}</span>}
            </div>
          )}
      </article>
    </li>
  );
}
