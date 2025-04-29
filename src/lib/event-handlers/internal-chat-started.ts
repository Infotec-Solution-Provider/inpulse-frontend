import { SocketClient, InternalChat, User } from "@in.pulse-crm/sdk";
import { Dispatch, SetStateAction } from "react";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";

interface HandleChatStartedCallbackProps {
  chat: InternalChat & { participants: number[] };
}

export default function InternalChatStartedHandler(
  socket: SocketClient,
  users: User[],
  setChats: Dispatch<SetStateAction<DetailedInternalChat[]>>,
  openInternalChat: (chat: DetailedInternalChat) => void, 
) {
  
  return async ({ chat }: HandleChatStartedCallbackProps) => {
    socket.joinRoom(`internal-chat:${chat.id}`);

    const detailedChat: DetailedInternalChat = {
      ...chat,
      lastMessage: null,
      chatType: "internal",
      isUnread: true,
      users: users.filter((u) => chat.participants.includes(u.CODIGO)), 
    };

    setChats((prev) => {
      const chatExists = prev.some((c) => c.id === chat.id);
      if (chatExists) {
        return prev;
      }
    //  openInternalChat(detailedChat);
      return [detailedChat, ...prev];
    });

  };
}
