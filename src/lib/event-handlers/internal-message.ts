import { InternalChatClient, InternalMessage, User } from "@in.pulse-crm/sdk";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, RefObject, SetStateAction } from "react";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";

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
    console.log("message", message);
    const user = users.find((u) => u.CODIGO === +message.from.split(":")[1]);

    if (message.from !== `user:${loggedUser.CODIGO}`) {
      const name = message.from === "system" ? "InPulse" : user?.NOME || "Desconhecido";
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

    if (chatRef.current?.chatType === "internal" && chatRef.current.id === message.internalChatId) {
      setCurrentChatMessages((prev) => {
        if (!prev.some((m) => m.id === message.id)) {
          return [...prev, message];
        }
        return prev;
      });
    }
  };
}
