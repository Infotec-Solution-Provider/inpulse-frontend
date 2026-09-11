"use client";

import { useAuthContext } from "@/app/auth-context";
import getInternalMessageAuthor from "@/lib/utils/get-internal-message-author";
import { InternalMessage } from "@/lib/sdk-local";
import { Button } from "@mui/material";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { InternalChatContext } from "../../internal-context";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import { ChatContext } from "./chat-context";
import GroupMessage from "./group-message";
import ChatPendingSends from "./chat-pending-sends";
import PendingSendStatus from "./pending-send-status";
import { useWhatsappContext } from "../../whatsapp-context";
import { canReactToInternalMessage } from "@/lib/utils/message-reactions";

type BubbleStyle = "system" | "sent" | "received";

function getInternalMessageStyle(msg: InternalMessage, userId?: number): BubbleStyle {
  if (msg.from === "system") return "system";
  if (userId != null && msg.from === `user:${userId}`) return "sent";
  return "received";
}

interface RenderInternalGroupMessagesProps {
  selectedMessageIds: Set<string | number>;
  isSelectionMode: boolean;
  toggleSelectMessage: (id: string | number) => void;
  openManualForward: (msg: InternalMessage) => void;
  isReadOnlyMode: boolean;
}

const CANT_EDIT_MESSAGE_TYPES = ["audio", "sticker", "ptt"];

export default function RenderInternalGroupMessages({
  selectedMessageIds,
  isSelectionMode,
  toggleSelectMessage,
  openManualForward,
  isReadOnlyMode,
}: RenderInternalGroupMessagesProps) {
  const {
    currentInternalChatMessages,
    users,
    phoneNameMap,
    whatsappSenderNameMap,
    reactToInternalMessage,
  } = useContext(InternalChatContext);
  const { currentChat, channels } = useWhatsappContext();
  const { getMessageById, handleQuoteMessage, handleEditMessage, pendingSends } =
    useContext(ChatContext);
  const { user } = useAuthContext();

  const [visibleCount, setVisibleCount] = useState(30);
  const [visibleFileCount, setVisibleFileCount] = useState(10);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const latestPendingId = pendingSends.at(-1)?.id;

  useEffect(() => {
    if (!isSelectionMode && messagesContainerRef.current) {
      // Scroll only the history; scrollIntoView also moves ancestor panels.
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [currentInternalChatMessages, isSelectionMode, latestPendingId]);

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
    <div
      ref={messagesContainerRef}
      className="scrollbar-whatsapp h-full w-full overflow-y-auto bg-slate-300 p-2 dark:bg-slate-900"
    >
      {visibleCount < (currentInternalChatMessages?.length ?? 0) && (
        <div className="mb-2 flex justify-center">
          <Button
            variant="outlined"
            size="small"
            onClick={() =>
              setVisibleCount((prev) =>
                Math.min(prev + 30, currentInternalChatMessages?.length ?? prev),
              )
            }
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
        {visibleMessages.map((m, i, arr) => {
          const pending = pendingSends.find(
            (attempt) => attempt.messageId === m.id && !attempt.clientId,
          );
          const findQuoted =
            m.internalChatId &&
            m.quotedId &&
            (getMessageById(m.internalChatId, m.quotedId, true) as InternalMessage | null);

          const quotedMsg = findQuoted
            ? getQuotedMsgProps(
                findQuoted,
                getInternalMessageStyle(findQuoted, user?.CODIGO),
                users ?? [],
                [],
                undefined,
                phoneNameMap,
                whatsappSenderNameMap,
              )
            : null;

          const prev = i > 0 ? arr[i - 1] : null;
          const groupFirst = !prev || prev.from !== m.from;
          const senderName = getInternalMessageAuthor(
            m.from,
            phoneNameMap,
            users,
            whatsappSenderNameMap,
          );
          const isMine = user?.CODIGO != null && m.from === `user:${user.CODIGO}`;

          return (
            <GroupMessage
              key={String(m.id)}
              id={m.id}
              style={getInternalMessageStyle(m, user?.CODIGO)}
              groupFirst={groupFirst}
              sentBy={senderName}
              text={m.body ?? ""}
              mentionEntities={m.mentionEntities}
              type={m.type}
              date={new Date(Number(m.timestamp))}
              status={m.status}
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
              quotedMessage={quotedMsg}
              showMediaByDefault={!m.fileId || autoVisibleFileIdSet.has(m.fileId)}
              showQuotedMediaByDefault={
                !quotedMsg?.fileId || autoVisibleFileIdSet.has(quotedMsg.fileId)
              }
              isForwarded={m.isForwarded}
              onQuote={isReadOnlyMode ? undefined : () => handleQuoteMessage(m)}
              onCopy={() => navigator.clipboard.writeText(m.body ?? "")}
              isForwardMode={isSelectionMode}
              isSelected={selectedMessageIds.has(m.id)}
              isEdited={m.isEdited}
              reaction={m.reaction}
              reactions={m.reactions}
              onReaction={
                !isReadOnlyMode &&
                currentChat?.chatType === "internal" &&
                canReactToInternalMessage(
                  m,
                  currentChat,
                  channels.find((channel) => channel.id === m.clientId)?.type,
                )
                  ? (emoji) => reactToInternalMessage(m, emoji)
                  : undefined
              }
              onSelect={isReadOnlyMode ? undefined : () => toggleSelectMessage(m.id)}
              onForward={isReadOnlyMode ? undefined : () => openManualForward(m)}
              isReadOnly={isReadOnlyMode}
              mentionNameMap={phoneNameMap}
              onEdit={
                !isReadOnlyMode && isMine && !CANT_EDIT_MESSAGE_TYPES.includes(m.type)
                  ? () => handleEditMessage(m)
                  : undefined
              }
            />
          );
        })}
        <ChatPendingSends
          renderedMessages={visibleMessages}
          readOnly={isReadOnlyMode || isSelectionMode}
        />
        <div className="h-1" />
      </ul>
    </div>
  );
}
