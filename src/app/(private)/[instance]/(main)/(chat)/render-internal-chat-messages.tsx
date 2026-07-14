"use client";

import { useAuthContext } from "@/app/auth-context";
import { replaceMentions } from "@/lib/utils/message-mentions";
import { InternalMessage } from "@/lib/sdk-local";
import { Button } from "@mui/material";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { InternalChatContext } from "../../internal-context";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import { ChatContext } from "./chat-context";
import Message from "./message";

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
  isReadOnlyMode: boolean;
}

export default function RenderInternalChatMessages({
  selectedMessageIds,
  isSelectionMode,
  toggleSelectMessage,
  openManualForward,
  isReadOnlyMode,
}: RenderInternalChatMessagesProps) {
  const { currentInternalChatMessages, users, contacts } = useContext(InternalChatContext);
  const { getMessageById, handleQuoteMessage, handleEditMessage } = useContext(ChatContext);
  const { user } = useAuthContext();

  const [visibleCount, setVisibleCount] = useState(30);
  const [visibleFileCount, setVisibleFileCount] = useState(10);
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
    [currentInternalChatMessages, visibleCount],
  );

  useEffect(() => {
    setVisibleFileCount(10);
  }, [currentInternalChatMessages]);

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

  return (
    <div className="scrollbar-whatsapp h-full w-full overflow-y-auto bg-slate-300 p-2 dark:bg-slate-900">
      {visibleCount < total && (
        <div className="mb-2 flex justify-center">
          <Button
            variant="outlined"
            size="small"
            onClick={() => setVisibleCount((prev) => Math.min(prev + 30, total))}
          >
            Carregar mais
          </Button>
        </div>
      )}

      {hiddenFilesCount > 0 && (
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
                users ?? [],
              )
            : null;

          const isMine = user?.CODIGO != null && m.from === `user:${user.CODIGO}`;

          return (
            <Message
              id={m.id}
              key={`message_${m.id}`}
              style={getInternalMessageStyle(m, user?.CODIGO)}
              text={replaceMentions(m.body ?? "", users ?? [], contacts ?? [])}
              type={m.type}
              date={new Date(Number(m.timestamp))}
              status={m.status}
              fileId={m.fileId}
              fileName={m.fileName}
              fileType={m.fileType}
              fileSize={m.fileSize}
              showMediaByDefault={!m.fileId || autoVisibleFileIdSet.has(m.fileId)}
              showQuotedMediaByDefault={!quotedMsg?.fileId || autoVisibleFileIdSet.has(quotedMsg.fileId)}
              quotedMessage={quotedMsg}
              onQuote={isReadOnlyMode ? undefined : () => handleQuoteMessage(m)}
              isSelected={selectedMessageIds.has(m.id)}
              onSelect={isReadOnlyMode ? undefined : () => toggleSelectMessage(m.id)}
              onForward={isReadOnlyMode ? undefined : () => openManualForward(m)}
              onCopy={() => navigator.clipboard.writeText(m.body ?? "")}
              isForwardMode={isSelectionMode}
              isForwarded={m.isForwarded}
              isEdited={m.isEdited}
              isReadOnly={isReadOnlyMode}
              onEdit={
                !isReadOnlyMode && isMine && !CANT_EDIT_MESSAGE_TYPES.includes(m.type)
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
