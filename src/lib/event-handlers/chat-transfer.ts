import { SocketClient, WhatsappClient, WppMessage } from "@/lib/sdk-local";
import { safeNotification } from "@/lib/utils/notifications";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, RefObject, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";

interface HandleChatTransferredCallbackProps {
  chatId: number;
}

export default function ChatTransferHandler(
  api: WhatsappClient,
  socket: SocketClient,
  chats: DetailedChat[] | RefObject<DetailedChat[]>,
  currentChat:
    | DetailedChat
    | DetailedInternalChat
    | null
    | RefObject<DetailedChat | DetailedInternalChat | null>,
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
  setCurrentChat: Dispatch<SetStateAction<DetailedChat | DetailedInternalChat | null>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
) {
  return async ({ chatId }: HandleChatTransferredCallbackProps) => {
    const currentChats = Array.isArray(chats) ? chats : chats.current;
    const selectedChat =
      currentChat && "current" in currentChat ? currentChat.current : currentChat;
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    const chat = currentChats.find((c) => c.id === chatId);
    if (!chat) return;
    setMessages((prev) => {
      if (chat.contactId && prev[chat.contactId]) {
        delete prev[chat.contactId];
      }
      return { ...prev };
    });

    safeNotification("Atendimento Transferido!", {
      body: `Contato: ${chat.contact?.name || "Contato excluído"}`,
      icon: HorizontalLogo.src,
    });
    api.getChatsBySession();

    if (selectedChat?.chatType === "wpp" && selectedChat.id === chatId) {
      setCurrentChat(null);
      setCurrentChatMessages([]);
    }
  };
}
