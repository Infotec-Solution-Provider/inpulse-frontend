import { SocketClient, InternalChatClient, InternalMessage, InternalChat } from "@in.pulse-crm/sdk";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, SetStateAction } from "react";
import {  DetailedChat } from "@/app/(private)/[instance]/internal-context";

interface HandleChatStartedCallbackProps {
  chatId: number;
}

export default function InternalChatStartedHandler(
  api: InternalChatClient,
  socket: SocketClient,
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
) {
  return async ({ chatId }: HandleChatStartedCallbackProps) => {
    const { messages , ...chat } = await api.getChatById(chatId);
    const lastMessage = messages.find((m:any) => m.internalcontactId === chat) || null;

    socket.joinRoom(`chat:${chat}`);


    setMessages((prev) => {
      const newMessages = { ...prev };
      const contactId = chat.internalcontactId || 0;

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
      return [{ ...chat, lastMessage, chatType: "internal" }, ...prev];
    });
  };
}
