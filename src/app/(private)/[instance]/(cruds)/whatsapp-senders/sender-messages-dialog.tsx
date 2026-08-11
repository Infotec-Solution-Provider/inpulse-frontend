"use client";

import { InternalChatContext } from "@/app/(private)/[instance]/internal-context";
import { InternalWhatsappSenderMessage } from "@/lib/sdk-local";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
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
        <span className="mt-1 block break-all font-mono text-xs font-normal text-slate-500">
          {senderId}
        </span>
      </DialogTitle>
      <DialogContent dividers className="min-h-80 bg-slate-50 dark:bg-slate-900">
        {isLoading && messages.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <CircularProgress size={32} />
          </div>
        ) : hasError && messages.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-slate-500">
            Não foi possível carregar as mensagens.
            <Button onClick={() => void loadMessages()}>Tentar novamente</Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            Nenhuma mensagem encontrada para este ID.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <article
                key={message.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Chip
                    size="small"
                    label={message.chat?.groupName || "Grupo interno"}
                    variant="outlined"
                  />
                  <span className="text-xs text-slate-500">
                    {formatMessageDate(message.timestamp)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">
                  {message.body || message.fileName || getMessageTypeLabel(message.type)}
                </p>
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
