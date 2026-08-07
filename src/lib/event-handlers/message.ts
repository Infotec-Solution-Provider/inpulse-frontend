import { WhatsappClient, WppMessage } from "@/lib/sdk-local";
import { Formatter, Logger } from "@in.pulse-crm/utils";
import { Dispatch, RefObject, SetStateAction, startTransition } from "react";
import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import mergeMessageUpdate from "@/lib/merge-message-update";
import mergeMessagesById, { compareMessageChronology } from "@/lib/merge-messages-by-id";

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

function isMessageForWppChat(
  chat: DetailedChat | DetailedInternalChat | null,
  message: WppMessage,
) {
  if (!chat || chat.chatType !== "wpp") return false;
  if (message.chatId != null) return chat.id === message.chatId;
  return message.contactId != null && chat.contactId === message.contactId;
}

export default function ReceiveMessageHandler(
  api: WhatsappClient,
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
  chatRef: RefObject<DetailedChat | DetailedInternalChat | null>,
  chats: DetailedChat[],
  notify?: (payload: {
    event: "new_message";
    title: string;
    body: string;
    isChatFocused: boolean;
  }) => void,
) {
  return ({ message }: ReceiveMessageCallbackProps) => {
    if (!message.from.startsWith("me") && !message.from.startsWith("system")) {
      const matchedChat = chats.find((chat) => isMessageForWppChat(chat, message));
      const parts = message.from.split(":");
      let raw = "";
      if (parts.length === 3) {
        raw = parts[2];
      } else if (parts.length === 2) {
        raw = parts[1];
      }
      const phone = raw.split("@")[0].replace(/\D/g, "");
      const contactName = matchedChat?.contact?.name;

      const isTextMsg = ["chat", "text"].includes(message.type);
      const isCurrentWppChat = isMessageForWppChat(chatRef.current, message);

      notify?.({
        event: "new_message",
        title: contactName || Formatter.phone(phone),
        body: isTextMsg ? message.body : types[message.type] || "Enviou um arquivo",
        isChatFocused: !!isCurrentWppChat,
      });
    }

    const x = chatRef.current;

    startTransition(() => {
      setMessages((prev) => {
        const current = chatRef.current;
        const contactId =
          message.contactId ??
          (isMessageForWppChat(current, message) && current?.chatType === "wpp"
            ? current.contactId
            : null);
        if (!contactId) return prev;
        const isCurrentChat = isMessageForWppChat(current, message);
        if (!(contactId in prev) && !isCurrentChat) return prev;
        const newMessages = { ...prev };

        const contactMessages = mergeMessagesById(
          prev[contactId] ?? [],
          [message],
          mergeMessageUpdate,
        );
        newMessages[contactId] = contactMessages;

        return newMessages;
      });

      setChats((prev) => {
        const index = prev.findIndex((chat) => isMessageForWppChat(chat, message));
        if (index === -1) return prev;
        const chat = prev[index]!;
        const isCurrentWppChat = isMessageForWppChat(x, message);
        const lastMessage =
          !chat.lastMessage || compareMessageChronology(message, chat.lastMessage) >= 0
            ? chat.lastMessage?.id === message.id
              ? mergeMessageUpdate(chat.lastMessage, message)
              : message
            : chat.lastMessage;
        const updated = {
          ...chat,
          isUnread: !isCurrentWppChat && !message.from.startsWith("me"),
          lastMessage,
        };
        return [updated, ...prev.slice(0, index), ...prev.slice(index + 1)];
      });
    });

    if (isMessageForWppChat(x, message)) {
      setCurrentChatMessages((prev) => {
        return mergeMessagesById(prev, [message], mergeMessageUpdate);
      });

      // TODO: Change the logic to only update the received message;
      if (message.to.startsWith("me") && message.status !== "READ" && message.contactId) {
        api.markContactMessagesAsRead(message.contactId || 0).catch((error) => {
          Logger.error(
            `[WPP_MESSAGE] markContactMessagesAsRead error | chatId: ${message.chatId} | contactId: ${message.contactId}`,
            error,
          );
        });
      }
    }
  };
}
