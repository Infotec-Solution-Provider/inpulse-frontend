import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { InternalChatClient, InternalMessage, User, WppContact } from "@/lib/sdk-local";
import { Dispatch, RefObject, SetStateAction } from "react";
import getInternalMessageAuthor from "../utils/get-internal-message-author";
import {
  createMentionDirectory,
  MentionDirectory,
  mentionDisplayText,
  preserveMessageMentionMetadata,
} from "../utils/message-mentions";
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
const notifiedMessages = new Set<string>();
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
  mentionDirectory: MentionDirectory = createMentionDirectory(
    users,
    contacts,
    whatsappSenderNameMap,
  ),
) {
  return ({ message }: InternalReceiveMessageCallbackProps) => {
    const notificationKey = `${message.instance}:${loggedUser.CODIGO}:${message.id}`;
    const alreadyNotified = notifiedMessages.has(notificationKey);
    notifiedMessages.add(notificationKey);
    if (notifiedMessages.size > 5000)
      notifiedMessages.delete(notifiedMessages.values().next().value!);
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
        return prev.map((item) =>
          item.id === message.id ? preserveMessageMentionMetadata(item, message) : item,
        );
      });
    }

    if (!alreadyNotified && message.from !== `user:${loggedUser.CODIGO}`) {
      const author = getInternalMessageAuthor(
        message.from,
        phoneNameMap,
        users,
        whatsappSenderNameMap,
      );
      const bodyFinal =
        (message.type !== "vcard" && message.body?.trim()) ||
        ["chat", "text"].includes(message.type)
          ? mentionDisplayText(message.body || "", message.mentionEntities, mentionDirectory)
          : types[message.type] || "Enviou um arquivo";
      const isMention = isInternalMentionForUser(
        message.body || "",
        loggedUser,
        message.mentionEntities,
        mentionDirectory,
      );

      notify?.({
        event: isMention ? "mention" : "new_message",
        title: author,
        body: bodyFinal,
        isChatFocused: isCurrentChat,
      });
    }

    setMessages((prev) => {
      const id = message.internalChatId;
      const previous = prev[id] ?? [];
      const exists = previous.some((item) => item.id === message.id);
      return {
        ...prev,
        [id]: exists
          ? previous.map((item) =>
              item.id === message.id ? preserveMessageMentionMetadata(item, message) : item,
            )
          : [...previous, message],
      };
    });

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === message.internalChatId) {
          return {
            ...chat,
            isUnread: chatRef.current?.id !== message.internalChatId,
            lastMessage: preserveMessageMentionMetadata(chat.lastMessage ?? undefined, message),
          };
        }

        return chat;
      }),
    );
  };
}
