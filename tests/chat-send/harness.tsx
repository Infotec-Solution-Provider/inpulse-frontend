import { useContext, useState } from "react";
import { createRoot } from "react-dom/client";
import ChatProvider, { ChatContext } from "../../src/app/(private)/[instance]/(main)/(chat)/chat-context";
import ChatPendingSends from "../../src/app/(private)/[instance]/(main)/(chat)/chat-pending-sends";
import PendingSendStatus from "../../src/app/(private)/[instance]/(main)/(chat)/pending-send-status";
import "./harness.css";
import {
  AuthContext,
  InternalChatContext,
  WhatsappContext,
  internal,
  quotedMessage,
  refreshToken,
  rejectSend,
  resolveLookup,
  resolveSend,
  state,
  switchChannel,
  switchChat,
  switchTenant,
  useEnvironment,
  whatsapp,
} from "./doubles";

const harness = {
  state,
  resolveSend,
  rejectSend,
  resolveLookup,
  switchChat,
  switchTenant,
  switchChannel,
  refreshToken,
};
declare global {
  interface Window { chatSendHarness: typeof harness }
}
window.chatSendHarness = harness;

function Composer() {
  const chat = useContext(ChatContext);
  const [receipts, setReceipts] = useState<{ id: number; clientId?: number; text: string }[]>([]);
  return (
    <main>
      <textarea
        aria-label="Message draft"
        value={chat.state.text}
        onChange={(event) => chat.dispatch({ type: "change-text", text: event.target.value })}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          void chat.sendMessage();
        }}
      />
      <button disabled={chat.isSending} onClick={() => void chat.sendMessage()}>Send</button>
      <button onClick={() => { void chat.sendMessage(); void chat.sendMessage(); }}>Dispatch twice</button>
      <button onClick={() => chat.handleQuoteMessage(quotedMessage)}>Quote</button>
      <button onClick={() => chat.dispatch({
        type: "attach-file",
        file: new File(["attachment content"], "example.pdf", { type: "application/pdf" }),
      })}>Attach</button>
      <button onClick={() => chat.dispatch({
        type: "set-mentions",
        mentions: [{ userId: 9, name: "Operator", phone: "5511999999999" }],
      })}>Mention</button>
      <button onClick={() => setReceipts(chat.pendingSends
        .filter((attempt) => !!attempt.messageId)
        .map((attempt) => ({ id: attempt.messageId!, clientId: attempt.clientId, text: attempt.snapshot.text })),
      )}>Show server receipt</button>
      <output data-testid="is-sending">{String(chat.isSending)}</output>
      <output data-testid="quoted-message">{chat.quotedMessage?.id ?? "none"}</output>
      <output data-testid="file">{chat.state.file?.name ?? "none"}</output>
      <output data-testid="mentions">{JSON.stringify(chat.state.mentions ?? [])}</output>
      <div data-testid="pending-ui" className="pending-preview">
        <ul>
          {receipts.map((receipt) => {
            const attempt = chat.pendingSends.find((entry) => entry.messageId === receipt.id && entry.clientId === receipt.clientId);
            return (
              <li key={`${receipt.clientId}:${receipt.id}`} data-testid="server-receipt" className="receipt-preview">
                <p>{receipt.text}</p>
                {attempt && <PendingSendStatus attempt={attempt} />}
              </li>
            );
          })}
          <ChatPendingSends renderedMessages={receipts} />
        </ul>
      </div>
      <ul data-testid="pending-list">
        {chat.pendingSends.map((pending) => (
          <li key={pending.id} data-testid="pending-send" data-id={pending.id} data-message-id={pending.messageId}>
            <span data-testid="pending-text">{pending.snapshot.text}</span>
            <span data-testid="pending-status">{pending.status}</span>
            <span data-testid="pending-check">{chat.pendingSendChecks[pending.id] ?? "none"}</span>
            <button onClick={() => void chat.checkPendingSend(pending.id)}>Check</button>
            <button onClick={() => chat.restoreFailedSend(pending.id)}>Restore</button>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Application() {
  const environment = useEnvironment();
  return (
    <AuthContext.Provider value={environment.auth}>
      <WhatsappContext.Provider value={{ ...whatsapp, ...environment }}>
        <InternalChatContext.Provider value={internal}>
          <output data-testid="tenant">{environment.auth.instance}</output>
          <output data-testid="chat-id">{environment.currentChat.id}</output>
          <output data-testid="token">{environment.auth.token}</output>
          <ChatProvider><Composer /></ChatProvider>
        </InternalChatContext.Provider>
      </WhatsappContext.Provider>
    </AuthContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(<Application />);
