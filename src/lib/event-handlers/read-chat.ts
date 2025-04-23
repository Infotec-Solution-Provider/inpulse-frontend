import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { WppMessage } from "@in.pulse-crm/sdk";
import { Dispatch, RefObject, SetStateAction } from "react";

interface ReadChatCallback {
  contactId: number;
}

export default function ReadChatHandler(
  chatRef: RefObject<DetailedChat | null>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
) {
  return ({ contactId }: ReadChatCallback) => {
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
        if (chat.contactId === contactId) {
          return {
            ...chat,
            isUnread: false,
          };
        }

        return chat;
      }),
    );

    if (chatRef.current && chatRef.current.contactId === contactId) {
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
