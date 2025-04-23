import { WhatsappClient, WppChat, WppMessage } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, RefObject, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";

interface ReceiveMessageCallbackProps {
  message: WppMessage;
}

const types: Record<string, string> = {
  image: "Enviou uma imagem.",
  video: "Enviou um vídeo.",
  audio: "Enviou um áudio.",
  ptt: "Enviou uma mensagem de voz.",
  document: "Enviou um documento.",
  file: "Enviou um arquivo.",
};

export default function ReceiveMessageHandler(
  api: WhatsappClient,
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
  chatRef: RefObject<DetailedChat | null>,
) {
  return ({ message }: ReceiveMessageCallbackProps) => {
    if (!message.from.startsWith("me") && !message.from.startsWith("system")) {
      new Notification(Formatter.phone(message.from), {
        body: message.type !== "chat" ? types[message.type] || "Enviou um arquivo" : message.body,
        icon: HorizontalLogo.src,
      });
    }

    setMessages((prev) => {
      const newMessages = { ...prev };
      const contactId = message.contactId || 0;

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
          if (chat.contactId === message.contactId) {
            return {
              ...chat,
              isUnread: chatRef.current?.contactId !== message.contactId,
              lastMessage: message,
            };
          }

          return chat;
        })
        .sort((a, b) =>
          (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
        ),
    );

    if (chatRef.current && chatRef.current.contactId === message.contactId) {
      setCurrentChatMessages((prev) => {
        if (!prev.some((m) => m.id === message.id)) {
          return [...prev, message];
        }
        return prev;
      });

      // TODO: Change the logic to only update the received message;
      if (message.to.startsWith("me") && message.status !== "READ" && message.contactId) {
        api.markContactMessagesAsRead(message.contactId || 0);
      }
    }
  };
}
