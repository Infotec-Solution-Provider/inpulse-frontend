import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { InternalChatClient, InternalMessage, User, WppContact } from "@/lib/sdk-local";
import { Dispatch, RefObject, SetStateAction } from "react";
import getInternalMessageAuthor from "../utils/get-internal-message-author";
import { replaceMentions } from "../utils/message-mentions";
import { isInternalMentionForUser } from "../utils/notification-preferences";

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
  phoneNameMap: Map<string, string>,
  whatsappSenderNameMap: Map<string, string>,
  notify?: (payload: {
    event: "new_message" | "mention";
    title: string;
    body: string;
    isChatFocused: boolean;
  }) => void,
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
      const author = getInternalMessageAuthor(
        message.from,
        phoneNameMap,
        users,
        whatsappSenderNameMap,
      );
      const bodyFinal =
        message.type !== "chat"
          ? types[message.type] || "Enviou um arquivo"
          : replaceMentions(message.body || "", users, contacts);
      const isMention = isInternalMentionForUser(message.body || "", loggedUser);

      notify?.({
        event: isMention ? "mention" : "new_message",
        title: author,
        body: bodyFinal,
        isChatFocused: isCurrentChat,
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
