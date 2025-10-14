"use client";

import { useAuthContext } from "@/app/auth-context";
import getInternalMessageAuthor from "@/lib/utils/get-internal-message-author";
import { InternalMessage } from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";
import { InternalChatContext } from "../../internal-context";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import { ChatContext } from "./chat-context";
import GroupMessage from "./group-message";

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
}

const CANT_EDIT_MESSAGE_TYPES = ["audio", "sticker", "ptt"];

export default function RenderInternalGroupMessages({
  selectedMessageIds,
  isSelectionMode,
  toggleSelectMessage,
  openManualForward,
}: RenderInternalGroupMessagesProps) {
  const { currentInternalChatMessages, users } = useContext(InternalChatContext);
  const { getMessageById, handleQuoteMessage, handleEditMessage } = useContext(ChatContext);
  const { user } = useAuthContext();
  const { phoneNameMap } = useContext(ContactsContext);

  const [visibleCount, setVisibleCount] = useState(30);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSelectionMode && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, [currentInternalChatMessages, isSelectionMode]);

  const visibleMessages = useMemo(
    () => (currentInternalChatMessages ?? []).slice(-visibleCount),
    [currentInternalChatMessages, visibleCount],
  );
  return (
    <div className="scrollbar-whatsapp h-full w-full overflow-y-auto bg-slate-300 p-2 dark:bg-slate-900">
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

      <ul className="flex flex-col gap-2">
        {visibleMessages.map((m, i, arr) => {
          const findQuoted =
            m.internalChatId &&
            m.quotedId &&
            (getMessageById(m.internalChatId, m.quotedId, true) as InternalMessage | null);

          const quotedMsg = findQuoted
            ? getQuotedMsgProps(
                findQuoted,
                getInternalMessageStyle(findQuoted, user?.CODIGO),
                users ?? [],
                null,
                phoneNameMap,
              )
            : null;

          const prev = i > 0 ? arr[i - 1] : null;
          const groupFirst = !prev || prev.from !== m.from;
          const senderName = getInternalMessageAuthor(m, phoneNameMap, users);
          const isMine = user?.CODIGO != null && m.from === `user:${user.CODIGO}`;

          return (
            <GroupMessage
              key={String(m.id)}
              id={m.id}
              style={getInternalMessageStyle(m, user?.CODIGO)}
              groupFirst={groupFirst}
              sentBy={senderName}
              text={m.body ?? ""}
              type={m.type}
              date={new Date(Number(m.timestamp))}
              status={m.status}
              fileId={m.fileId}
              fileName={m.fileName}
              fileType={m.fileType}
              fileSize={m.fileSize}
              quotedMessage={quotedMsg}
              isForwarded={m.isForwarded}
              onQuote={() => handleQuoteMessage(m)}
              onCopy={() => navigator.clipboard.writeText(m.body ?? "")}
              isForwardMode={isSelectionMode}
              isSelected={selectedMessageIds.has(m.id)}
              isEdited={m.isEdited}
              onSelect={() => toggleSelectMessage(m.id)}
              onForward={() => openManualForward(m)}
              mentionNameMap={phoneNameMap}
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
