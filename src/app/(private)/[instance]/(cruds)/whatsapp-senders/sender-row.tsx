"use client";

import { InternalWhatsappSenderSummary } from "@/lib/sdk-local";
import { History as HistoryIcon } from "@/lib/ui-system/crm-icons";
import { PersonAddAlt1 as PersonAddAlt1Icon } from "@/lib/ui-system/crm-icons";
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
      <TableCell data-label="ID do WhatsApp">
        <span className="break-all font-mono text-sm">{sender.senderId}</span>
      </TableCell>
      <TableCell data-label="Mensagens" align="center">
        <Chip size="small" label={sender.messageCount} variant="outlined" />
      </TableCell>
      <TableCell data-label="Mensagem mais recente" className="max-w-sm">
        <p className="truncate text-sm">
          {lastMessage?.body
            ? mentionDisplayText(lastMessage.body, lastMessage.mentionEntities, directory)
            : getMessagePreview(lastMessage?.type)}
        </p>
        {lastMessage && (
          <p className="mt-1 text-xs text-[var(--ip-muted)]">
            {formatMessageDate(lastMessage.timestamp)}
          </p>
        )}
      </TableCell>
      <TableCell data-label="Grupo">{lastMessage?.chat?.groupName || "Grupo interno"}</TableCell>
      <TableCell data-label="Ações" align="right">
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
