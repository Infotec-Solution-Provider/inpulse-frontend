"use client";

import { Alert, Button, CircularProgress, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useEffect, useRef, useState } from "react";
import type { InternalMessage, WppMessage } from "@/lib/sdk-local";
import { AuthContext } from "@/app/auth-context";
import { readRequestLimitMessage } from "@/lib/utils/read-request-limit";
import { AppContext } from "../../app-context";
import useInternalChatContext, { type DetailedInternalChat } from "../../internal-context";
import { useWhatsappContext, type DetailedChat } from "../../whatsapp-context";
import ChatMessagesList from "../../(main)/(chat)/chat-messages-list";
import ChatSendMessageArea from "../../(main)/(chat)/chat-send-message-area";
import Message from "../../(main)/(chat)/message";
import GroupMessage from "../../(main)/(chat)/group-message";
import { getMonitorParticipants } from "../(functions)/get-card-props";
import { loadMonitorHistory, monitorMessageDate } from "../history";
import { MonitorRequestGate } from "../request-gate";

export default function MonitorConversationPreview({
  chat,
}: {
  chat: DetailedChat | DetailedInternalChat;
}) {
  const { closeModal } = useContext(AppContext);
  const { instance, user, token } = useContext(AuthContext);
  const { openChat, isReadOnlyMode } = useWhatsappContext();
  const { openInternalChat, users } = useInternalChatContext();
  const [messages, setMessages] = useState<(WppMessage | InternalMessage)[]>([]);
  const [quotedMessages, setQuotedMessages] = useState<(WppMessage | InternalMessage)[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [requestedCursor, setRequestedCursor] = useState<number | null>(null);
  const [retryUntil, setRetryUntil] = useState(0);
  const [now, setNow] = useState(Date.now);
  const requestGate = useRef(new MonitorRequestGate());
  const [scope] = useState(() => JSON.stringify([instance, user?.CODIGO]));
  const sameScope = scope === JSON.stringify([instance, user?.CODIGO]) && !!token;
  const onClose = useRef(closeModal);
  onClose.current = closeModal;
  const container = useRef<HTMLDivElement>(null);
  const requestKey = JSON.stringify([
    instance,
    user?.CODIGO,
    token,
    chat.chatType,
    chat.id,
    requestedCursor,
    attempt,
  ]);
  const liveRequestKey = useRef(requestKey);
  liveRequestKey.current = requestKey;

  useEffect(() => {
    if (retryUntil <= Date.now()) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [retryUntil]);

  useEffect(() => {
    if (!sameScope) {
      onClose.current();
      return;
    }
    if (retryUntil > Date.now()) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const isCurrent = () => !controller.signal.aborted && liveRequestKey.current === requestKey;
    setLoading(true);
    setError(null);
    void loadMonitorHistory(chat.chatType, chat.id, requestedCursor, controller.signal)
      .then((result) => {
        if (!isCurrent()) return;
        setMessages((previous) => {
          const merged = new Map(result.messages.map((message) => [message.id, message]));
          if (requestedCursor) for (const message of previous) merged.set(message.id, message);
          return [...merged.values()].sort((a, b) => a.id - b.id);
        });
        setNextCursor(result.nextCursor);
        setQuotedMessages((previous) =>
          requestedCursor
            ? [...previous, ...(result.quotedMessages ?? [])]
            : (result.quotedMessages ?? []),
        );
        if (!requestedCursor)
          requestAnimationFrame(() => {
            if (isCurrent() && container.current)
              container.current.scrollTop = container.current.scrollHeight;
          });
      })
      .catch((failure) => {
        if (isCurrent()) {
          setRetryUntil(requestGate.current.recordFailure(failure));
          setNow(Date.now());
          setError(
            readRequestLimitMessage(failure) ||
              "Não foi possível carregar as mensagens desta conversa.",
          );
        }
      })
      .finally(() => {
        if (isCurrent()) setLoading(false);
      });
    return () => controller.abort();
  }, [requestKey, sameScope]);

  if (!sameScope) return null;
  const retrySeconds = Math.max(0, Math.ceil((retryUntil - now) / 1_000));
  const quoteById = new Map(
    [...quotedMessages, ...messages].map((message) => [message.id, message]),
  );
  const participants = chat.chatType === "internal" ? getMonitorParticipants(chat, users) : [];
  const title =
    chat.chatType === "wpp"
      ? chat.contact?.name || "Contato excluído"
      : chat.groupName ||
        participants.map((participant) => participant.NOME).join(" e ") ||
        "Conversa interna";
  const enableReply = () => {
    if (chat.chatType === "wpp") openChat(chat, messages as WppMessage[], false);
    else openInternalChat(chat, false, messages as InternalMessage[]);
    setReplying(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="monitor-preview-title"
      className="flex h-[85dvh] w-[calc(100vw-2rem)] max-w-[1200px] flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="min-w-0">
          <h2
            id="monitor-preview-title"
            className="truncate text-lg font-semibold text-slate-900 dark:text-white"
          >
            {title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {replying
              ? "Intervenção na conversa"
              : "Visualização de supervisão · sem marcar mensagens como lidas"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!replying && (
            <Button
              size="small"
              disabled={loading || retrySeconds > 0}
              onClick={() => {
                setRequestedCursor(null);
                setAttempt((value) => value + 1);
              }}
            >
              Atualizar histórico
            </Button>
          )}
          <IconButton onClick={closeModal} aria-label="Fechar conversa">
            <CloseIcon />
          </IconButton>
        </div>
      </header>
      {error && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              disabled={loading || retrySeconds > 0}
              onClick={() => setAttempt((value) => value + 1)}
            >
              {retrySeconds ? `Aguarde ${retrySeconds}s` : "Tentar novamente"}
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {replying ? (
        <>
          <div className="min-h-0 flex-1">
            <ChatMessagesList />
          </div>
          <div className="border-t border-slate-200 p-2 dark:border-slate-700">
            <ChatSendMessageArea />
          </div>
        </>
      ) : (
        <>
          <div
            ref={container}
            className="scrollbar-whatsapp min-h-0 flex-1 overflow-y-auto bg-slate-100 p-3 dark:bg-slate-950"
          >
            {nextCursor && (
              <div className="mb-3 text-center">
                <Button
                  disabled={loading || retrySeconds > 0}
                  onClick={() => setRequestedCursor(nextCursor)}
                >
                  Carregar mensagens anteriores
                </Button>
              </div>
            )}
            {loading && (
              <div role="status" aria-label="Carregando histórico" className="p-4 text-center">
                <CircularProgress size={24} />
              </div>
            )}
            {!loading && !error && messages.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">
                Nenhuma mensagem nesta conversa.
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {messages.map((message, index) => {
                const quoted = message.quotedId ? quoteById.get(message.quotedId) : undefined;
                const quoteSent =
                  quoted &&
                  (chat.chatType === "internal"
                    ? quoted.from === `user:${user?.CODIGO}`
                    : /^(me:|user:|bot|thirdparty)/.test(quoted.from));
                const quotedMessage = quoted
                  ? {
                      id: quoted.id,
                      text: quoted.body,
                      mentionEntities: quoted.mentionEntities,
                      style: quoteSent ? ("sent" as const) : ("received" as const),
                      fileId: quoted.fileId,
                      fileType: quoted.fileType,
                      fileName: quoted.fileName,
                      author:
                        users.find((item) => `user:${item.CODIGO}` === quoted.from)?.NOME || title,
                    }
                  : null;
                const props = {
                  id: message.id,
                  type: message.type,
                  text: message.body,
                  mentionEntities: message.mentionEntities,
                  date: monitorMessageDate(message),
                  status: message.status,
                  fileId: message.fileId,
                  fileName: message.fileName,
                  fileType: message.fileType,
                  fileSize: message.fileSize,
                  isReadOnly: true,
                  reactions: message.reactions,
                  isEdited: message.isEdited,
                  isForwarded: message.isForwarded,
                  quotedMessage,
                  showMediaByDefault: index >= messages.length - 10,
                  showQuotedMediaByDefault: false,
                };
                const system = message.from.startsWith("system");
                if (chat.chatType === "internal") {
                  const authorId = Number(message.from.split(":")[1]);
                  return (
                    <GroupMessage
                      key={message.id}
                      {...props}
                      style={system ? "system" : authorId === user?.CODIGO ? "sent" : "received"}
                      groupFirst
                      sentBy={
                        users.find((item) => item.CODIGO === authorId)?.NOME || "Participante"
                      }
                    />
                  );
                }
                const sent = /^(me:|user:|bot|thirdparty)/.test(message.from);
                return (
                  <Message
                    key={message.id}
                    {...props}
                    channelId={message.clientId}
                    style={system ? "system" : sent ? "sent" : "received"}
                  />
                );
              })}
            </ul>
          </div>
          {!chat.isFinished && !isReadOnlyMode && (
            <footer className="flex justify-end border-t border-slate-200 p-3 dark:border-slate-700">
              <Button variant="contained" disabled={loading || !!error} onClick={enableReply}>
                Responder nesta conversa
              </Button>
            </footer>
          )}
        </>
      )}
    </div>
  );
}
