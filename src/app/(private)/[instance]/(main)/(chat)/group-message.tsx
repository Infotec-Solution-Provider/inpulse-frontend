import { useState } from "react";
import { WppMessageStatus } from "@in.pulse-crm/sdk";
import MessageFile from "./message-file";
import {
  liStyleVariants,
  msgStyleVariants,
  QuotedMessageProps,
  statusComponents,
} from "./message";
import { IconButton, Menu, MenuItem, Checkbox } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LinkifiedText from "./linkmessage";

interface MessageProps {
  id: number;
  style: "received" | "sent" | "system";
  sentBy: string;
  groupFirst: boolean;
  text: string;
  date: Date;
  status?: WppMessageStatus | null;
  fileId?: number | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: string | null;
  quotedMessage?: QuotedMessageProps | null;
  onQuote?: () => void;
  mentionNameMap?: Map<string, string>;
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

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectMessage = () => {
    if (onSelect) onSelect(id);
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
      style={styleWrapper}
      className={`w-full ${liStyleVariants[style]} group flex items-center gap-2 relative`}
    >
      {isForwardMode && (
        <Checkbox
          checked={isSelected}
          onChange={handleSelectMessage}
          className="absolute left-[-12px]"
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

          {fileId && (
            <MessageFile
              fileId={fileId}
              fileName={fileName || ""}
              fileType={fileType || ""}
              fileSize={fileSize || ""}
            />
          )}

          <div className="w-full text-slate-900 dark:text-slate-200">
            {visualText.split("\n").map((line, index) => (
              <p key={index} className="max-w-[100%] break-words text-sm">
                <LinkifiedText text={line} />
              </p>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {style !== "system" && status && statusComponents[status]}
            <p className="text-xs text-slate-900 dark:text-slate-200">
              {date.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {!isForwardMode && style !== "system" && (
        <div className="invisible group-hover:visible">
          <IconButton
            size="small"
            color="default"
            title="Mais opções"
            onClick={handleMenuClick}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
            <MenuItem onClick={() => { handleClose(); onQuote?.(); }}>
              Responder
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); onSelect?.(id); }}>
              Selecionar
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); onForward?.(); }}>
              Encaminhar
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); handleCopy(); }}>
              Copiar
            </MenuItem>
          </Menu>
        </div>
      )}
    </li>
  );
}
