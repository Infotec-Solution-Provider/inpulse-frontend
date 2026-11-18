"use-client";

// --- 1. IMPORTAÇÕES ---
import { AuthContext } from "@/app/auth-context";
import { WppMessage } from "@/lib/sdk-local";
import { Button } from "@mui/material";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useWhatsappContext } from "../../whatsapp-context";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import { ChatContext } from "./chat-context";
import Message from "./message";
import ChatPendingSends from "./chat-pending-sends";
import PendingSendStatus from "./pending-send-status";
import { canReactToWhatsappMessage } from "@/lib/utils/message-reactions";
import { Phone } from "lucide-react";
import type { AttendanceHistory } from "../integrated-call-history";

const CANT_EDIT_MESSAGE_TYPES = ["audio", "sticker", "ptt"];

interface RenderWhatsappChatMessagesProps {
  selectedMessageIds: Set<string | number>;
  isSelectionMode: boolean;
  toggleSelectMessage: (id: string | number) => void;
  openManualForward: (msg: WppMessage) => void;
  isReadOnlyMode: boolean;
  attendanceHistory?: AttendanceHistory;
}

const historyFilters = { all: "Tudo", whatsapp: "WhatsApp", calls: "Ligações" } as const;
type HistoryFilter = keyof typeof historyFilters;
const callDateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function getWppMessageStyle(msg: WppMessage) {
  if (msg.from.startsWith("system")) {
    return "system";
  }
  if (msg.from.startsWith("me:") || msg.from.startsWith("bot:")) {
    return "sent";
  }
  if (msg.from.startsWith("thirdparty")) {
    return "thirdparty";
  }
  return "received";
}

export default function RenderWhatsappChatMessages({
  selectedMessageIds,
  isSelectionMode,
  toggleSelectMessage,
  openManualForward,
  isReadOnlyMode,
  attendanceHistory,
}: RenderWhatsappChatMessagesProps) {
  const { currentChatMessages, reactToMessage, channels, currentChat } = useWhatsappContext();
  const { getMessageById, handleQuoteMessage, handleEditMessage, pendingSends } =
    useContext(ChatContext);
  const { instance } = useContext(AuthContext);

  const [visibleCount, setVisibleCount] = useState(30);
  const [visibleFileCount, setVisibleFileCount] = useState(10);
  const [visibleCallCount, setVisibleCallCount] = useState(30);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const latestPendingId = pendingSends.at(-1)?.id;
  const activeFilter = !attendanceHistory || isSelectionMode ? "all" : historyFilter;

  useEffect(() => {
    if (!isSelectionMode && messagesContainerRef.current) {
      const timer = setTimeout(() => {
        // Scroll only the history; scrollIntoView also moves ancestor panels.
        const container = messagesContainerRef.current;
        if (container) container.scrollTop = container.scrollHeight;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentChatMessages, isSelectionMode, latestPendingId, activeFilter]);

  const messagesToRender = useMemo(
    () =>
      instance === "nunes"
        ? (() => {
            const boolArray = [...currentChatMessages].map(
              (msg) => msg.from === "system" && msg.body?.startsWith("Atendimento transferido"),
            );
            const lastTransferIndex = boolArray.lastIndexOf(true);
            return lastTransferIndex !== -1
              ? currentChatMessages.slice(lastTransferIndex)
              : currentChatMessages;
          })()
        : currentChatMessages,
    [currentChatMessages, instance],
  );

  const visibleMessages = useMemo(
    () => messagesToRender.slice(-visibleCount),
    [messagesToRender, visibleCount],
  );

  useEffect(() => {
    setVisibleFileCount(10);
  }, [currentChatMessages]);

  const visibleMessageFileIds = useMemo(
    () =>
      visibleMessages
        .filter((msg) => typeof msg.fileId === "number")
        .map((msg) => msg.fileId as number),
    [visibleMessages],
  );

  const autoVisibleFileIdSet = useMemo(
    () => new Set(visibleMessageFileIds.slice(-visibleFileCount)),
    [visibleMessageFileIds, visibleFileCount],
  );

  const hiddenFilesCount = Math.max(visibleMessageFileIds.length - visibleFileCount, 0);
  const timeline = useMemo(() => {
    const messages = visibleMessages.map((message) => ({ type: "message" as const, time: Number(message.timestamp), message }));
    if (!attendanceHistory || activeFilter === "whatsapp") return { entries: messages, moreCalls: false };
    const earliest = activeFilter === "all" && visibleCount < messagesToRender.length
      ? messages[0]?.time ?? -Infinity : -Infinity;
    const callEntries = attendanceHistory.calls
      .filter((call) => call.time >= earliest)
      .sort((a, b) => a.time - b.time || a.id - b.id);
    const calls = callEntries.slice(-visibleCallCount)
      .map((call) => ({ type: "call" as const, time: call.time, call }));
    return {
      entries: activeFilter === "calls" ? calls : [...messages, ...calls].sort((a, b) => a.time - b.time),
      moreCalls: callEntries.length > visibleCallCount,
    };
  }, [activeFilter, attendanceHistory, messagesToRender.length, visibleCallCount, visibleCount, visibleMessages]);

  return (
    <div
      ref={messagesContainerRef}
      className="ip-message-history scrollbar-whatsapp h-full w-full overflow-y-auto bg-slate-300 p-2 dark:bg-slate-900"
    >
      {attendanceHistory && (
        <div className="attendance-history-toolbar">
          <h3>Histórico do atendimento</h3>
          <div className="attendance-history-filters" role="group" aria-label="Canal do histórico">
            {(Object.entries(historyFilters) as [HistoryFilter, string][]).map(([filter, label]) => (
              <button key={filter} type="button" aria-pressed={activeFilter === filter} disabled={isSelectionMode} onClick={() => setHistoryFilter(filter)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {attendanceHistory && activeFilter !== "whatsapp" && (
        <>
          {attendanceHistory.status === "loading" && <p className="attendance-history-status" role="status">Buscando ligações do cliente…</p>}
          {attendanceHistory.status === "error" && <p className="attendance-history-status" role="status">Histórico de ligações indisponível.</p>}
          {attendanceHistory.status === "unlinked" && activeFilter === "calls" && <p className="attendance-history-status">Vincule o contato a um cliente para consultar suas ligações no CRM.</p>}
          {attendanceHistory.status === "ready" && activeFilter === "calls" && !attendanceHistory.calls.length && <p className="attendance-history-status">Nenhuma ligação registrada para este cliente.</p>}
        </>
      )}
      {activeFilter !== "calls" && visibleCount < messagesToRender.length && (
        <div className="mb-2 flex justify-center">
          <Button
            variant="outlined"
            size="small"
            onClick={() => setVisibleCount((prev) => Math.min(prev + 30, messagesToRender.length))}
          >
            Carregar mais
          </Button>
        </div>
      )}

      {activeFilter !== "calls" && hiddenFilesCount > 0 && (
        <div className="mb-2 flex justify-center">
          <Button
            variant="outlined"
            size="small"
            onClick={() =>
              setVisibleFileCount((prev) => Math.min(prev + 10, visibleMessageFileIds.length))
            }
          >
            Carregar arquivos antigos ({hiddenFilesCount})
          </Button>
        </div>
      )}
      {timeline.moreCalls && (
        <div className="mb-2 flex justify-center">
          <Button size="small" variant="outlined" onClick={() => setVisibleCallCount((count) => count + 30)}>
            Carregar mais ligações
          </Button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {timeline.entries.map((entry) => {
          if (entry.type === "call") {
            const { call } = entry;
            const seconds = call.end == null ? null : Math.floor((call.end - call.time) / 1000);
            return (
              <li className="attendance-history-call" key={`call-${call.id}`}>
                <span className="attendance-history-icon"><Phone size={16} aria-hidden /></span>
                <div>
                  <strong>{call.title}</strong>
                  <p>{[call.result, seconds == null ? null : `${Math.floor(seconds / 60)}min ${seconds % 60}s`].filter(Boolean).join(" · ") || "Registro do CRM"}</p>
                </div>
                <time dateTime={new Date(call.time).toISOString()}>{callDateTime.format(call.time)}</time>
              </li>
            );
          }
          const m = entry.message;
          const pending = pendingSends.find(
            (attempt) => attempt.messageId === m.id && attempt.clientId === m.clientId,
          );
          const findQuoted = m.contactId && m.quotedId && getMessageById(m.contactId, m.quotedId);
          const quotedMsgProps =
            findQuoted && "to" in findQuoted
              ? getQuotedMsgProps(findQuoted, getWppMessageStyle(findQuoted), [], [])
              : null;

          return (
            <Message
              key={m.id}
              id={m.id}
              style={getWppMessageStyle(m)}
              text={m.body}
              mentionEntities={m.mentionEntities}
              type={m.type}
              date={new Date(+m.timestamp)}
              status={m.status}
              sendError={m.sendError}
              sendStatus={
                pending && (
                  <PendingSendStatus
                    attempt={pending}
                    readOnly={isReadOnlyMode || isSelectionMode}
                  />
                )
              }
              fileId={m.fileId}
              fileName={m.fileName}
              fileType={m.fileType}
              fileSize={m.fileSize}
              showMediaByDefault={!m.fileId || autoVisibleFileIdSet.has(m.fileId)}
              showQuotedMediaByDefault={
                !quotedMsgProps?.fileId || autoVisibleFileIdSet.has(Number(quotedMsgProps.fileId))
              }
              quotedMessage={quotedMsgProps}
              onQuote={isReadOnlyMode ? undefined : () => handleQuoteMessage(m)}
              isSelected={selectedMessageIds.has(m.id)}
              onSelect={isReadOnlyMode ? undefined : toggleSelectMessage}
              onForward={isReadOnlyMode ? undefined : () => openManualForward(m)}
              onCopy={() => navigator.clipboard.writeText(m.body ?? "")}
              isForwarded={m.isForwarded}
              isForwardMode={isSelectionMode}
              isEdited={!!m.isEdited}
              reaction={m.reaction}
              reactions={m.reactions}
              onReaction={
                !isReadOnlyMode &&
                canReactToWhatsappMessage(
                  m,
                  channels.find((channel) => channel.id === m.clientId)?.type,
                  currentChat,
                )
                  ? (emoji) => reactToMessage(m, emoji)
                  : undefined
              }
              channelId={m.clientId}
              agentId={m.agentId}
              isReadOnly={isReadOnlyMode}
              onEdit={
                !isReadOnlyMode &&
                m.from.startsWith("me:") &&
                !CANT_EDIT_MESSAGE_TYPES.includes(m.type)
                  ? () => handleEditMessage(m)
                  : undefined
              }
            />
          );
        })}
        {activeFilter !== "calls" && (
          <ChatPendingSends
            renderedMessages={visibleMessages}
            readOnly={isReadOnlyMode || isSelectionMode}
          />
        )}
        <div className="h-1" />
      </ul>
    </div>
  );
}
