import { InternalMessage, SocketClient } from "@/lib/sdk-local";
import { Dispatch, RefObject, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";

interface InternalChatFinishedHandlerProps {
  chatId: number;
}

export default function InternalChatFinishedHandler(
  socket: SocketClient,
  currentChat: RefObject<DetailedChat | DetailedInternalChat | null>,
  setInternalMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setInternalChats: Dispatch<SetStateAction<DetailedInternalChat[]>>,
  setCurrentChat: Dispatch<SetStateAction<DetailedChat | DetailedInternalChat | null>>,
  setCurrentChatMessages: Dispatch<SetStateAction<InternalMessage[]>>,
) {
  return async ({ chatId }: InternalChatFinishedHandlerProps) => {
    socket.leaveRoom(`internal-chat:${chatId}`);
    setInternalChats((prev) => prev.filter((c) => c.id !== chatId));
    setInternalMessages((previous) => {
      const next = { ...previous };
      delete next[chatId];
      return next;
    });

    if (currentChat.current?.chatType === "internal" && currentChat.current.id === chatId) {
      setCurrentChat(null);
      setCurrentChatMessages([]);
    }
  };
}
