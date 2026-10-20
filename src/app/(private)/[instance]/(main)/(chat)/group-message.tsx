import { MessageMentionEntity, MessageReaction, WppMessageStatus } from "@/lib/sdk-local";
import MessageMentionText from "@/lib/components/message-mention-text";
import { Checkbox, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import React, { ReactNode, useMemo, useState } from "react";
import { liStyleVariants, msgStyleVariants, QuotedMessageProps, statusComponents } from "./message";
import MessageFile from "./message-file";
import VCardMessage from "./vcard-message";
import MessageReactions from "./message-reactions";
import { UiIcon } from "@/lib/ui-system/icons";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import { Copy, CornerUpLeft, Forward, Pencil, Square, RotateCcw } from "lucide-react";

interface MessageProps {
  mentionEntities?: MessageMentionEntity[];
  id: number | string;
  style: "received" | "sent" | "system";
  sentBy: string;
  groupFirst: boolean;
  text: string;
  type: string;
  date: Date;
  status?: WppMessageStatus | null;
  sendStatus?: ReactNode;
  fileId?: number | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: string | null;
  quotedMessage?: QuotedMessageProps | null;
  onQuote?: () => void;
  mentionNameMap?: Map<string, string>;
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
  onSelect?: (id: number | string) => void;
  onForward?: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
  /** Reenvio ao grupo do WhatsApp; exibido apenas quando `status === "ERROR"`. */
  onRetry?: () => void;
  styleWrapper?: React.CSSProperties;
}

export default function GroupMessage({
  id,
  style,
  text,
  mentionEntities,
  type,
  date,
  status,
  sendStatus,
  fileId,
  fileName,
  fileType,
  fileSize,
  groupFirst,
  sentBy,
  quotedMessage,
  onQuote,
  isForwarded = false,
  mentionNameMap,
  isForwardMode,
  isReadOnly = false,
  showMediaByDefault,
  showQuotedMediaByDefault,
  isSelected,
  isEdited,
  reaction,
  reactions,
  onReaction,
  onSelect,
  onForward,
  onCopy,
  onEdit,
  onRetry,
  styleWrapper,
}: MessageProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

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

  const handleSelect = () => {
    onSelect?.(id);
    handleMenuClose();
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
    } else {
      navigator.clipboard.writeText(text);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    onEdit?.();
    handleMenuClose();
  };

  const canRetry = status === "ERROR" && !!onRetry;
  const handleRetry = () => {
    onRetry?.();
    handleMenuClose();
  };

  const dateText = useMemo(() => {
    return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }, [date]);

  return (
    <li
      id={String(id)}
      className={`ip-message-row w-full ${liStyleVariants[style]} group flex items-center gap-2 transition-colors duration-200 ${isSelected ? "is-selected bg-blue-500/10" : ""}`}
      onClick={isForwardMode ? () => onSelect?.(id) : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!isForwardMode && !isReadOnly) handleMenuClick(e);
      }}
      style={styleWrapper}
    >
      {isForwardMode && style !== "system" && (
        <Checkbox
          checked={isSelected}
          onChange={() => onSelect?.(id)}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div
        className={`ip-message-bubble ip-message-bubble--${style} flex flex-col items-center gap-2 p-2 ${msgStyleVariants[style]} w-max max-w-[66%] rounded-md`}
      >
        <div className="flex w-full flex-col gap-1">
          {quotedMessage && (
            <div
              className={`ip-message-quote mt-2 flex w-full flex-col gap-1 rounded-lg border-l-2 bg-white/20 p-2 dark:bg-slate-300/40 ${
                quotedMessage.style === "sent" ? "border-indigo-600" : "border-orange-600"
              }`}
            >
              <h2>{quotedMessage.style === "sent" ? "Você" : quotedMessage.author || ""}</h2>
              <div className="ip-message-text h-full w-full rounded-md p-4 text-black dark:text-slate-200">
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
                  fileSize={0 || ""}
                  showMediaByDefault={showQuotedMediaByDefault}
                />
              )}
            </div>
          )}

          {groupFirst && <h2 className="ip-message-sender text-xs font-semibold">{sentBy}</h2>}
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
              showMediaByDefault={showMediaByDefault}
            />
          )}
          <div className="ip-message-text w-full text-slate-900 dark:text-slate-200">
            {type === "vcard" ? (
              <VCardMessage vCardString={text} /> // vCard mantém o texto original
            ) : (
              <MessageMentionText text={text} mentionEntities={mentionEntities} />
            )}
          </div>
          <MessageReactions
            identity={`internal:${id}`}
            reactions={reactions}
            legacyReaction={reaction}
            actorNames={mentionNameMap}
          />
          <div className="ip-message-metadata flex items-center gap-2 text-[0.65rem] text-slate-600 dark:text-slate-400">
            {isEdited && <span>Editada</span>}
            <p>{dateText}</p>
            {style !== "system" && (sendStatus ?? (status && statusComponents[status]))}
            {style !== "system" && canRetry && (
              <button
                type="button"
                className="inline-flex items-center gap-0.5 rounded px-1 font-semibold text-red-600 hover:bg-red-500/10 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 dark:text-red-300"
                aria-label="Reenviar para o grupo do WhatsApp"
                title="Reenviar para o grupo do WhatsApp"
                onClick={(event) => {
                  event.stopPropagation();
                  onRetry?.();
                }}
              >
                <UiIcon icon={RotateCcw} scale="metadata" />
                Reenviar
              </button>
            )}
          </div>
        </div>
      </div>

      {style !== "system" && !isForwardMode && !isReadOnly && (
        <div className="flex shrink-0 flex-col items-center">
          <OperationalIconButton
            label={`Mais opções da mensagem de ${sentBy} em ${dateText}`}
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
            identity={`internal:${id}`}
            reactions={reactions}
            showReactions={false}
            onChange={onReaction}
          />
          <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
            {canRetry && (
              <MenuItem onClick={handleRetry}>
                <ListItemIcon>
                  <UiIcon icon={RotateCcw} />
                </ListItemIcon>
                <ListItemText>Reenviar</ListItemText>
              </MenuItem>
            )}
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
            {onForward && (
              <MenuItem onClick={handleForward}>
                <ListItemIcon>
                  <UiIcon icon={Forward} />
                </ListItemIcon>
                <ListItemText>Encaminhar</ListItemText>
              </MenuItem>
            )}
            {onEdit && (
              <MenuItem onClick={handleEdit}>
                <ListItemIcon>
                  <UiIcon icon={Pencil} />
                </ListItemIcon>
                <ListItemText>Editar</ListItemText>
              </MenuItem>
            )}
            <MenuItem onClick={handleCopy}>
              <ListItemIcon>
                <UiIcon icon={Copy} />
              </ListItemIcon>
              <ListItemText>Copiar texto original</ListItemText>
            </MenuItem>
          </Menu>
        </div>
      )}
    </li>
  );
}
