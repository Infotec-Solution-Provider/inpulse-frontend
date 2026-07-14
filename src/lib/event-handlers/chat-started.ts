import { SocketClient, WhatsappClient, WppChatType, WppMessage } from "@/lib/sdk-local";
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
  userInitiatedChatContactId: React.RefObject<number | null>,
  notify?: (payload: {
    event: "new_conversation";
    title: string;
    body: string;
    isChatFocused: boolean;
  }) => void,
) {
  return async ({ chatId }: HandleChatStartedCallbackProps) => {
    const res = await api.getChatById(chatId);
    const { messages, ...chat } = res;

    const isUnread = true;

    const lastMessage = messages?.reduce((prev, current) => {
      return +prev.timestamp > +current.timestamp ? prev : current;
    }, messages[0]);

    socket.joinRoom(`chat:${chat.id}`);

    notify?.({
      event: "new_conversation",
      title: "Novo atendimento!",
      body: `Contato: ${chat.contact?.name || "Contato excluído"}`,
      isChatFocused: false,
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

    // Se o usuário iniciou este chat manualmente, seleciona automaticamente
    if (userInitiatedChatContactId.current === chat.contactId) {
      setCurrentChat(parsedChat);
      setCurrentChatMessages(messages);
      userInitiatedChatContactId.current = null; // Limpa a flag
    }
  };
}
