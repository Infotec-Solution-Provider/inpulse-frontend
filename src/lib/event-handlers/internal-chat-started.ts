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
) {
  return async ({ chat }: HandleChatStartedCallbackProps) => {
    socket.joinRoom(`internal-chat:${chat.id}`);

    setChats((prev) => {
      const chatIndex = prev.findIndex((c) => c.id === chat.id);
      if (chatIndex !== -1) {
        return prev;
      }
      return [
        {
          ...chat,
          lastMessage: null,
          chatType: "internal",
          isUnread: true,
          users: users.filter((u) => chat.participants.includes(u.CODIGO)),
        },
        ...prev,
      ];
    });
  };
}
