import { SocketClient, WppMessage } from "@in.pulse-crm/sdk";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";

interface HandleChatStartedCallbackProps {
  chatId: number;
}

export default function ChatFinishedHandler(
  socket: SocketClient,
  chats: DetailedChat[],
  currentChat: DetailedChat | DetailedInternalChat | null,
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
  setCurrentChat: Dispatch<SetStateAction<DetailedChat | DetailedInternalChat | null>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
) {
  return async ({ chatId }: HandleChatStartedCallbackProps) => {
    console.log("chat finished", chatId)
    console.log("chats", chats)
    console.log("currentChat", currentChat)
    socket.leaveRoom(`chat:${chatId}`);
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    const chat = chats.find((c) => c.id === chatId);

    if (!chat) return;
    setMessages((prev) => {
      if (chat.contactId && prev[chat.contactId]) {
        delete prev[chat.contactId];
      }
      return { ...prev };
    });

    new Notification("Atendimento finalizado!", {
      body: `Contato: ${chat.contact?.name || "Contato excluído"}`,
      icon: HorizontalLogo.src,
    });

    console.log(currentChat?.chatType, currentChat?.id, chatId);

    if (currentChat?.chatType === "wpp" && currentChat.id === chatId) {
      setCurrentChat(null);
      setCurrentChatMessages([]);
    }
  };
}
