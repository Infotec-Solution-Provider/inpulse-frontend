import { SocketClient, WhatsappClient, WppMessage } from "@in.pulse-crm/sdk";
import { safeNotification } from "@/lib/utils/notifications";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";

interface HandleChatTransferredCallbackProps {
  chatId: number;
}

export default function ChatTransferHandler(
  api: WhatsappClient,
  socket: SocketClient,
  chats: (DetailedChat )[],
  currentChat: DetailedChat | DetailedInternalChat | null,
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
  setCurrentChat: Dispatch<SetStateAction<DetailedChat | DetailedInternalChat | null>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
) {
  return async ({ chatId }: HandleChatTransferredCallbackProps) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    const chat = chats.find((c) => c.id === chatId);
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
    api.getChatsBySession()
    console.log(currentChat?.chatType, currentChat?.id, chatId);

    if (currentChat?.chatType === "wpp" && currentChat.id === chatId) {
      setCurrentChat(null);
      setCurrentChatMessages([]);
    }
}
}
