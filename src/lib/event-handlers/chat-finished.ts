import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { safeNotification } from "@/lib/utils/notifications";
import { SocketClient, WppMessage } from "@/lib/sdk-local";
import { Dispatch, RefObject, SetStateAction } from "react";

interface HandleChatStartedCallbackProps {
  chatId: number;
}

export default function ChatFinishedHandler(
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
  getNotifications: () => void,
) {
  return async ({ chatId }: HandleChatStartedCallbackProps) => {
    const currentChats = Array.isArray(chats) ? chats : chats.current;
    const selectedChat =
      currentChat && "current" in currentChat ? currentChat.current : currentChat;
    socket.leaveRoom(`chat:${chatId}`);
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    const chat = currentChats.find((c) => c.id === chatId);

    if (!chat) return;
    setMessages((prev) => {
      if (chat.contactId && prev[chat.contactId]) {
        delete prev[chat.contactId];
      }
      return { ...prev };
    });

    safeNotification("Atendimento finalizado!", {
      body: `Contato: ${chat.contact?.name || "Contato excluído"}`,
      icon: HorizontalLogo.src,
    });

    if (selectedChat?.chatType === "wpp" && selectedChat.id === chatId) {
      setCurrentChat(null);
      setCurrentChatMessages([]);
    }
    getNotifications();
  };
}
