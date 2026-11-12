import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import RenderWhatsappChatMessages from "../../src/app/(private)/[instance]/(main)/(chat)/render-whatsapp-chat-messages";
import { useConfirmedReaction } from "../../src/lib/hooks/use-confirmed-reaction";
import { applyMessageReaction, type MessageReactionTarget } from "../../src/lib/utils/message-reactions";
import WhatsappClient from "../../src/lib/sdk-local/whatsapp.client";
import type { MessageReactionSnapshot, WppMessage } from "../../src/lib/sdk-local";
import { authSession } from "../../src/lib/auth-session";
import { WhatsappContext } from "./doubles";
import "../../src/app/globals.css";

const scenario = new URLSearchParams(location.search).get("case") ?? "eligible";
const client = new WhatsappClient(location.origin);
if (scenario === "timeout") client.ax.defaults.timeout = 100;
authSession.setAccessToken("fixture-token");
const now = Date.now();
const initial: WppMessage = {
  id: 17, instance: "odim", chatId: 8, contactId: 9, clientId: 3,
  wabaId: "wamid.fixture", wwebjsId: "remote-fixture", wwebjsIdStanza: null,
  gupshupId: null, gupshupRequestId: null,
  from: "5511974344215", to: "me:odim-legacy-copy", type: "chat",
  body: "Mensagem de teste WABA", timestamp: String(now), sentAt: new Date(now),
  status: "RECEIVED", isForwarded: false, isEdited: false, quotedId: null,
  fileId: null, fileName: null, fileType: null, fileSize: null,
  userId: null, agentId: null, billingCategory: null,
};
const conversation = {
  id: scenario === "different-chat" ? 99 : 8,
  chatType: "wpp",
  isFinished: scenario === "finished",
  wppGroupId: scenario === "group" ? "fixture@g.us" : null,
};
if (scenario === "missing-waba") initial.wabaId = null;
if (scenario === "missing-channel") initial.clientId = null;
if (scenario === "pending") initial.status = "PENDING";
if (scenario === "system") initial.from = "system";
if (scenario === "outbound") { initial.from = "me:odim-legacy-copy"; initial.to = "5511974344215"; }
if (scenario === "old") initial.timestamp = String(now - 31 * 24 * 60 * 60_000);
const provider = ["REMOTE", "WWEBJS", "GUPSHUP"].includes(scenario) ? scenario : "WABA";

function Application() {
  const [messages, setMessages] = useState([initial]);
  const request = useCallback((target: MessageReactionTarget, emoji: string, signal: AbortSignal) =>
    client.setMessageReaction(target.clientId!, target.messageId, emoji, signal), []);
  const apply = useCallback((snapshot: MessageReactionSnapshot) => {
    setMessages((previous) => previous.map((message) => applyMessageReaction(message, snapshot, "http")));
  }, []);
  const confirmedReaction = useConfirmedReaction(request, apply);
  return (
    <WhatsappContext.Provider value={{
      parameters: {}, loaded: true, currentChat: conversation, currentChatMessages: messages,
      channels: [{ id: scenario === "different-channel" ? 4 : 3, name: "Canal de teste", type: provider }],
      reactToMessage: (message: WppMessage, emoji: string) => confirmedReaction({
        messageType: "wpp", messageId: message.id, clientId: message.clientId,
      }, emoji),
    }}>
      <main style={{ padding: 24, maxWidth: 900 }}>
        <RenderWhatsappChatMessages
          selectedMessageIds={new Set()} isSelectionMode={scenario === "selection"}
          toggleSelectMessage={() => {}} openManualForward={() => {}}
          isReadOnlyMode={scenario === "readonly"}
        />
        <output data-testid="errors" aria-label="Erros da reação" />
      </main>
    </WhatsappContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(<Application />);
