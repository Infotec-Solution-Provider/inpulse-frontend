import { createContext, useContext, type ReactNode } from "react";
import ApiClient from "../../src/lib/sdk-local/api-client";
import { startUserChat } from "../../src/lib/utils/start-user-chat";

const api = new ApiClient("");
export const pendingContact = { current: null as number | null };
const latestRequest = { current: 0 };
const official = new URLSearchParams(location.search).has("official");
export const WhatsappContext = createContext({
  parameters: { is_official: String(official) },
  templates: [{ id: "welcome", name: "Boas-vindas", text: "Olá", source: "waba" }],
  chats: [], monitorChats: [],
  openChat() {}, loadChatMessages: async () => [], prepareReadOnlyOpen() {},
  wppApi: { current: api },
  startChatByContactId: (contactId: number, template?: unknown) =>
    startUserChat(pendingContact, latestRequest, contactId, async () => {
      await api.ax.post("/api/whatsapp/chats", { contactId, template });
    }),
});
export const useWhatsappContext = () => useContext(WhatsappContext);
export const AppContext = createContext({ openModal: (_node: ReactNode) => {}, closeModal() {} });
export const useAppContext = () => useContext(AppContext);
