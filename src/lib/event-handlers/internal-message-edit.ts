import { Dispatch, RefObject, SetStateAction } from "react";
import { InternalMessage, InternalMessageEditEventData } from "@/lib/sdk-local";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";

export default function InternalMessageEditHandler(
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<InternalMessage[]>>,
  chatRef: RefObject<DetailedInternalChat | DetailedChat | null>,
) {
  return ({
    internalMessageId,
    newText,
    chatId,
    mentionEntities,
  }: InternalMessageEditEventData) => {
    setMessages((prev) => {
      const newMessages = { ...prev, [chatId]: [...(prev[chatId] ?? [])] };
      if (!newMessages[chatId]) {
        newMessages[chatId] = [];
      }
      const msgIndex = newMessages[chatId].findIndex((m) => m.id === internalMessageId);
      if (msgIndex !== -1) {
        const msg = newMessages[chatId][msgIndex];
        newMessages[chatId][msgIndex] = {
          ...msg,
          body: newText,
          isEdited: true,
          mentionEntities:
            mentionEntities ?? (msg.body === newText ? msg.mentionEntities : undefined),
        };
      }
      return newMessages;
    });

    const x = chatRef.current;
    if (x && x.id === chatId && x.chatType === "internal") {
      setCurrentChatMessages((prev) => {
        const newMessages = [...prev];
        const i = newMessages.findIndex((m) => m.id === internalMessageId);
        if (i !== -1) {
          const msg = newMessages[i];
          newMessages[i] = {
            ...msg,
            body: newText,
            isEdited: true,
            mentionEntities:
              mentionEntities ?? (msg.body === newText ? msg.mentionEntities : undefined),
          };
        }
        return newMessages;
      });
    }
  };
}
