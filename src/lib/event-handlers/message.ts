import { SocketClient, WhatsappClient, WppMessage } from "@in.pulse-crm/sdk";
import { safeNotification } from "@/lib/utils/notifications";
import { Formatter } from "@in.pulse-crm/utils";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, RefObject, SetStateAction } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";

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
  chats: (DetailedChat )[],
) {
  return ({ message }: ReceiveMessageCallbackProps) => {
    if (!message.from.startsWith("me") && !message.from.startsWith("system")) {
          const matchedChat = chats.find((chat) => {
              return chat.contactId === message.contactId;
          });
       const parts = message.from.split(":");
          let raw = "";
          if (parts.length === 3) {
            raw = parts[2];
          } else if (parts.length === 2) {
            raw = parts[1];

          }
        const phone = raw.split("@")[0].replace(/\D/g, "");
          const contactName = matchedChat?.contact?.name;
          safeNotification(contactName || Formatter.phone(phone), {
            body:
              message.type !== "chat"
                ? types[message.type] || "Enviou um arquivo"
                : message.body,
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

    const x = chatRef.current;
    setChats((prev) =>
      prev
        .map((chat) => {
          if (chat.contactId === message.contactId && x) {
            return {
              ...chat,
              isUnread: x.contactId !== message.contactId,
              lastMessage: message,
            };
          }

          return chat;
        })
        .sort((a, b) =>
          (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
        ),
    );


    if (x && x.contactId === message.contactId) {
      setCurrentChatMessages((prev) => {
        const newMessages = [...prev];
        const i = newMessages.findIndex((m) => m.id === message.id);
        if (i === -1) {
          newMessages.push(message);
        } else {
          newMessages[i] = message;
        }

        return newMessages;
      });

      // TODO: Change the logic to only update the received message;
      if (message.to.startsWith("me") && message.status !== "READ" && message.contactId) {
        api.markContactMessagesAsRead(message.contactId || 0);
      }
    }
  };
}
