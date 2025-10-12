"use client";

import React, { useState, useMemo, useContext, useRef, useEffect } from "react";
import { InternalMessage, User } from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import Message from "./message";
import { ChatContext } from "./chat-context";
import { InternalChatContext } from "../../internal-context";
import { useAuthContext } from "@/app/auth-context";

type BubbleStyle = "system" | "sent" | "received";
const CANT_EDIT_MESSAGE_TYPES = ["audio", "sticker", "ptt"];

export function getInternalMessageStyle(msg: InternalMessage, userId?: number): BubbleStyle {
  if (msg.from === "system") return "system";
  if (userId != null && msg.from === `user:${userId}`) return "sent";
  return "received";
}

interface RenderInternalChatMessagesProps {
  selectedMessageIds: Set<string | number>;
  isSelectionMode: boolean;
  toggleSelectMessage: (id: string | number) => void;
  openManualForward: (msg: InternalMessage) => void;
}

export default function RenderInternalChatMessages({
  selectedMessageIds,
  isSelectionMode,
  toggleSelectMessage,
  openManualForward,
}: RenderInternalChatMessagesProps) {
  const { currentInternalChatMessages, users } = useContext(InternalChatContext);
  const { getMessageById, handleQuoteMessage, handleEditMessage } = useContext(ChatContext);
  const { user } = useAuthContext();

  const [visibleCount, setVisibleCount] = useState(30);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSelectionMode && messagesEndRef.current) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentInternalChatMessages, isSelectionMode]);

  const total = currentInternalChatMessages?.length ?? 0;
  const visibleMessages = useMemo(
    () => (currentInternalChatMessages ?? []).slice(-visibleCount),
    [currentInternalChatMessages, visibleCount]
  );

  return (
    <div className="h-full w-full overflow-y-auto p-2 bg-slate-300 dark:bg-slate-900 scrollbar-whatsapp">
      {visibleCount < total && (
        <div className="flex justify-center mb-2">
          <Button
            variant="outlined"
            size="small"
            onClick={() => setVisibleCount((prev) => Math.min(prev + 30, total))}
          >
            Carregar mais
          </Button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {visibleMessages.map((m) => {
          const findQuoted =
            m.internalChatId &&
            m.quotedId &&
            (getMessageById(m.internalChatId, m.quotedId, true) as InternalMessage | null);

          const quotedMsg = findQuoted
            ? getQuotedMsgProps(
                findQuoted,
                getInternalMessageStyle(findQuoted, user?.CODIGO),
                users ?? []
              )
            : null;

          const isMine = user?.CODIGO != null && m.from === `user:${user.CODIGO}`;

          return (
            <Message
              id={m.id}
              key={`message_${m.id}`}
              style={getInternalMessageStyle(m, user?.CODIGO)}
              text={m.body ?? ""}
              type={m.type}
              date={new Date(Number(m.timestamp))}
              status={m.status}
              fileId={m.fileId}
              fileName={m.fileName}
              fileType={m.fileType}
              fileSize={m.fileSize}
              quotedMessage={quotedMsg}
              onQuote={() => handleQuoteMessage(m)}
              isSelected={selectedMessageIds.has(m.id)}
              onSelect={() => toggleSelectMessage(m.id)}
              onForward={() => openManualForward(m)}
              onCopy={() => navigator.clipboard.writeText(m.body ?? "")}
              isForwardMode={isSelectionMode}
              isForwarded={m.isForwarded}
              isEdited={m.isEdited}
              onEdit={
                isMine && !CANT_EDIT_MESSAGE_TYPES.includes(m.type)
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
