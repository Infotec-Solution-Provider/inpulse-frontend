import { createRoot } from "react-dom/client";
import { useRef, useState } from "react";
import axios from "axios";
import useSessionChanges from "../../src/lib/hooks/use-session-changes";
import { mergeChangedCache, mergeChangedChats } from "../../src/lib/utils/session-change-state";
import processChatsAndMessages from "../../src/lib/process-chats-and-messages";
import type { SocketClient, WhatsappClient, WppMessage } from "../../src/lib/sdk-local";
import type { DetailedChat } from "../../src/app/(private)/[instance]/whatsapp-context";

const connections = new Set<() => void>();
const listeners = new Map<string, Set<() => void>>();
const socket = {
  subscribeConnection(callback: () => void) { connections.add(callback); return () => { connections.delete(callback); }; },
  subscribe(event: string, callback: () => void) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(callback);
    return () => { listeners.get(event)!.delete(callback); };
  },
  joinRoom() {}, leaveRoom() {},
} as unknown as SocketClient;
const api = { ax: axios.create() } as WhatsappClient;
function Harness() {
  const [scope, setScope] = useState("alpha:2");
  const [chats, setChats] = useState<DetailedChat[]>([]);
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({});
  const refresh = useRef(() => {});
  api.ax.defaults.headers.common["x-test-scope"] = scope;
  useSessionChanges({ scope, enabled: true, api, socket, refreshRef: refresh, activeChat: () => null,
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
    <div data-testid="scope">{scope}</div>
    <button onClick={() => connections.forEach((callback) => callback())}>Reconectar</button>
    <button onClick={() => setScope("alpha:3")}>Trocar sessão</button>
    <div data-testid="chat-count">{chats.length}</div>
    {Object.values(messages).flat().map((message) => <p key={message.id} data-testid={`message-${message.id}`}>{message.body}</p>)}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
