import { MessageMentionEntity, MessageReaction, WppMessageStatus } from "@/lib/sdk-local";
import MessageMentionText from "@/lib/components/message-mention-text";
import { Checkbox, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import React, { ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWhatsappSession } from "../../whatsapp-session-context";
import MessageFile from "./message-file";
import VCardMessage from "./vcard-message";
import MessageReactions from "./message-reactions";
import { UiIcon } from "@/lib/ui-system/icons";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import {
  CheckCheck,
  Check,
  Clock3,
  CircleAlert,
  Download,
  Trash2,
  Copy,
  CornerUpLeft,
  Forward,
  Pencil,
  Square,
  Bot,
} from "lucide-react";

export interface QuotedMessageProps {
  mentionEntities?: MessageMentionEntity[];
  id: number | string;
  style: "received" | "sent" | "system" | "thirdparty";
  text: string;
  fileId?: number | null;
  fileType?: string | null;
  fileName?: string | null;
  author?: string | null;
}

export interface MessageProps {
  mentionEntities?: MessageMentionEntity[];
  id: number | string;
  style: "received" | "sent" | "system" | "thirdparty";
  text: string;
  type: string;
  date: Date;
  status?: WppMessageStatus | null;
  sendError?: string | null;
  sendStatus?: ReactNode;
  fileId?: number | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: string | null;
  quotedMessage?: QuotedMessageProps | null;
  onQuote?: () => void;
  isForwarded?: boolean;
  isForwardMode?: boolean;
  isReadOnly?: boolean;
  showMediaByDefault?: boolean;
  showQuotedMediaByDefault?: boolean;
  isSelected?: boolean;
  isEdited?: boolean;
  reaction?: string;
  reactions?: MessageReaction[];
  onReaction?: (emoji: string) => Promise<unknown>;
  channelId?: number | null;
  agentId?: number | null;
  onSelect?: (id: number | string) => void;
  onForward?: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
}

export const msgStyleVariants = {
  received: "bg-slate-50 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-bl-none",
  sent: "bg-green-200 text-slate-800 dark:bg-green-800 dark:text-slate-200 rounded-br-none",
  system: "bg-yellow-200 text-slate-800 dark:bg-yellow-800 dark:text-white",
  thirdparty: "bg-red-50 text-slate-900 dark:bg-red-900 dark:text-slate-100 border-red-500 border",
  agent: "bg-violet-100 text-slate-800 dark:bg-violet-900 dark:text-slate-100 rounded-br-none",
};

export const liStyleVariants = {
  received: "flex-row",
  sent: "flex-row-reverse",
  system: "flex-row justify-center",
  thirdparty: "flex-row-reverse",
};

export const statusComponents: Record<WppMessageStatus, ReactNode> = {
  PENDING: (
    <Tooltip title="Enviando…">
      <UiIcon
        icon={Clock3}
        scale="metadata"
        aria-label="Enviando…"
        style={{ color: "var(--ip-muted)" }}
      />
    </Tooltip>
  ),
  UNKNOWN: (
    <Tooltip title="Ainda sem confirmação de envio">
      <UiIcon
        icon={Clock3}
        scale="metadata"
        aria-label="Ainda sem confirmação de envio"
        style={{ color: "var(--ip-warning)" }}
      />
    </Tooltip>
  ),
  SENT: <UiIcon icon={Check} scale="metadata" aria-label="Enviada" />,
  RECEIVED: <UiIcon icon={CheckCheck} scale="metadata" aria-label="Entregue" />,
  READ: (
    <UiIcon
      icon={CheckCheck}
      scale="metadata"
      aria-label="Lida"
      style={{ color: "var(--ip-accent)" }}
    />
  ),
  DOWNLOADED: (
    <UiIcon
      icon={Download}
      scale="metadata"
      aria-label="Baixada"
      style={{ color: "var(--ip-accent)" }}
    />
  ),
  ERROR: (
    <Tooltip title="Falha no envio">
      <UiIcon
        icon={CircleAlert}
        scale="metadata"
        aria-label="Falha no envio"
        style={{ color: "var(--ip-danger)" }}
      />
    </Tooltip>
  ),
  REVOKED: <UiIcon icon={Trash2} scale="metadata" aria-label="Removida" />,
};

function Message({
  id,
  style,
  type,
  text,
  mentionEntities,
  date,
  status,
  sendError,
  sendStatus,
  fileId,
  fileName,
  fileType,
  fileSize,
  quotedMessage,
  onQuote,
  isEdited = false,
  reaction,
  reactions,
  onReaction,
  isForwarded = false,
  isForwardMode = false,
  isReadOnly = false,
  showMediaByDefault,
  showQuotedMediaByDefault,
  isSelected = false,
  channelId,
  agentId,
  onSelect,
  onForward,
  onCopy,
  onEdit,
}: MessageProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const { parameters, channels } = useWhatsappSession();

  const channelName = useMemo(() => {
    if (!channelId || channels.length <= 1) return null;
    const channel = channels.find((c) => c.id === channelId);
    return channel?.name || null;
  }, [channelId, channels]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleQuote = () => {
    onQuote?.();
    handleMenuClose();
  };
  const handleForward = () => {
    onForward?.();
    handleMenuClose();
  };
  const handleCopy = () => {
    onCopy?.();
    handleMenuClose();
  };

  const handleSelect = () => {
    onSelect?.(id);
    handleMenuClose();
  };

  const handleEdit = () => {
    onEdit?.();
    handleMenuClose();
  };

  const dateText = useMemo(() => {
    return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }, [date]);

  const isMessageFromToday = useMemo(() => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }, [date]);

  const isOfficial = parameters["is_official"] === "true";
  const isAgentMessage = !!agentId && style === "sent";
  const bubbleVariant = isAgentMessage ? "agent" : style;

  return (
    <li
      id={String(id)}
      className={`ip-message-row w-full ${liStyleVariants[style]} group flex items-center gap-2 transition-colors duration-200 ${isSelected ? "is-selected bg-blue-500/10" : ""}`}
      onClick={isForwardMode ? () => onSelect?.(id) : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!isForwardMode && !isReadOnly) handleMenuClick(e);
      }}
    >
      {isForwardMode && style !== "system" && (
        <Checkbox
          checked={isSelected}
          onChange={() => onSelect?.(id)}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div
        className={`ip-message-bubble ip-message-bubble--${bubbleVariant} flex w-max max-w-[86%] flex-col items-center gap-2 rounded-md p-2 sm:max-w-[76%] lg:max-w-[66%] ${msgStyleVariants[bubbleVariant]}`}
      >
        {isAgentMessage && (
          <div className="flex w-full">
            <Tooltip title="Mensagem enviada automaticamente pelo agente de IA">
              <span className="ip-message-sender inline-flex items-center gap-1">
                <UiIcon icon={Bot} scale="metadata" />
                Agente virtual
              </span>
            </Tooltip>
          </div>
        )}

        {quotedMessage && (
          <div
            className={`ip-message-quote mt-2 flex w-full flex-col gap-1 rounded-lg border-l-2 bg-white/50 p-2 dark:bg-slate-300/40 ${
              quotedMessage.style === "sent"
                ? "border-indigo-600 dark:border-indigo-400"
                : "border-orange-600 dark:border-orange-400"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              const quotedElement = document.getElementById(String(quotedMessage.id));
              if (quotedElement) {
                quotedElement.scrollIntoView({ behavior: "smooth", block: "center" });
                quotedElement.classList.add("bg-indigo-500/5");
                setTimeout(() => {
                  quotedElement?.classList.remove("bg-indigo-500/5");
                }, 2000);
              }
            }}
          >
            <h2
              className={`${quotedMessage.style === "sent" ? "text-indigo-800 dark:text-indigo-200" : "text-slate-800 dark:text-orange-200"}`}
            >
              {quotedMessage.style === "sent" ? "Você" : quotedMessage.author || ""}
            </h2>
            <div className="ip-message-text h-full w-full rounded-md px-3 py-1 text-black dark:text-slate-200">
              <MessageMentionText
                text={quotedMessage.text}
                mentionEntities={quotedMessage.mentionEntities}
              />
            </div>
            {quotedMessage.fileId && (
              <MessageFile
                fileId={quotedMessage.fileId}
                fileName={quotedMessage.fileName || ""}
                fileType={quotedMessage.fileType || ""}
                fileSize={fileSize || ""}
                showMediaByDefault={showQuotedMediaByDefault ?? isMessageFromToday}
              />
            )}
          </div>
        )}

        <div className="flex w-full flex-col gap-0.5">
          {isForwarded && (
            <div className="flex items-center gap-1.5 opacity-75">
              <UiIcon icon={Forward} scale="metadata" />
              <span className="text-xs font-semibold">Encaminhada</span>
            </div>
          )}

          {fileId && (
            <MessageFile
              fileId={fileId}
              fileName={fileName || ""}
              fileType={fileType || ""}
              fileSize={fileSize || ""}
              showMediaByDefault={showMediaByDefault ?? isMessageFromToday}
            />
          )}
          <div className="ip-message-text w-full text-slate-900 dark:text-slate-200">
            {type === "vcard" ? (
              <VCardMessage vCardString={text} />
            ) : (
              <MessageMentionText text={text} mentionEntities={mentionEntities} />
            )}
          </div>
          <MessageReactions
            identity={`wpp:${channelId}:${id}`}
            reactions={reactions}
            legacyReaction={reaction}
          />
          <div className="ip-message-metadata flex items-center gap-2 text-[0.65rem] text-slate-600 dark:text-slate-400">
            {channelName && <span>{channelName}</span>}
            {isEdited && <span>Editada</span>}
            <p>{dateText}</p>
            {style !== "system" &&
              (sendStatus ??
                (status &&
                  (sendError && (status === "ERROR" || status === "UNKNOWN") ? (
                    <Tooltip title={sendError} arrow>
                      <span tabIndex={0} role="img" aria-label={sendError} className="inline-flex">
                        {status === "ERROR" ? (
                          <UiIcon
                            icon={CircleAlert}
                            scale="metadata"
                            style={{ color: "var(--ip-danger)" }}
                          />
                        ) : (
                          <UiIcon
                            icon={Clock3}
                            scale="metadata"
                            style={{ color: "var(--ip-warning)" }}
                          />
                        )}
                      </span>
                    </Tooltip>
                  ) : (
                    statusComponents[status]
                  ))))}
          </div>
        </div>
      </div>

      {style !== "system" && !isForwardMode && !isReadOnly && (
        <div className="flex shrink-0 flex-col items-center">
          <OperationalIconButton
            label={`Mais opções da mensagem de ${dateText}`}
            tooltip="Mais opções"
            aria-haspopup="menu"
            aria-expanded={open}
            size="small"
            title="Mais opções"
            onClick={handleMenuClick}
          >
            <UiIcon name="more" />
          </OperationalIconButton>
          <MessageReactions
            identity={`wpp:${channelId}:${id}`}
            reactions={reactions}
            showReactions={false}
            onChange={onReaction}
          />
          <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
            {onSelect && (
              <MenuItem onClick={handleSelect}>
                <ListItemIcon>
                  <UiIcon icon={Square} />
                </ListItemIcon>
                <ListItemText>Selecionar</ListItemText>
              </MenuItem>
            )}
            {onQuote && (
              <MenuItem onClick={handleQuote}>
                <ListItemIcon>
                  <UiIcon icon={CornerUpLeft} />
                </ListItemIcon>
                <ListItemText>Responder</ListItemText>
              </MenuItem>
            )}
            {!isOfficial && onForward && (
              <MenuItem onClick={handleForward}>
                <ListItemIcon>
                  <UiIcon icon={Forward} />
                </ListItemIcon>
                <ListItemText>Encaminhar</ListItemText>
              </MenuItem>
            )}
            {!isOfficial && onEdit && (
              <MenuItem onClick={handleEdit}>
                <ListItemIcon>
                  <UiIcon icon={Pencil} />
                </ListItemIcon>
                <ListItemText>Editar</ListItemText>
              </MenuItem>
            )}
            {onCopy && (
              <MenuItem onClick={handleCopy}>
                <ListItemIcon>
                  <UiIcon icon={Copy} />
                </ListItemIcon>
                <ListItemText>Copiar texto original</ListItemText>
              </MenuItem>
            )}
          </Menu>
        </div>
      )}
    </li>
  );
}

function areMessagePropsEqual(previous: MessageProps, next: MessageProps) {
  return (
    previous.id === next.id &&
    previous.style === next.style &&
    previous.text === next.text &&
    previous.type === next.type &&
    previous.date.getTime() === next.date.getTime() &&
    previous.status === next.status &&
    previous.fileId === next.fileId &&
    previous.fileName === next.fileName &&
    previous.fileType === next.fileType &&
    previous.fileSize === next.fileSize &&
    previous.isForwarded === next.isForwarded &&
    previous.isForwardMode === next.isForwardMode &&
    previous.isReadOnly === next.isReadOnly &&
    previous.showMediaByDefault === next.showMediaByDefault &&
    previous.showQuotedMediaByDefault === next.showQuotedMediaByDefault &&
    previous.isSelected === next.isSelected &&
    previous.isEdited === next.isEdited &&
    previous.reaction === next.reaction &&
    previous.reactions === next.reactions &&
    previous.mentionEntities === next.mentionEntities &&
    previous.sendError === next.sendError &&
    previous.sendStatus === next.sendStatus &&
    previous.channelId === next.channelId &&
    previous.agentId === next.agentId &&
    previous.quotedMessage?.id === next.quotedMessage?.id &&
    previous.quotedMessage?.text === next.quotedMessage?.text &&
    previous.quotedMessage?.mentionEntities === next.quotedMessage?.mentionEntities &&
    previous.quotedMessage?.author === next.quotedMessage?.author &&
    previous.quotedMessage?.fileId === next.quotedMessage?.fileId &&
    previous.quotedMessage?.fileType === next.quotedMessage?.fileType &&
    previous.quotedMessage?.fileName === next.quotedMessage?.fileName &&
    previous.quotedMessage?.style === next.quotedMessage?.style &&
    previous.onQuote === next.onQuote &&
    previous.onForward === next.onForward &&
    previous.onEdit === next.onEdit &&
    previous.onReaction === next.onReaction &&
    previous.onSelect === next.onSelect &&
    previous.onCopy === next.onCopy
  );
}

const MemoizedMessage = React.memo(Message, areMessagePropsEqual);

export default function MessageWithCurrentActions(props: MessageProps) {
  const actions = useRef(props);
  useLayoutEffect(() => {
    actions.current = props;
  });
  // Message rows receive fresh closures whenever the conversation changes. Keep
  // their actions current without rendering every unchanged message in a burst.
  const onQuote = useCallback(() => actions.current.onQuote?.(), []);
  const onForward = useCallback(() => actions.current.onForward?.(), []);
  const onEdit = useCallback(() => actions.current.onEdit?.(), []);
  const onCopy = useCallback(() => actions.current.onCopy?.(), []);
  const onSelect = useCallback((id: number | string) => actions.current.onSelect?.(id), []);
  const onReaction = useCallback(async (emoji: string) => actions.current.onReaction?.(emoji), []);

  return (
    <MemoizedMessage
      {...props}
      onQuote={props.onQuote ? onQuote : undefined}
      onForward={props.onForward ? onForward : undefined}
      onEdit={props.onEdit ? onEdit : undefined}
      onCopy={props.onCopy ? onCopy : undefined}
      onSelect={props.onSelect ? onSelect : undefined}
      onReaction={props.onReaction ? onReaction : undefined}
    />
  );
}
