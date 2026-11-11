import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { WppMessage } from "@/lib/sdk-local";
import { Dispatch, RefObject, SetStateAction } from "react";

interface ReadChatCallback {
  contactId: number;
  userId?: number;
}

export default function ReadChatHandler(
  chatRef: RefObject<DetailedChat | DetailedInternalChat | null>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
  currentUserId?: number,
) {
  return ({ contactId, userId }: ReadChatCallback) => {
    setMessages((prev) => {
      if (prev[contactId]) {
        prev[contactId] = prev[contactId].map((m) => {
          if (m.to.startsWith("me") && m.status !== "READ") {
            return {
              ...m,
              status: "READ",
            };
          }
          return m;
        });
      }
      return prev;
    });

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.contactId === contactId && (userId == null || currentUserId == null || userId === currentUserId)) {
          return {
            ...chat,
            isUnread: false,
          };
        }

        return chat;
      }),
    );

    if (
      chatRef.current &&
      chatRef.current.chatType === "wpp" &&
      chatRef.current.contactId === contactId
    ) {
      setCurrentChatMessages((prev) =>
        prev.map((m) => {
          if (m.to.startsWith("me") && m.status !== "READ") {
            return {
              ...m,
              status: "READ",
            };
          }
          return m;
        }),
      );
    }
  };
}
