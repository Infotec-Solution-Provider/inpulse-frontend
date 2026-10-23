import { createRoot } from "react-dom/client";
import { useRef, useState } from "react";
import ApiClient from "../../src/lib/sdk-local/api-client";
import useSessionChanges from "../../src/lib/hooks/use-session-changes";
import { mergeChangedCache, mergeChangedChats } from "../../src/lib/utils/session-change-state";
import processChatsAndMessages from "../../src/lib/process-chats-and-messages";
import type { SocketClient, WhatsappClient, WppMessage } from "../../src/lib/sdk-local";
import type { DetailedChat } from "../../src/app/(private)/[instance]/whatsapp-context";
import useSocketActivity from "../../src/lib/hooks/use-socket-activity";
import ConversationSyncStatus from "../../src/lib/components/conversation-sync-status";
import type { SyncStatus } from "../../src/lib/hooks/use-session-changes";
import "./harness.css";

const connections = new Set<() => void>();
const listeners = new Map<string, Set<() => void>>();
const states = new Set<(state: "connected" | "connecting" | "disconnected") => void>();
const activity = new Set<(event: string) => void>();
const socket = {
  subscribeConnection(callback: () => void) { connections.add(callback); return () => { connections.delete(callback); }; },
  subscribe(event: string, callback: () => void) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(callback);
    return () => { listeners.get(event)!.delete(callback); };
  },
  joinRoom() {}, leaveRoom() {},
  subscribeConnectionState(callback: (state: "connected" | "connecting" | "disconnected") => void) {
    states.add(callback); callback("connected"); return () => { states.delete(callback); };
  },
  subscribeActivity(callback: (event: string) => void) { activity.add(callback); return () => { activity.delete(callback); }; },
} as unknown as SocketClient;
const api = new ApiClient("") as unknown as WhatsappClient;
function Harness() {
  const [scope, setScope] = useState("alpha:2");
  const [chats, setChats] = useState<DetailedChat[]>([]);
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({});
  const refresh = useRef(() => {});
  const manual = useRef(() => {});
  const [sync, setSync] = useState<SyncStatus>({ isRefreshing: false, error: false, lastSuccessAt: null });
  const socketActivity = useSocketActivity(socket, scope, true);
  api.ax.defaults.headers.common["x-test-scope"] = scope;
  useSessionChanges({ scope, enabled: true, api, socket, refreshRef: refresh, manualRefreshRef: manual, activeChat: () => null,
    onSyncStatus(patch) { setSync((previous) => ({ ...previous, ...patch })); },
    snapshot(value) {
      const processed = processChatsAndMessages(value.chats, value.messages);
      setChats(processed.detailedChats); setMessages(processed.chatsMessages);
    },
    changes(value) {
      setChats((previous) => mergeChangedChats(previous, value));
      setMessages((previous) => mergeChangedCache(previous, value));
    },
  });
  return <main>
    <ConversationSyncStatus {...socketActivity} sync={sync} onRefresh={() => manual.current()} />
    <div data-testid="scope">{scope}</div>
    <button onClick={() => { states.forEach((callback) => callback("connected")); connections.forEach((callback) => callback()); }}>Reconectar</button>
    <button onClick={() => states.forEach((callback) => callback("disconnected"))}>Interromper conexão</button>
    <button onClick={() => activity.forEach((callback) => callback("wpp_message"))}>Evento WebSocket</button>
    <button onClick={() => setScope("alpha:3")}>Trocar sessão</button>
    <div data-testid="chat-count">{chats.length}</div>
    {Object.values(messages).flat().map((message) => <p key={message.id} data-testid={`message-${message.id}`}>{message.body}</p>)}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
