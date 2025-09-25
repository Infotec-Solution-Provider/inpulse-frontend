"use client";

import React, {
  useState,
  useMemo,
  useContext,
  useRef,
  useLayoutEffect,
  useEffect,
} from "react";
import { WppMessage } from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import Message from "./message";
import { ChatContext } from "./chat-context";
import { DetailedChat, useWhatsappContext } from "../../whatsapp-context";
import { AuthContext } from "@/app/auth-context";

const CANT_EDIT_MESSAGE_TYPES = ["audio", "sticker", "ptt"];

function getWppMessageStyle(msg: WppMessage) {
  if (msg.from.startsWith("system")) return "system";
  if (msg.from.startsWith("me:") || msg.from.startsWith("bot:")) return "sent";
  if (msg.from.startsWith("thirdparty")) return "thirdparty";
  return "received";
}

const UNREAD_STATUSES = new Set(["received", "unread", "novo", "new", "pending", ""]);

function isMessageUnread(m: WppMessage): boolean {
  // @ts-ignore
  if (typeof m.isRead === "boolean") return !m.isRead;

  const from = m.from ?? "";
  const isFromMeOrSystem =
    from.startsWith("me:") ||
    from.startsWith("bot:") ||
    from.startsWith("system") ||
    from.startsWith("thirdparty");

  if (isFromMeOrSystem) return false;

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

const BOTTOM_THRESHOLD_PX = 120;
function isNearBottom(el: HTMLElement, threshold = BOTTOM_THRESHOLD_PX) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

interface RenderWhatsappChatMessagesProps {
  selectedMessageIds: Set<string | number>;
  isSelectionMode: boolean;
  toggleSelectMessage: (id: string | number) => void;
  openManualForward: (msg: WppMessage) => void;
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

  const containerRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);
  const [readyToShow, setReadyToShow] = useState(false);

  const { mapRef: liRefs, setRef: setLiRef } = useMessageRefs<HTMLLIElement>();

  const pendingLoadMoreRef = useRef<{ prevHeight: number; prevTop: number } | null>(null);

  const anchorRef = useRef<
    { type: "unread"; targetId: string | number } | { type: "bottom" } | null
  >(null);
  const lastAppliedAnchorRef = useRef<string>("");

  const messagesToRender = useMemo(
    () =>
      instance === "nunes"
        ? (() => {
            const boolArray = [...currentChatMessages].map(
              (msg) =>
                msg.from === "system" &&
                (msg.body?.startsWith("Atendimento transferido") ?? false)
            );
            const lastTransferIndex = boolArray.lastIndexOf(true);
            return lastTransferIndex !== -1
              ? currentChatMessages.slice(lastTransferIndex)
              : currentChatMessages;
          })()
        : currentChatMessages,
    [currentChatMessages, instance]
  );

  const visibleMessages = useMemo(
    () => messagesToRender.slice(-visibleCount),
    [messagesToRender, visibleCount]
  );

  const firstUnreadIndex = useMemo(
    () => messagesToRender.findIndex((m) => isMessageUnread(m)),
    [messagesToRender]
  );

  useMemo(() => {
    if (isSelectionMode) return;

    if (firstUnreadIndex >= 0) {
      const msg = messagesToRender[firstUnreadIndex];
      if (msg) {
        anchorRef.current = { type: "unread", targetId: msg.id };
      }
    } else {
      anchorRef.current = { type: "bottom" };
    }
  }, [firstUnreadIndex, messagesToRender, isSelectionMode]);

  useEffect(() => {
    if (!anchorRef.current || anchorRef.current.type !== "unread") return;
    const targetId = anchorRef.current.targetId;
    const idx = messagesToRender.findIndex((m) => m.id === targetId);
    if (idx < 0) return;

    const need = messagesToRender.length - idx;
    if (need > visibleCount) {
      setVisibleCount((prev) => Math.max(prev, need));
    }
  }, [messagesToRender, visibleCount]);

  useLayoutEffect(() => {
    if (didInitRef.current) return;
    const el = containerRef.current;
    if (!el) return;

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

  useLayoutEffect(() => {
    if (!didInitRef.current || isSelectionMode) return;

    const el = containerRef.current;
    if (!el) return;

    if (isNearBottom(el)) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messagesToRender, isSelectionMode]);

  const handleLoadMore = () => {
    const el = containerRef.current;
    if (el) {
      pendingLoadMoreRef.current = {
        prevHeight: el.scrollHeight,
        prevTop: el.scrollTop,
      };
    }
    setVisibleCount((prev) => Math.min(prev + 30, messagesToRender.length));
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

  return (
    <div
      ref={containerRef}
      className="scrollbar-whatsapp h-full w-full overflow-y-auto bg-slate-300 p-2 dark:bg-slate-900"
      style={{
        visibility: readyToShow ? "visible" : "hidden",
        position: "relative",
      }}
    >
      {visibleCount < messagesToRender.length && (
        <div className="mb-2 flex justify-center">
          <Button variant="outlined" size="small" onClick={handleLoadMore}>
            Carregar mais
          </Button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {visibleMessages.map((m) => {
          const findQuoted =
            m.contactId && m.quotedId && getMessageById(m.contactId, m.quotedId);

          const quotedMsgProps =
            findQuoted && "to" in findQuoted
              ? getQuotedMsgProps(
                  findQuoted,
                  getWppMessageStyle(findQuoted as unknown as WppMessage),
                  [],
                  {} as DetailedChat
                )
              : null;

          return (
            <li key={m.id} ref={setLiRef(m.id)}>
              <Message
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
                  m.from.startsWith("me:") &&
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
