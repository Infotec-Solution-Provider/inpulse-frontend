"use client";

import React, {
  useState,
  useMemo,
  useContext,
  useRef,
  useLayoutEffect,
  useEffect,
} from "react";
import { InternalMessage } from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import Message from "./message";
import { ChatContext } from "./chat-context";
import { InternalChatContext } from "../../internal-context";
import { useAuthContext } from "@/app/auth-context";

const CANT_EDIT_MESSAGE_TYPES = ["audio", "sticker", "ptt"];

const BOTTOM_THRESHOLD_PX = 120;
function isNearBottom(el: HTMLElement, threshold = BOTTOM_THRESHOLD_PX) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

export function getInternalMessageStyle(msg: InternalMessage, userId: number) {
  if (msg.from === "system") return "system";
  if (msg.from === `user:${userId}`) return "sent";
  return "received";
}

const UNREAD_STATUSES = new Set(["received", "unread", "novo", "new", "pending", ""]);

function isMessageUnread(m: InternalMessage, viewerUserId: number): boolean {
  // @ts-ignore
  if (typeof m.isRead === "boolean") return !m.isRead;

  const isFromViewer = m.from === `user:${viewerUserId}`;
  if (isFromViewer) return false;

  const st = (m.status ?? "").toString().toLowerCase();
  return UNREAD_STATUSES.has(st);
}

function useMessageRefs<T extends HTMLElement>() {
  const mapRef = useRef(new Map<string | number, T | null>());
  const setRef = (id: string | number) => (el: T | null) => {
    mapRef.current.set(id, el);
  };
  return { mapRef, setRef };
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
  const { getMessageById, handleQuoteMessage, handleEditMessage } =
    useContext(ChatContext);
  const { user } = useAuthContext();

  const [visibleCount, setVisibleCount] = useState(30);

  const containerRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);
  const [readyToShow, setReadyToShow] = useState(false);

  const { mapRef: liRefs, setRef: setLiRef } = useMessageRefs<HTMLLIElement>();

  const anchorRef = useRef<
    | { type: "unread"; targetId: string | number }
    | { type: "bottom" }
    | null
  >(null);
  const lastAppliedAnchorRef = useRef<string>("");

  const firstUnreadIndex = useMemo(() => {
    const viewerId = user?.CODIGO ?? 0;
    return currentInternalChatMessages.findIndex((m) =>
      isMessageUnread(m, viewerId)
    );
  }, [currentInternalChatMessages, user?.CODIGO]);

  useMemo(() => {
    if (isSelectionMode) return;
    if (firstUnreadIndex >= 0) {
      const msg = currentInternalChatMessages[firstUnreadIndex];
      if (msg) {
        anchorRef.current = { type: "unread", targetId: msg.id };
      }
    } else {
      anchorRef.current = { type: "bottom" };
    }
  }, [firstUnreadIndex, currentInternalChatMessages, isSelectionMode]);

  useEffect(() => {
    if (!anchorRef.current || anchorRef.current.type !== "unread") return;
    const targetId = anchorRef.current.targetId;
    const idx = currentInternalChatMessages.findIndex((m) => m.id === targetId);
    if (idx < 0) return;

    const need = currentInternalChatMessages.length - idx; // quantas do fim até a âncora
    if (need > visibleCount) {
      setVisibleCount((prev) => Math.max(prev, need));
    }
  }, [currentInternalChatMessages, visibleCount]);

  const visibleMessages = useMemo(
    () => currentInternalChatMessages.slice(-visibleCount),
    [currentInternalChatMessages, visibleCount]
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || didInitRef.current) return;

    const anchor = anchorRef.current;
    if (anchor?.type === "unread") {
      const li = liRefs.current.get(anchor.targetId);
      if (li) {
        let offset = li.offsetTop;
        let parent = li.offsetParent as HTMLElement | null;
        while (parent && parent !== el) {
          offset += parent.offsetTop;
          parent = parent.offsetParent as HTMLElement | null;
        }
        el.scrollTop = Math.max(offset - 12, 0);
      } else {
        el.scrollTop = el.scrollHeight;
      }
    } else {
      el.scrollTop = el.scrollHeight;
    }

    didInitRef.current = true;
    setReadyToShow(true);
  }, [visibleMessages]);
  useLayoutEffect(() => {
    if (!didInitRef.current || isSelectionMode) return;
    const el = containerRef.current;
    if (!el) return;
    if (isNearBottom(el)) {
      el.scrollTop = el.scrollHeight;
    }
  }, [currentInternalChatMessages, isSelectionMode]);

  useLayoutEffect(() => {
    if (!didInitRef.current || isSelectionMode) return;

    const el = containerRef.current;
    if (!el) return;

    const anchor = anchorRef.current;
    if (!anchor) return;

    const signature =
      anchor.type === "unread" ? `unread:${anchor.targetId}` : "bottom";
    if (lastAppliedAnchorRef.current === signature) return;

    if (anchor.type === "unread") {
      const li = liRefs.current.get(anchor.targetId);
      if (li) {
        let offset = li.offsetTop;
        let parent = li.offsetParent as HTMLElement | null;
        while (parent && parent !== el) {
          offset += parent.offsetTop;
          parent = parent.offsetParent as HTMLElement | null;
        }
        el.scrollTop = Math.max(offset - 12, 0);
      }
    } else {
      el.scrollTop = el.scrollHeight;
    }

    lastAppliedAnchorRef.current = signature;
  }, [visibleMessages, isSelectionMode]);

  const pendingLoadMoreRef = useRef<{ prevHeight: number; prevTop: number } | null>(
    null
  );
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
    if (!el || !pendingLoadMoreRef.current) return;
    const { prevHeight, prevTop } = pendingLoadMoreRef.current;
    const delta = el.scrollHeight - prevHeight;
    el.scrollTop = prevTop + delta;
    pendingLoadMoreRef.current = null;
  }, [visibleMessages]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto p-2 bg-slate-300 dark:bg-slate-900 scrollbar-whatsapp"
      style={{
        visibility: readyToShow ? "visible" : "hidden",
        position: "relative",
      }}
    >
      {visibleCount < currentInternalChatMessages.length && (
        <div className="flex justify-center mb-2">
          <Button variant="outlined" size="small" onClick={handleLoadMore}>
            Carregar mais
          </Button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {visibleMessages.map((m) => {
          const findQuoted =
            m.internalChatId &&
            m.quotedId &&
            (getMessageById(m.internalChatId, m.quotedId, true) as InternalMessage);

          const quotedMsg = findQuoted
            ? getQuotedMsgProps(
                findQuoted,
                getInternalMessageStyle(findQuoted, user!.CODIGO),
                users
              )
            : null;

          return (
            <li key={`message_${m.id}`} ref={setLiRef(m.id)}>
              <Message
                id={m.id}
                style={getInternalMessageStyle(m, user!.CODIGO)}
                text={m.body}
                type={m.type}
                date={new Date(+m.timestamp)}
                status={m.status}
                fileId={m.fileId}
                fileName={m.fileName}
                fileType={m.fileType}
                fileSize={m.fileSize}
                quotedMessage={quotedMsg}
                onQuote={() => handleQuoteMessage(m)}
                isSelected={selectedMessageIds.has(m.id)}
                onSelect={toggleSelectMessage}
                onForward={() => openManualForward(m)}
                onCopy={() => navigator.clipboard.writeText(m.body ?? "")}
                isForwardMode={isSelectionMode}
                isForwarded={m.isForwarded}
                isEdited={m.isEdited}
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
