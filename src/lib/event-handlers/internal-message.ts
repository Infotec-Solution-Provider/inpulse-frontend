import { InternalChatClient, InternalMessage, User, WppContact } from "@in.pulse-crm/sdk";
import { safeNotification } from "@/lib/utils/notifications";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { Dispatch, RefObject, SetStateAction } from "react";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { Formatter } from "@in.pulse-crm/utils";
import { replaceMentions } from "../utils/message-mentions";

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
const notifiedMessages = new Set<number>();
export default function InternalReceiveMessageHandler(
  api: InternalChatClient,
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<InternalMessage[]>>,
  setChats: Dispatch<SetStateAction<DetailedInternalChat[]>>,
  chatRef: RefObject<DetailedInternalChat | DetailedChat | null>,
  users: User[],
  contacts: WppContact[],
  loggedUser: User,
) {
  return ({ message }: InternalReceiveMessageCallbackProps) => {
     if (notifiedMessages.has(message.id)) return;
     notifiedMessages.add(message.id);
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

       const parts = message.from.split(":");
          let raw = "";
          if (parts.length === 3) {
            raw = parts[2];
          } else if (parts.length === 2) {
            raw = parts[1];
          }


        const phone = raw.split("@")[0].replace(/\D/g, "");
        const user = users.find((u) => u.WHATSAPP === phone);
        const usersPhone = contacts.find((u) => u.phone === phone)?.name;
        if (user) {
          name =
            user.NOME ||
            usersPhone ||
            (user.WHATSAPP && user.WHATSAPP.length <= 13
              ? Formatter.phone(user.WHATSAPP)
              : "Sem número");
        } else {
          name = usersPhone || (phone.length <= 13 ? Formatter.phone(phone) : phone);
        }

      }
      const bodyFinal =
        message.type !== "chat"
          ? types[message.type] || "Enviou um arquivo"
          : replaceMentions(message.body || "", users, contacts);

      safeNotification(name, {
        body: bodyFinal,
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
