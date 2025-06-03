import { InternalChatClient, InternalMessage, User } from "@in.pulse-crm/sdk";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, RefObject, SetStateAction } from "react";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { Formatter } from "@in.pulse-crm/utils";

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
  setChats: Dispatch<SetStateAction<DetailedInternalChat[]>>,
  chatRef: RefObject<DetailedInternalChat | DetailedChat | null>,
  users: User[],
  loggedUser: User,
) {
  return ({ message }: InternalReceiveMessageCallbackProps) => {
    const isCurrentChat =
      chatRef.current?.chatType === "internal" && chatRef.current.id === message.internalChatId;
    const isCurrentUser = message.from === `user:${loggedUser.CODIGO}`;

    if (isCurrentChat && !isCurrentUser) {
      api.markChatMessagesAsRead(message.internalChatId);
      message = { ...message, status: "READ" };
    }
    if (isCurrentChat) {
      setCurrentChatMessages((prev) => {
        if (!prev.some((m) => m.id === message.id)) {
          return [...prev, message];
        }
        return prev;
      });
    }

    if (message.from !== `user:${loggedUser.CODIGO}`) {
      let name = "Desconhecido";
      if (message.from === "system") {
        name = "InPulse";
      }
      if (message.from.startsWith("user:")) {
        name = users.find((u) => u.CODIGO === +message.from.split(":")[1])?.NOME || "Desconhecido";
      }
      if (message.from.startsWith("external:")) {
        const user = users.find((u) => u.WHATSAPP === message.from.split(":")[1]);
        name = user
          ? user.NOME || (user.WHATSAPP && user.WHATSAPP.length <= 13 ? Formatter.phone(user.WHATSAPP) : "Sem número")
          : (message.from.split(":")[1].length <= 13
              ? Formatter.phone(message.from.split(":")[1])
              : message.from.split(":")[1]);
      }

      new Notification(name, {
        body: message.type !== "chat" ? types[message.type] || "Enviou um arquivo" : message.body,
        icon: HorizontalLogo.src,
      });
    }

    setMessages((prev) => {
      const newMessages = { ...prev };
      const id = message.internalChatId;

      if (!newMessages[id]) {
        newMessages[id] = [];
      }

      const findIndex = newMessages[id].findIndex((m) => m.id === message.id);
      if (findIndex === -1) {
        newMessages[id].push(message);
      } else {
        newMessages[id][findIndex] = message;
      }

      return newMessages;
    });

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === message.internalChatId) {
          return {
            ...chat,
            isUnread: chatRef.current?.id !== message.internalChatId,
            lastMessage: message,
          };
        }

        return chat;
      }),
    );
  };
}
