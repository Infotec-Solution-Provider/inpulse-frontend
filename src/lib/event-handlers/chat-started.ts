import { SocketClient, WhatsappClient, WppChatType, WppMessage } from "@in.pulse-crm/sdk";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";

interface HandleChatStartedCallbackProps {
  chatId: number;
}

export default function ChatStartedHandler(
  api: WhatsappClient,
  socket: SocketClient,
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
  setCurrentChat: Dispatch<SetStateAction<DetailedChat | DetailedInternalChat | null>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
) {
  return async ({ chatId }: HandleChatStartedCallbackProps) => {
    const { messages, ...chat } = await api.getChatById(chatId);
    const isUnread = true;
    // find most recent message
    const lastMessage = messages.reduce((prev, current) => {
      return +prev.timestamp > +current.timestamp ? prev : current;
    }, messages[0]);

    socket.joinRoom(`chat:${chat.id}`);

    new Notification("Novo atendimento!", {
      body: `Contato: ${chat.contact?.name || "Contato excluído"}`,
      icon: HorizontalLogo.src,
    });

    const parsedChat: DetailedChat = { ...chat, isUnread, lastMessage, chatType: "wpp" };

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
      return [parsedChat, ...prev];
    });

    if (chat.type === WppChatType.RECEPTIVE) {
      setCurrentChat(parsedChat);
      setCurrentChatMessages(messages);
    }
  };
}
