import { SocketClient, WhatsappClient, WppMessage } from "@in.pulse-crm/sdk";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";

interface HandleChatStartedCallbackProps {
  chatId: number;
}

export default function ChatStartedHandler(
  api: WhatsappClient,
  socket: SocketClient,
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
) {
  return async ({ chatId }: HandleChatStartedCallbackProps) => {
    const { messages, ...chat } = await api.getChatById(chatId);
    const isUnread = messages.some((m) => m.contactId === chat.contactId && m.status !== "READ");
    const lastMessage = messages.find((m) => m.contactId === chat.contactId) || null;

    socket.joinRoom(`chat:${chat.id}`);

    new Notification("Novo atendimento!", {
      body: `Contato: ${chat.contact?.name || "Contato excluído"}`,
      icon: HorizontalLogo.src,
    });

    setMessages((prev) => {
      const newMessages = { ...prev };
      const contactId = chat.contactId || 0;

      if (!newMessages[contactId]) {
        newMessages[contactId] = messages;
      } else {
        newMessages[contactId] = [...newMessages[contactId], ...messages];
      }

      return newMessages;
    });

    setChats((prev) => {
      const chatIndex = prev.findIndex((c) => c.id === chat.id);
      if (chatIndex !== -1) {
        return prev;
      }
      return [{ ...chat, isUnread, lastMessage }, ...prev];
    });
  };
}
