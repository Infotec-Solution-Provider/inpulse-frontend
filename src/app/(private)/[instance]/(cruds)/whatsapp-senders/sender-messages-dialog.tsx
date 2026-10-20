"use client";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";

import MessageMentionText from "@/lib/components/message-mention-text";

import { InternalChatContext } from "@/app/(private)/[instance]/internal-context";
import { InternalWhatsappSenderMessage } from "@/lib/sdk-local";
import { PersonAddAlt1 as PersonAddAlt1Icon } from "@/lib/ui-system/crm-icons";
import {
  Button,
  Chip,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { useCallback, useContext, useEffect, useState } from "react";

interface SenderMessagesDialogProps {
  senderId: string | null;
  onClose: () => void;
  onAssignName: (senderId: string) => void;
}

export default function SenderMessagesDialog({
  senderId,
  onClose,
  onAssignName,
}: SenderMessagesDialogProps) {
  const { internalApi } = useContext(InternalChatContext);
  const [messages, setMessages] = useState<InternalWhatsappSenderMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadMessages = useCallback(
    async (cursor?: number | null) => {
      if (!senderId) return;
      setIsLoading(true);
      setHasError(false);
      try {
        const page = await internalApi.current.getWhatsappSenderMessages(senderId, 50, cursor);
        setMessages((current) => (cursor ? [...current, ...page.messages] : page.messages));
        setNextCursor(page.nextCursor);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [internalApi, senderId],
  );

  useEffect(() => {
    setMessages([]);
    setNextCursor(null);
    if (senderId) void loadMessages();
  }, [loadMessages, senderId]);

  return (
    <Dialog open={Boolean(senderId)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <span className="block">Mensagens para identificação</span>
        <span className="mt-1 block break-all font-mono text-xs font-normal text-[var(--ip-muted)]">
          {senderId}
        </span>
      </DialogTitle>
      <DialogContent dividers className="min-h-80 bg-[var(--ip-surface)]">
        {isLoading && messages.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <CircularProgress size={32} />
          </div>
        ) : hasError && messages.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-[var(--ip-muted)]">
            Não foi possível carregar as mensagens.
            <Button onClick={() => void loadMessages()}>Tentar novamente</Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-[var(--ip-muted)]">
            Nenhuma mensagem encontrada para este ID.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <article
                key={message.id}
                className="rounded-xl border border-[var(--ip-border)] bg-[var(--ip-surface)] p-4 shadow-none"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Chip
                    size="small"
                    label={message.chat?.groupName || "Grupo interno"}
                    variant="outlined"
                  />
                  <span className="text-xs text-[var(--ip-muted)]">
                    {formatMessageDate(message.timestamp)}
                  </span>
                </div>
                <div className="text-[var(--ip-text)]">
                  <MessageMentionText
                    text={message.body || message.fileName || getMessageTypeLabel(message.type)}
                    mentionEntities={message.body ? message.mentionEntities : []}
                  />
                </div>
              </article>
            ))}
            {nextCursor && (
              <Button onClick={() => void loadMessages(nextCursor)} disabled={isLoading}>
                {isLoading ? "Carregando..." : "Carregar mensagens anteriores"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        <Button
          variant="contained"
          startIcon={<PersonAddAlt1Icon />}
          onClick={() => senderId && onAssignName(senderId)}
          disabled={!senderId}
        >
          Atribuir nome
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function formatMessageDate(timestamp: string) {
  const raw = Number(timestamp);
  const date = new Date(raw < 10_000_000_000 ? raw * 1000 : raw);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function getMessageTypeLabel(type: string) {
  const labels: Record<string, string> = {
    audio: "Mensagem de áudio",
    ptt: "Mensagem de voz",
    image: "Imagem",
    video: "Vídeo",
    document: "Documento",
    sticker: "Figurinha",
  };
  return labels[type] || "Mensagem sem texto";
}
