import { WppMessage, WppMessageStatus } from "@in.pulse-crm/sdk";
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
    console.log("message status", messageId, status);
    setMessages((prev) => {
      if (!prev[contactId]) {
        return prev;
      }
      const newMsgs = { ...prev };
      const findIndex = newMsgs[contactId].findIndex((m) => m.id === messageId);

      if (findIndex !== -1) {
        newMsgs[contactId][findIndex].status = compareMessageStatus(
          newMsgs[contactId][findIndex].status,
          status,
        );
      }
      return newMsgs;
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
