import { SocketClient, WhatsappClient, WppChatType, WppMessage } from "@in.pulse-crm/sdk";
import { safeNotification } from "@/lib/utils/notifications";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { Logger } from "@in.pulse-crm/utils";

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
    const res = await api.getChatById(chatId);
    const { messages, ...chat } = res;
    Logger.debug("ChatStartedHandler: New chat started", { chat, messages });

    const isUnread = true;

    const lastMessage = messages?.reduce((prev, current) => {
      return +prev.timestamp > +current.timestamp ? prev : current;
    }, messages[0]);

    socket.joinRoom(`chat:${chat.id}`);

    safeNotification("Novo atendimento!", {
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
