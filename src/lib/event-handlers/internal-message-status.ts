import { InternalMessage, WppMessageStatus } from "@in.pulse-crm/sdk";
import { Dispatch, RefObject, SetStateAction } from "react";
import compareMessageStatus from "../utils/compare-message-status";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";

interface MessageStatusCallbackProps {
  chatId: number;
  internalMessageId: number;
  status: WppMessageStatus;
}

export default function InternalMessageStatusHandler(
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<InternalMessage[]>>,
  chatRef: RefObject<DetailedInternalChat | DetailedChat | null>,
) {
  return ({ status, internalMessageId: messageId, chatId }: MessageStatusCallbackProps) => {
    setMessages((prev) => {
      const newMsgs = { ...prev };

      if (newMsgs[chatId]) {
        newMsgs[chatId] = newMsgs[chatId].map((m) => {
          if (m.id === messageId) {
            return {
              ...m,
              status: compareMessageStatus(m.status, status),
            };
          }
          return m;
        });
      }

      return newMsgs;
    });

    if (
      chatRef.current &&
      chatRef.current.chatType === "internal" &&
      chatRef.current.id === chatId
    ) {
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
