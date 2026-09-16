import { useContext, useEffect } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import WhatsappProvider, { WhatsappContext, type DetailedChat } from "../../src/app/(private)/[instance]/whatsapp-context";
import ChatProvider, { ChatContext } from "../../src/app/(private)/[instance]/(main)/(chat)/chat-context";
import ChatPendingSends from "../../src/app/(private)/[instance]/(main)/(chat)/chat-pending-sends";
import { authSession, skipAuthInterceptors } from "../../src/lib/auth-session";
import { auth } from "./doubles";

authSession.setAccessToken(auth.token);
authSession.configure({ instance: auth.instance, onInvalid: () => undefined, refresh: async () => {
  const response = await axios.post("/test-api/refresh", {}, skipAuthInterceptors());
  return response.data.token;
} });
const makeChat = (id: number) => ({
  id, instance: "tenant-a", chatType: "wpp", contactId: id + 100,
  contact: { id: id + 100, phone: `55119000000${id}` },
}) as DetailedChat;

function Controls() {
  const wpp = useContext(WhatsappContext);
  const chat = useContext(ChatContext);
  useEffect(() => { wpp.setCurrentChat(makeChat(1)); }, []);
  return <main>
    <output data-testid="ready">{String(wpp.loaded)}</output>
    <output data-testid="chat">{wpp.currentChat?.id}</output>
    <textarea aria-label="Message draft" value={chat.state.text} onChange={(event) => chat.dispatch({ type: "change-text", text: event.target.value })} />
    <button onClick={() => void chat.sendMessage()}>Send</button>
    <button onClick={() => {
      for (let index = 0; index < 20; index++) {
        chat.dispatch({ type: "change-text", text: `Burst ${index}` });
        void chat.sendMessage();
      }
    }}>Burst</button>
    <button onClick={() => wpp.setCurrentChat(makeChat(2))}>Chat two</button>
    <button onClick={() => wpp.setCurrentChat(makeChat(1))}>Chat one</button>
    <button onClick={() => chat.dispatch({ type: "quote-message", id: 77 })}>Quote</button>
    <button onClick={() => chat.dispatch({ type: "attach-file", file: new File(["file body"], "document.pdf", { type: "application/pdf" }) })}>Attach</button>
    <button onClick={() => authSession.setAccessToken(`header.${btoa(JSON.stringify({ exp: 1 }))}.signature`)}>Expire token</button>
    <button onClick={() => authSession.setAccessToken(`header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 30 }))}.signature`)}>Nearly expired token</button>
    <output data-testid="pending">{JSON.stringify(chat.pendingSends.map(({ id, status, error, diagnostic }) => ({ id, status, error, diagnostic })))}</output>
    <ul><ChatPendingSends /></ul>
  </main>;
}
createRoot(document.getElementById("root")!).render(<WhatsappProvider><ChatProvider><Controls /></ChatProvider></WhatsappProvider>);
