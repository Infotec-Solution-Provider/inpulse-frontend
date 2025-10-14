import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { WppMessage, WppMessageEditEventData } from "@in.pulse-crm/sdk";
import { Dispatch, RefObject, SetStateAction } from "react";

export default function EditedMessageHandler(
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
  chatRef: RefObject<DetailedChat | DetailedInternalChat | null>,
) {
  return ({ messageId, newText, contactId }: WppMessageEditEventData) => {
    setMessages((prev) => {
      const newMessages = { ...prev };

      if (!newMessages[contactId]) {
        newMessages[contactId] = [];
      }

      const msgIndex = newMessages[contactId].findIndex((m) => m.id === messageId);
      if (msgIndex !== -1) {
        const msg = newMessages[contactId][msgIndex];

        newMessages[contactId][msgIndex] = { ...msg, body: newText, isEdited: true };
      }

      return newMessages;
    });

    const x = chatRef.current;

    if (x && x.chatType === "wpp" && x.contactId === contactId) {
      setCurrentChatMessages((prev) => {
        const newMessages = [...prev];
        const i = newMessages.findIndex((m) => m.id === messageId);

        if (i !== -1) {
          const msg = newMessages[i];
          newMessages[i] = { ...msg, body: newText, isEdited: true };
        }

        return newMessages;
      });
    }
  };
}
