import { InternalMessage, InternalMessageStatusEventData } from "@/lib/sdk-local";
import { Dispatch, RefObject, SetStateAction } from "react";
import { applyInternalMessageStatusEvent } from "../utils/internal-message-retry";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";

export default function InternalMessageStatusHandler(
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<InternalMessage[]>>,
  chatRef: RefObject<DetailedInternalChat | DetailedChat | null>,
) {
  return (event: InternalMessageStatusEventData) => {
    const { internalMessageId: messageId, chatId } = event;
    setMessages((prev) => {
      const newMsgs = { ...prev };

      if (newMsgs[chatId]) {
        newMsgs[chatId] = newMsgs[chatId].map((m) => {
          if (m.id === messageId) {
            return applyInternalMessageStatusEvent(m, event);
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
            return applyInternalMessageStatusEvent(m, event);
          }
          return m;
        }),
      );
    }
  };
}
