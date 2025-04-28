import { InternalMessage, InternalMessageStatus, WppMessage, WppMessageStatus } from "@in.pulse-crm/sdk";
import { Dispatch, RefObject, SetStateAction } from "react";
import compareMessageStatus from "../utils/compare-message-status";
import { DetailedChat  } from "@/app/(private)/[instance]/internal-context";

interface MessageStatusCallbackProps {
  messageId: number;
  contactId: number;
  status: InternalMessageStatus;
}

export default function InternalMessageStatusHandler(
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<InternalMessage[]>>,
  chatRef: RefObject<DetailedChat | null>,
) {
  return ({ status, messageId, contactId }: MessageStatusCallbackProps) => {
    setMessages((prev) => {
      const newMsgs = { ...prev };

      if (newMsgs[contactId]) {
        newMsgs[contactId] = newMsgs[contactId].map((m) => {
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

    if (chatRef.current && chatRef.current.internalcontactId === contactId) {
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
