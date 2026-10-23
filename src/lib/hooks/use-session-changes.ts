import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { SocketClient, WhatsappClient, WppChatsAndMessages } from "@/lib/sdk-local";
import { SocketEventType } from "../sdk-local/types/socket-events.types";
import { SessionChangePoller, syncErrorResponse, type ChangePage } from "../utils/session-change-poller";
import type { SessionChanges } from "../utils/session-change-state";

type Snapshot = WppChatsAndMessages & { syncCursor: string };
interface Options {
  scope: string;
  enabled: boolean;
  api: WhatsappClient;
  socket: SocketClient;
  refreshRef: MutableRefObject<() => void>;
  manualRefreshRef?: MutableRefObject<() => void>;
  onSyncStatus?: (patch: Partial<SyncStatus>) => void;
  activeChat: () => { id: number; chatType: string } | null;
  snapshot: (value: Snapshot) => void;
  changes: (value: SessionChanges) => void;
}

export interface SyncStatus { isRefreshing: boolean; error: boolean; lastSuccessAt: number | null }

export default function useSessionChanges(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  useEffect(() => {
    if (!options.enabled) return;
    let generation = 0;
    let observedChat = "";
    const rooms = new Set<number>();
    const reconcileRooms = (ids: number[], removed: number[] = []) => {
      for (const id of removed) { options.socket.leaveRoom(`chat:${id}`); rooms.delete(id); }
      for (const id of ids) if (!rooms.has(id)) { options.socket.joinRoom(`chat:${id}`); rooms.add(id); }
    };
    const scope = options.scope;
    const poller = new SessionChangePoller<Snapshot, SessionChanges>({
      canRun: () => latest.current.scope === scope && document.visibilityState !== "hidden" && navigator.onLine !== false,
      generation: () => {
        const active = latest.current.activeChat();
        const key = active ? `${active.chatType}:${active.id}` : "";
        if (key !== observedChat) { observedChat = key; generation++; }
        return generation;
      },
      snapshot: async (signal) => {
        const { data } = await latest.current.api.ax.get<{ data: Snapshot }>(
          "/api/whatsapp/session/chats?messages=false&contact=true", { signal });
        const snapshot = data.data;
        const active = latest.current.activeChat();
        if (active?.chatType === "wpp" && snapshot.chats.some((chat) => chat.id === active.id)) {
          const history = await latest.current.api.ax.get<{ data: { messages: Snapshot["messages"] } }>(
            `/api/whatsapp/chats/${active.id}`, { signal });
          snapshot.messages = history.data.data.messages;
        }
        return snapshot;
      },
      changes: async (cursor, signal) => {
        const { data } = await latest.current.api.ax.get<{ data: ChangePage<SessionChanges> }>(
          "/api/whatsapp/session/changes", { signal, params: { cursor, limit: 100 } });
        return data.data;
      },
      applySnapshot: (value) => {
        if (latest.current.scope !== scope) return;
        latest.current.snapshot(value);
        const ids = value.chats.map((chat) => chat.id);
        reconcileRooms(ids, [...rooms].filter((id) => !ids.includes(id)));
        latest.current.onSyncStatus?.({ error: false, lastSuccessAt: Date.now() });
      },
      applyChanges: (value) => {
        if (latest.current.scope !== scope) return;
        latest.current.changes(value);
        reconcileRooms(value.chats.map((chat) => chat.id), value.removedChatIds);
        latest.current.onSyncStatus?.({ error: false, lastSuccessAt: Date.now() });
      },
      onError: (error) => {
        // Do not log payloads, tokens or Axios configs containing customer data.
        const status = syncErrorResponse(error)?.status;
        console.warn("[message-sync] recovery deferred", { status: status ?? "network" });
        if (latest.current.scope === scope) latest.current.onSyncStatus?.({ error: true });
      },
      onRunning: (isRefreshing) => {
        if (latest.current.scope === scope) latest.current.onSyncStatus?.({ isRefreshing });
      },
    });
    const wake = () => poller.wake();
    const reconnect = () => {
      for (const id of rooms) options.socket.joinRoom(`chat:${id}`);
      wake();
    };
    const reset = () => poller.wake(true);
    options.refreshRef.current = reset;
    if (options.manualRefreshRef) options.manualRefreshRef.current = wake;
    const cleanups = [
      options.socket.subscribeConnection(reconnect),
      ...[
        SocketEventType.WppMessage, SocketEventType.WppMessageEdit, SocketEventType.WppMessageDelete,
        SocketEventType.WppMessageStatus, SocketEventType.WppChatStarted, SocketEventType.WppChatFinished,
        SocketEventType.WppChatTransfer, SocketEventType.WppContactMessagesRead,
      ].map((event) => options.socket.subscribe(event, () => { generation++; })),
    ];
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    wake();
    return () => {
      poller.stop();
      for (const id of rooms) options.socket.leaveRoom(`chat:${id}`);
      if (options.refreshRef.current === reset) options.refreshRef.current = () => {};
      if (options.manualRefreshRef?.current === wake) options.manualRefreshRef.current = () => {};
      cleanups.forEach((cleanup) => cleanup());
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, [options.scope, options.enabled, options.api, options.socket, options.refreshRef]);
}
