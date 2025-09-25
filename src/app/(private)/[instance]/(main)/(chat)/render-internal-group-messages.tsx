"use client";

import React, {
  useState,
  useMemo,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  MutableRefObject,
} from "react";
import { InternalMessage, User } from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import GroupMessage from "./group-message";
import { ChatContext } from "./chat-context";
import { InternalChatContext } from "../../internal-context";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";
import { useAuthContext } from "@/app/auth-context";

function getInternalMessageStyle(msg: InternalMessage, userId: number) {
  if (msg.from === "system") return "system";
  if (msg.from === `user:${userId}`) return "sent";
  return "received";
}

interface RenderInternalGroupMessagesProps {
  selectedMessageIds: Set<string | number>;
  isSelectionMode: boolean;
  toggleSelectMessage: (id: string | number) => void;
  openManualForward: (msg: InternalMessage) => void;
}

const CANT_EDIT_MESSAGE_TYPES = ["audio", "sticker", "ptt"];

const UNREAD_STATUSES = new Set(["received", "unread", "novo", "new"]);

function isMessageUnread(m: InternalMessage, viewerUserId: number): boolean {
  // @ts-ignore
  if (typeof m.isRead === "boolean") return !m.isRead;

  const isFromExternal = m.from?.startsWith("external:");
  const status = (m.status || "").toString().toLowerCase();
  const looksUnread = UNREAD_STATUSES.has(status) || status === "" || status === "pending";
  return isFromExternal && looksUnread;
}

function useMessageRefs<T extends HTMLElement>() {
  const mapRef = useRef(new Map<string | number, T | null>());
  const setRef = (id: string | number) => (el: T | null) => {
    mapRef.current.set(id, el);
  };
  return { mapRef, setRef };
}

export default function RenderInternalGroupMessages({
  selectedMessageIds,
  isSelectionMode,
  toggleSelectMessage,
  openManualForward,
}: RenderInternalGroupMessagesProps) {
  const { currentInternalChatMessages, users } = useContext(InternalChatContext);
  const { getMessageById, handleQuoteMessage, handleEditMessage } =
    useContext(ChatContext);
  const { user } = useAuthContext();
  const { contacts } = useContext(ContactsContext);

  const [visibleCount, setVisibleCount] = useState(30);

  const containerRef = useRef<HTMLDivElement>(null);
  const { mapRef: liRefs, setRef: setLiRef } = useMessageRefs<HTMLLIElement>();

  const anchorRef = useRef<{ type: "unread"; targetId: string | number } | { type: "bottom" } | null>(null);
  const lastAppliedAnchorRef = useRef<string>("");

  const usersMap = useMemo(() => {
    const map = new Map<number, User>();
    users.forEach((u) => map.set(u.CODIGO, u));
    return map;
  }, [users]);

  const mentionNameMap = useMemo(() => {
    const map = new Map<string, string>();

    contacts.forEach((contact) => {
      const phone = contact.phone?.replace(/\D/g, "");
      if (phone && contact.name) {
        map.set(phone, contact.name);
      }
    });

    users.forEach((u) => {
      const phone = u.WHATSAPP?.replace(/\D/g, "");
      if (phone && u.NOME) {
        map.set(phone, u.NOME);
      }
    });

    return map;
  }, [users, contacts]);

  const visibleMessages = useMemo(
    () => currentInternalChatMessages.slice(-visibleCount),
    [currentInternalChatMessages, visibleCount]
  );

  const firstUnreadIndex = useMemo(() => {
    const viewerId = user?.CODIGO ?? 0;
    return currentInternalChatMessages.findIndex((m) => isMessageUnread(m, viewerId));
  }, [currentInternalChatMessages, user?.CODIGO]);

  useMemo(() => {
    if (isSelectionMode) return;

    if (firstUnreadIndex >= 0) {
      const msg = currentInternalChatMessages[firstUnreadIndex];
      if (msg) {
        anchorRef.current = { type: "unread", targetId: msg.id };

        const need = currentInternalChatMessages.length - firstUnreadIndex;
        if (need > visibleCount) {

        }
      }
    } else {
      anchorRef.current = { type: "bottom" };
    }
  }, [firstUnreadIndex, currentInternalChatMessages, visibleCount, isSelectionMode]);

  useEffect(() => {
    if (!anchorRef.current || anchorRef.current.type !== "unread") return;
    const targetId = anchorRef.current.targetId;

    const idx = currentInternalChatMessages.findIndex((m) => m.id === targetId);
    if (idx < 0) return;

    const need = currentInternalChatMessages.length - idx;
    if (need > visibleCount) {
      setVisibleCount((prev) => Math.max(prev, need));
    }
  }, [currentInternalChatMessages, visibleCount]);

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const scrollToMessage = (id: string | number) => {
    const el = containerRef.current;
    const li = liRefs.current.get(id);
    if (!el || !li) return;


    let offset = li.offsetTop;
    let parent = li.offsetParent as HTMLElement | null;
    while (parent && parent !== el) {
      offset += parent.offsetTop;
      parent = parent.offsetParent as HTMLElement | null;
    }

    const topPadding = 12;
    el.scrollTop = Math.max(offset - topPadding, 0);
  };

  useLayoutEffect(() => {
    if (isSelectionMode) return;

    const anchor = anchorRef.current;
    if (!anchor) return;

    let signature = "";
    if (anchor.type === "unread") signature = `unread:${anchor.targetId}`;
    else signature = "bottom";

    if (lastAppliedAnchorRef.current === signature) return;

    if (anchor.type === "unread") {

      scrollToMessage(anchor.targetId);
    } else {
      scrollToBottom();
    }

    lastAppliedAnchorRef.current = signature;
  }, [visibleMessages, isSelectionMode]);

  const pendingLoadMoreRef = useRef<{ prevHeight: number; prevTop: number } | null>(null);
  const handleLoadMore = () => {
    const el = containerRef.current;
    if (el) {
      pendingLoadMoreRef.current = {
        prevHeight: el.scrollHeight,
        prevTop: el.scrollTop,
      };
    }
    setVisibleCount((prev) =>
      Math.min(prev + 30, currentInternalChatMessages.length)
    );
  };

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!pendingLoadMoreRef.current) return;

    const { prevHeight, prevTop } = pendingLoadMoreRef.current;
    const delta = el.scrollHeight - prevHeight;
    el.scrollTop = prevTop + delta;
    pendingLoadMoreRef.current = null;
  }, [visibleMessages]);

  const getSenderName = (message: InternalMessage): string => {
    if (message.from.startsWith("user:")) {
      const userId = Number(message.from.split(":")[1]);
      const findUser = usersMap.get(userId);
      return findUser ? findUser.NOME : "Usuário Desconhecido";
    }

    if (message.from.startsWith("external:")) {
      const parts = message.from.split(":");
      let raw = parts.length > 1 ? parts[parts.length - 1] : "";
      const phone = raw.split("@")[0].replace(/\D/g, "");
      return mentionNameMap.get(phone) || phone || "Contato Externo";
    }
    return "Sistema";
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto p-2 bg-slate-300 dark:bg-slate-900 scrollbar-whatsapp"
      style={{ position: "relative" }}
    >
      {visibleCount < currentInternalChatMessages.length && (
        <div className="flex justify-center mb-2">
          <Button variant="outlined" size="small" onClick={handleLoadMore}>
            Carregar mais
          </Button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {visibleMessages.map((m, i, arr) => {
          const findQuoted =
            m.internalChatId &&
            m.quotedId &&
            (getMessageById(m.internalChatId, m.quotedId, true) as InternalMessage);

          const quotedMsg = findQuoted
            ? getQuotedMsgProps(
                findQuoted,
                getInternalMessageStyle(findQuoted, user!.CODIGO),
                users,
                null,
                mentionNameMap
              )
            : null;

          const prev = i > 0 ? arr[i - 1] : null;
          const groupFirst = !prev || prev.from !== m.from;
          const senderName = getSenderName(m);

          return (
            <li key={m.id} ref={setLiRef(m.id)}>
              <GroupMessage
                id={m.id}
                style={getInternalMessageStyle(m, user!.CODIGO)}
                groupFirst={groupFirst}
                sentBy={senderName}
                text={m.body}
                type={m.type}
                date={new Date(+m.timestamp)}
                status={m.status}
                fileId={m.fileId}
                fileName={m.fileName}
                fileType={m.fileType}
                fileSize={m.fileSize}
                quotedMessage={quotedMsg}
                isForwarded={m.isForwarded}
                onQuote={() => handleQuoteMessage(m)}
                onCopy={() => navigator.clipboard.writeText(m.body)}
                isForwardMode={isSelectionMode}
                isSelected={selectedMessageIds.has(m.id)}
                isEdited={m.isEdited}
                onSelect={() => toggleSelectMessage(m.id)}
                onForward={() => openManualForward(m)}
                mentionNameMap={mentionNameMap}
                onEdit={
                  m.from === `user:${user?.CODIGO}` &&
                  !CANT_EDIT_MESSAGE_TYPES.includes(m.type)
                    ? () => handleEditMessage(m)
                    : undefined
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
