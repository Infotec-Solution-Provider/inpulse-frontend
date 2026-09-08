"use client";

import { InternalWhatsappSenderSummary } from "@/lib/sdk-local";
import HistoryIcon from "@mui/icons-material/History";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import { Button, Chip, TableCell, TableRow } from "@mui/material";
import { useContext } from "react";
import { MentionDirectoryContext } from "@/lib/components/message-mention-text";
import { mentionDisplayText } from "@/lib/utils/message-mentions";

interface SenderRowProps {
  sender: InternalWhatsappSenderSummary;
  onHistory: () => void;
  onAssign: () => void;
}

export default function SenderRow({ sender, onHistory, onAssign }: SenderRowProps) {
  const lastMessage = sender.lastMessage;
  const directory = useContext(MentionDirectoryContext);

  return (
    <TableRow hover>
      <TableCell>
        <span className="break-all font-mono text-sm">{sender.senderId}</span>
      </TableCell>
      <TableCell align="center">
        <Chip size="small" label={sender.messageCount} variant="outlined" />
      </TableCell>
      <TableCell className="max-w-sm">
        <p className="truncate text-sm">
          {lastMessage?.body
            ? mentionDisplayText(lastMessage.body, lastMessage.mentionEntities, directory)
            : getMessagePreview(lastMessage?.type)}
        </p>
        {lastMessage && (
          <p className="mt-1 text-xs text-slate-500">{formatMessageDate(lastMessage.timestamp)}</p>
        )}
      </TableCell>
      <TableCell>{lastMessage?.chat?.groupName || "Grupo interno"}</TableCell>
      <TableCell align="right">
        <div className="flex justify-end gap-2">
          <Button size="small" startIcon={<HistoryIcon />} onClick={onHistory}>
            Ver mensagens
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<PersonAddAlt1Icon />}
            onClick={onAssign}
          >
            Atribuir nome
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function formatMessageDate(timestamp: string) {
  const raw = Number(timestamp);
  const date = new Date(raw < 10_000_000_000 ? raw * 1000 : raw);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR");
}

function getMessagePreview(type?: string) {
  if (!type) return "Sem mensagem recente";
  return `[${type}]`;
}
