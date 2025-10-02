"use-client";

// --- 1. IMPORTAÇÕES ---
import React, { useState, useMemo, useContext, useCallback, useRef, useEffect } from "react";
import { WppMessage } from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import Message from "./message";
import { ChatContext } from "./chat-context";
import { DetailedChat, useWhatsappContext } from "../../whatsapp-context";
import { AuthContext } from "@/app/auth-context";

const CANT_EDIT_MESSAGE_TYPES = ["audio", "sticker", "ptt"];

interface RenderWhatsappChatMessagesProps {
  selectedMessageIds: Set<string | number>;
  isSelectionMode: boolean;
  toggleSelectMessage: (id: string | number) => void;
  openManualForward: (msg: WppMessage) => void;
}

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
}: RenderWhatsappChatMessagesProps) {
  const { currentChatMessages } = useWhatsappContext();
  const { getMessageById, handleQuoteMessage, handleEditMessage } = useContext(ChatContext);
  const { instance } = useContext(AuthContext);

  const [visibleCount, setVisibleCount] = useState(30);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSelectionMode && messagesEndRef.current) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentChatMessages, isSelectionMode]);

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

  return (
    <div className="scrollbar-whatsapp h-full w-full overflow-y-auto bg-slate-300 p-2 dark:bg-slate-900">
      {visibleCount < messagesToRender.length && (
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

      <ul className="flex flex-col gap-2">
        {visibleMessages.map((m) => {
          const findQuoted = m.contactId && m.quotedId && getMessageById(m.contactId, m.quotedId);
          const quotedMsgProps =
            findQuoted && "to" in findQuoted
              ? getQuotedMsgProps(
                findQuoted,
                getWppMessageStyle(findQuoted),
                [],
                {} as DetailedChat,
              )
              : null;

          return (
            <Message
              key={m.id}
              id={m.id}
              style={getWppMessageStyle(m)}
              text={m.body}
              type={m.type}
              date={new Date(+m.timestamp)}
              status={m.status}
              fileId={m.fileId}
              fileName={m.fileName}
              fileType={m.fileType}
              fileSize={m.fileSize}
              quotedMessage={quotedMsgProps}
              onQuote={() => handleQuoteMessage(m)}
              isSelected={selectedMessageIds.has(m.id)}
              onSelect={toggleSelectMessage}
              onForward={() => openManualForward(m)}
              onCopy={() => navigator.clipboard.writeText(m.body ?? "")}
              isForwarded={m.isForwarded}
              isForwardMode={isSelectionMode}
              isEdited={!!m.isEdited}
              onEdit={
                m.from.startsWith("me:") && !CANT_EDIT_MESSAGE_TYPES.includes(m.type)
                  ? () => handleEditMessage(m)
                  : undefined
              }
            />
          );
        })}
        <div ref={messagesEndRef} className="h-1" />
      </ul>
    </div>
  );
}
