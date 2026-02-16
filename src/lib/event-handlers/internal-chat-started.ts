import {
  SocketClient,
  InternalChat,
  User,
  InternalMessage,
  InternalChatMember,
} from "@in.pulse-crm/sdk";
import { Dispatch, SetStateAction } from "react";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";

interface HandleChatStartedCallbackProps {
  chat: InternalChat & { participants: InternalChatMember[]; messages: InternalMessage[] };
}

export default function InternalChatStartedHandler(
  socket: SocketClient,
  users: User[],
  setChats: Dispatch<SetStateAction<DetailedInternalChat[]>>,
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  user: User,
  openChat: (chat: DetailedInternalChat) => void,
  userInitiatedInternalChat: React.RefObject<boolean>,
) {
  return async ({ chat }: HandleChatStartedCallbackProps) => {
    socket.joinRoom(`internal-chat:${chat.id}`);

    const detailedChat: DetailedInternalChat = {
      ...chat,
      lastMessage: chat.messages[chat.messages.length - 1] || null,
      chatType: "internal",
      isUnread: true,
      users: users.filter((u) => chat.participants.some((p) => p.userId === u.CODIGO)),
    };

    setChats((prev) => {
      const chatExists = prev.some((c) => c.id === chat.id);

      if (chatExists) {
        return prev;
      }

      return [detailedChat, ...prev];
    });

    setMessages((prev) => {
      const chatMessages = prev[chat.id] || [];
      const newMessages = chat.messages.filter((m) => !chatMessages.some((msg) => msg.id === m.id));

      return {
        ...prev,
        [chat.id]: [...newMessages, ...chatMessages],
      };
    });

    // Se o usuário iniciou este chat manualmente, seleciona automaticamente
    if (userInitiatedInternalChat.current) {
      openChat(detailedChat);
      userInitiatedInternalChat.current = false; // Limpa a flag
    }
  };
}
