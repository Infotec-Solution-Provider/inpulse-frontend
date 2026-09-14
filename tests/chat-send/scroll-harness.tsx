import { useContext, useState } from "react";
import { createRoot } from "react-dom/client";
import ChatProvider, { ChatContext } from "../../src/app/(private)/[instance]/(main)/(chat)/chat-context";
import RenderWhatsappChatMessages from "../../src/app/(private)/[instance]/(main)/(chat)/render-whatsapp-chat-messages";
import RenderInternalChatMessages from "../../src/app/(private)/[instance]/(main)/(chat)/render-internal-chat-messages";
import RenderInternalGroupMessages from "../../src/app/(private)/[instance]/(main)/(chat)/render-internal-group-messages";
import {
  AuthContext, InternalChatContext, WhatsappContext, internal, quotedMessage,
  resolveSend, state, switchChat, useEnvironment, whatsapp,
} from "./doubles";
import "./scroll-harness.css";

const parameters = new URLSearchParams(location.search);
const kind = parameters.get("kind") ?? "wpp";
const long = parameters.get("length") === "long";
const initialMessages = Array.from({ length: long ? 40 : 1 }, (_, index) => ({
  ...quotedMessage,
  id: index + 1,
  body: `Existing message ${index + 1}`,
  from: kind === "wpp" ? quotedMessage.from : "user:2",
  internalChatId: 1,
  clientId: kind === "wpp" ? 23 : null,
}));
switchChat(1, kind === "wpp" ? "wpp" : "internal");

const harness = { state, confirm: (_index = 0) => {} };
declare global {
  interface Window { chatScrollHarness: typeof harness }
}
window.chatScrollHarness = harness;

function Panel() {
  const chat = useContext(ChatContext);
  const rendererProps = {
    selectedMessageIds: new Set<string | number>(),
    isSelectionMode: false,
    toggleSelectMessage: () => {},
    openManualForward: () => {},
    isReadOnlyMode: false,
  };
  const Renderer = kind === "wpp" ? RenderWhatsappChatMessages
    : kind === "internal" ? RenderInternalChatMessages : RenderInternalGroupMessages;
  return (
    <section data-testid="chat-panel" className="scroll-panel">
      <header data-testid="chat-header" className="scroll-chat-header">Conversation</header>
      <div data-testid="message-slot" className="scroll-message-slot"><Renderer {...rendererProps} /></div>
      <footer data-testid="chat-composer" className="scroll-composer">
        <textarea aria-label="Message draft" value={chat.state.text}
          onChange={(event) => chat.dispatch({ type: "change-text", text: event.target.value })}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            void chat.sendMessage();
          }} />
        <button onClick={() => void chat.sendMessage()}>Send</button>
      </footer>
    </section>
  );
}

function Application() {
  const environment = useEnvironment();
  const [messages, setMessages] = useState(initialMessages);
  harness.confirm = (index = 0) => {
    setMessages((previous) => [...previous, {
      ...initialMessages[0], id: 800 + index, from: kind === "wpp" ? "me:23" : "user:1",
      body: state.sends[index].data.text ?? "", status: "SENT",
    }]);
    resolveSend(index);
  };
  const wpp = {
    ...whatsapp, ...environment, currentChatMessages: messages,
    messages: { 101: messages }, channels: [], reactToMessage: () => {},
  };
  const chat = {
    ...internal, currentInternalChatMessages: messages, messages: { 1: messages },
    users: [], contacts: [], phoneNameMap: new Map(), whatsappSenderNameMap: new Map(),
    reactToInternalMessage: () => {},
  };
  return (
    <AuthContext.Provider value={environment.auth}>
      <WhatsappContext.Provider value={wpp as unknown as React.ContextType<typeof WhatsappContext>}>
        <InternalChatContext.Provider value={chat as unknown as React.ContextType<typeof InternalChatContext>}>
          <div className="scroll-shell">
            <header data-testid="app-header" className="scroll-app-header">Application</header>
            <main data-testid="workspace" className="scroll-workspace">
              <ChatProvider><Panel /></ChatProvider>
              <div className="scroll-workspace-tail" />
            </main>
            <div className="scroll-page-tail" />
          </div>
        </InternalChatContext.Provider>
      </WhatsappContext.Provider>
    </AuthContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(<Application />);
