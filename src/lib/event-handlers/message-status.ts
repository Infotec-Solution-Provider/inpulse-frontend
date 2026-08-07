import { WppMessage, WppMessageStatus } from "@/lib/sdk-local";
import { Dispatch, RefObject, SetStateAction } from "react";
import compareMessageStatus from "../utils/compare-message-status";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";

interface MessageStatusCallbackProps {
  messageId: number;
  contactId: number;
  status: WppMessageStatus;
}

export default function MessageStatusHandler(
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
  chatRef: RefObject<DetailedChat | DetailedInternalChat | null>,
) {
  const x = chatRef.current;

  return ({ status, messageId, contactId }: MessageStatusCallbackProps) => {
    setMessages((prev) => {
      if (!prev[contactId]) {
        return prev;
      }
      const contactMessages = [...prev[contactId]];
      const findIndex = contactMessages.findIndex((m) => m.id === messageId);

      if (findIndex !== -1) {
        const current = contactMessages[findIndex]!;
        contactMessages[findIndex] = {
          ...current,
          status: compareMessageStatus(current.status, status),
        };
      }
      return { ...prev, [contactId]: contactMessages };
    });

    if (x && x.chatType === "wpp" && x.contactId === contactId) {
      setCurrentChatMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            return {
              ...m,
              status: compareMessageStatus(m.status, status),
            };
          }
          return m;
        }),
      );
    }
  };
}
