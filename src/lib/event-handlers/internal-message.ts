import { InternalChat, InternalChatClient, InternalMessage, } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, RefObject, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/internal-context";

interface InternalReceiveMessageCallbackProps {
  message: InternalMessage;
}

const types: Record<string, string> = {
  image: "Enviou uma imagem.",
  video: "Enviou um vídeo.",
  audio: "Enviou um áudio.",
  ptt: "Enviou uma mensagem de voz.",
  document: "Enviou um documento.",
  file: "Enviou um arquivo.",
};

export default function InternalReceiveMessageHandler(
  api: InternalChatClient,
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<InternalMessage[]>>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
  chatRef: RefObject<DetailedChat | null>,
) {
  return ({ message }: InternalReceiveMessageCallbackProps) => {
    if (!message.from.startsWith("me") && !message.from.startsWith("system")) {
      new Notification(Formatter.phone(message.from), {
        body: message.type !== "chat" ? types[message.type] || "Enviou um arquivo" : message.body,
        icon: HorizontalLogo.src,
      });
    }

    setMessages((prev) => {
      const newMessages = { ...prev };
      const contactId = message.internalcontactId || 0;

      if (!newMessages[contactId]) {
        newMessages[contactId] = [];
      }

      const findIndex = newMessages[contactId].findIndex((m) => m.id === message.id);
      if (findIndex === -1) {
        newMessages[contactId].push(message);
      } else {
        newMessages[contactId][findIndex] = message;
      }

      return newMessages;
    });

    setChats((prev) =>
      prev
        .map((chat) => {
          if (chat.internalcontactId === message.internalcontactId) {
            return {
              ...chat,
              isUnread: chatRef.current?.internalcontactId !== message.internalcontactId,
              lastMessage: message,
            };
          }

          return chat;
        })
  
    );

    if (chatRef.current && chatRef.current.internalcontactId === message.internalcontactId) {
      setCurrentChatMessages((prev) => {
        if (!prev.some((m) => m.id === message.id)) {
          return [...prev, message];
        }
        return prev;
      });

    }
  };
}
