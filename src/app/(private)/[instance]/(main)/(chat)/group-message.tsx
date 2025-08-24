import { WppMessageStatus } from "@in.pulse-crm/sdk";
import MessageFile from "./message-file";
import {
  liStyleVariants,
  msgStyleVariants,
  QuotedMessageProps,
  statusComponents,
} from "./message";
import LinkifiedText from "./linkmessage";
import ReplyIcon from "@mui/icons-material/Reply";
import ForwardIcon from '@mui/icons-material/Forward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import React, { useState } from "react";
import { IconButton, Checkbox, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import VCardMessage from "./vcard-message";

interface MessageProps {
  id: number;
  style: "received" | "sent" | "system";
  sentBy: string;
  groupFirst: boolean;
  text: string;
  type: string;
  date: Date;
  status?: WppMessageStatus | null;
  fileId?: number | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: string | null;
  quotedMessage?: QuotedMessageProps | null;
  onQuote?: () => void;
  mentionNameMap?: Map<string, string>;
  isForwarded?: boolean;
  isForwardMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  onForward?: () => void;
  onCopy?: () => void;
  styleWrapper?: React.CSSProperties;
}

export default function GroupMessage({
  id,
  style,
  text,
  type,
  date,
  status,
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
  isSelected,
  onSelect,
  onForward,
  onCopy,
  styleWrapper
}: MessageProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleQuote = () => { onQuote?.(); handleMenuClose(); };
    const handleForward = () => { onForward?.(); handleMenuClose(); };

    const handleSelect = () => {
        onSelect?.(id);
        handleMenuClose();
    };

  const handleCopy = () => {
    const contentToCopy = quotedMessage
      ? `${quotedMessage.author || ''}: ${quotedMessage.text}\n\n${text}`
      : text;

    if (onCopy) {
      onCopy();
    } else {
      navigator.clipboard.writeText(contentToCopy);
    }
  };

  const visualText = text.replace(/@(\d{8,15})/g, (_, phone) => {
    const clean = phone.replace(/\D/g, "");
    const name = mentionNameMap?.get(clean);
    return name ? `@${name}` : `@${phone}`;
  });

  return (
        <li
            id={String(id)}
            className={`w-full ${liStyleVariants[style]} group flex items-center gap-2 transition-colors duration-200 ${isSelected ? 'bg-blue-500/10' : ''}`}
            onClick={isForwardMode ? () => onSelect?.(id) : undefined}
            onContextMenu={(e) => {
                e.preventDefault();
                if (!isForwardMode) handleMenuClick(e);
            }}
        >
            {isForwardMode && style !== 'system' && (
                <Checkbox
                    checked={isSelected}
                    onChange={() => onSelect?.(id)}
                    onClick={(e) => e.stopPropagation()}
                />
            )}

      <div className={`flex flex-col items-center gap-2 p-2 ${msgStyleVariants[style]} w-max max-w-[66%] rounded-md`}>
        <div className="flex w-full flex-col gap-1">
          {quotedMessage && (
            <div
              className={`flex w-full flex-col gap-1 rounded-lg mt-2 border-l-2 bg-white/20 dark:bg-slate-300/40 p-2 ${
                quotedMessage.style === "sent" ? "border-indigo-600" : "border-orange-600"
              }`}
            >
              <h2>
                {quotedMessage.style === "sent" ? "Você" : quotedMessage.author || ""}
              </h2>
              <div className="w-full h-full text-black dark:text-slate-200 p-4 rounded-md">
                {quotedMessage.text.split("\n").map((line, index) => (
                  <p key={index} className="max-w-[100%] break-words text-sm">
                    <LinkifiedText text={line} />
                  </p>
                ))}
              </div>

              {quotedMessage.fileId && (
                <MessageFile
                  fileId={quotedMessage.fileId}
                  fileName={quotedMessage.fileName || ""}
                  fileType={quotedMessage.fileType || ""}
                  fileSize={fileSize || ""}
                />
              )}
            </div>
          )}

          {groupFirst && (
            <h2 className="text-xs font-bold text-indigo-300">{sentBy}</h2>
          )}
                    {isForwarded && (
                        <div className="flex items-center gap-1.5 opacity-75">
                            <ForwardIcon sx={{ fontSize: '1rem' }} />
                            <span className="text-xs font-semibold">Encaminhada</span>
                        </div>
                    )}
          {fileId && (
            <MessageFile
              fileId={fileId}
              fileName={fileName || ""}
              fileType={fileType || ""}
              fileSize={fileSize || ""}
            />
          )}
            <div className="w-full text-slate-900 dark:text-slate-200">
                {type === "vcard" ? (
                    <VCardMessage vCardString={text} />
                ) : (
                    text?.split("\n").map((line, index) => (
                        <p key={index} className="max-w-[100%] break-words text-sm">
                            <LinkifiedText text={line} />
                        </p>
                    ))
                )}
            </div>
          <div className="flex items-center gap-2">
            {style !== "system" && status && statusComponents[status]}
            <p className="text-xs text-slate-900 dark:text-slate-200">
              {date.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

            {style !== "system" && !isForwardMode && (
                <>
                    <IconButton
                        className="invisible group-hover:visible"
                        size="small"
                        title="Mais opções"
                        onClick={handleMenuClick}
                    >
                        <MoreVertIcon />
                    </IconButton>
                    <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                        {onSelect && (
                            <MenuItem onClick={handleSelect}>
                                <ListItemIcon><CheckBoxOutlineBlankIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Selecionar</ListItemText>
                            </MenuItem>
                        )}
                        {onQuote && (
                            <MenuItem onClick={handleQuote}>
                                <ListItemIcon><ReplyIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Responder</ListItemText>
                            </MenuItem>
                        )}
                        {onForward && (
                            <MenuItem onClick={handleForward}>
                                <ListItemIcon><ForwardIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Encaminhar</ListItemText>
                            </MenuItem>
                        )}
                        {onCopy && (
                            <MenuItem onClick={handleCopy}>
                                <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Copiar</ListItemText>
                            </MenuItem>
                        )}
                    </Menu>
                </>
            )}
    </li>
  );
}
