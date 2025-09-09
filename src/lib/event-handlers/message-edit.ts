import { WhatsappClient, WppMessage, WppMessageEditEventData } from "@in.pulse-crm/sdk";

import { Dispatch, RefObject, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";

const types: Record<string, string> = {
  image: "Enviou uma imagem.",
  video: "Enviou um vídeo.",
  audio: "Enviou um áudio.",
  ptt: "Enviou uma mensagem de voz.",
  document: "Enviou um documento.",
  file: "Enviou um arquivo.",
};

export default function EditedMessageHandler(
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
  chatRef: RefObject<DetailedChat | null>,
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

    if (x && x.contactId === contactId) {
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
