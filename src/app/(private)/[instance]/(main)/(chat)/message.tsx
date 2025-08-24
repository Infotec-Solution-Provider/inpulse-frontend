import { WppMessageStatus } from "@in.pulse-crm/sdk";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DownloadDoneIcon from "@mui/icons-material/DownloadDone";
import ErrorIcon from "@mui/icons-material/Error";
import DeleteIcon from "@mui/icons-material/Delete";
import ReplyIcon from "@mui/icons-material/Reply";
import ForwardIcon from '@mui/icons-material/Forward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import React, { ReactNode, useState } from "react";
import MessageFile from "./message-file";
import { IconButton, Checkbox, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import LinkifiedText from "./linkmessage";
import VCardMessage from "./vcard-message";

export interface QuotedMessageProps {
    id: number | string;
    style: "received" | "sent" | "system";
    text: string;
    fileId?: number | null;
    fileType?: string | null;
    fileName?: string | null;
    author?: string | null;
}

export interface MessageProps {
    id: number | string;
    style: "received" | "sent" | "system";
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
    isForwarded?: boolean;
    isForwardMode?: boolean;
    isSelected?: boolean;
    onSelect?: (id: number | string) => void;
    onForward?: () => void;
    onCopy?: () => void;
}

export const msgStyleVariants = {
    received: "bg-slate-50 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-bl-none",
    sent: "bg-green-200 text-slate-800 dark:bg-green-800 dark:text-slate-200 rounded-br-none",
    system: "bg-yellow-200 text-slate-800 dark:bg-yellow-800 dark:text-white",
};

export const liStyleVariants = {
    received: "flex-row",
    sent: "flex-row-reverse",
    system: "flex-row justify-center",
};

export const statusComponents: Record<WppMessageStatus, ReactNode> = {
    PENDING: <AccessTimeIcon className="text-slate-300" />,
    SENT: <DoneIcon className="text-slate-300" />,
    RECEIVED: <DoneAllIcon className="text-slate-300" />,
    READ: <DoneAllIcon className="text-blue-300" />,
    DOWNLOADED: <DownloadDoneIcon className="text-blue-300" />,
    ERROR: <ErrorIcon className="text-red-300" />,
    REVOKED: <DeleteIcon className="text-slate-300" />,
};

export default function Message({
    id,
    style,
    type,
    text,
    date,
    status,
    fileId,
    fileName,
    fileType,
    fileSize,
    quotedMessage,
    onQuote,
    isForwarded = false,
    isForwardMode = false,
    isSelected = false,
    onSelect,
    onForward,
    onCopy,
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
    const handleCopy = () => { onCopy?.(); handleMenuClose(); };

    const handleSelect = () => {
        onSelect?.(id);
        handleMenuClose();
    };

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

            <div
                className={`flex flex-col items-center gap-2 p-2 ${msgStyleVariants[style]} w-max max-w-[66%] rounded-md`}
            >
                {quotedMessage && (
                    <div
                        className={`mt-2 flex w-full flex-col gap-1 rounded-lg border-l-2 bg-white/20 p-2 dark:bg-slate-300/40 ${quotedMessage.style === "sent"
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
                            className={`${quotedMessage.style === "sent" ? "text-indigo-400 dark:text-indigo-600" : "text-orange-400 dark:text-orange-600"}`}
                        >
                            {quotedMessage.style === "sent" ? "Você" : quotedMessage.author || ""}
                        </h2>
                        <div className="h-full w-full rounded-md p-4 text-black dark:text-slate-200">
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

                <div className="flex w-full flex-col gap-1">
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
                        <p className="text-xs text-slate-900 dark:text-slate-200">{date.toLocaleString()}</p>
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
