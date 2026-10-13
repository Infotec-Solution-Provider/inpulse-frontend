import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import mergeMessagesById from "@/lib/merge-messages-by-id";
import mergeMessageUpdate from "@/lib/merge-message-update";
import { SocketClient, WhatsappClient, WppMessage } from "@/lib/sdk-local";
import { Logger } from "@in.pulse-crm/utils";
import { Dispatch, SetStateAction } from "react";

interface HandleChatStartedCallbackProps {
  chatId: number;
}

export default function ChatStartedHandler(
  api: WhatsappClient,
  socket: SocketClient,
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setChats: Dispatch<SetStateAction<DetailedChat[]>>,
  openChat: (chat: DetailedChat, preloadedMessages?: WppMessage[]) => void,
  userInitiatedChatContactId: React.RefObject<number | null>,
  notify?: (payload: {
    event: "new_conversation";
    title: string;
    body: string;
    isChatFocused: boolean;
  }) => void,
  shouldApply: (chatId: number) => boolean = () => true,
) {
  return async ({ chatId }: HandleChatStartedCallbackProps) => {
    try {
      const response = await api.getChatById(chatId);
      if (!shouldApply(chatId)) return;
      const { messages: rawMessages, ...chat } = response;
      const messages = Array.isArray(rawMessages) ? rawMessages : [];
      const lastMessage = messages.reduce<WppMessage | null>((latest, current) => {
        if (!latest) return current;
        return Number(latest.timestamp) > Number(current.timestamp) ? latest : current;
      }, null);
      const isUnread = lastMessage ? !lastMessage.from.startsWith("me") : false;
      const parsedChat: DetailedChat = { ...chat, isUnread, lastMessage, chatType: "wpp" };

      socket.joinRoom(`chat:${chat.id}`);
      notify?.({
        event: "new_conversation",
        title: "Novo atendimento!",
        body: `Contato: ${chat.contact?.name || "Contato excluído"}`,
        isChatFocused: false,
      });

      if (chat.contactId) {
        setMessages((previous) => ({
          ...previous,
          [chat.contactId!]: mergeMessagesById(
            messages,
            previous[chat.contactId!] ?? [],
            mergeMessageUpdate,
          ),
        }));
      }

      setChats((previous) => {
        const existingIndex = previous.findIndex((item) => item.id === chat.id);
        if (existingIndex === -1) return [parsedChat, ...previous];

        const next = [...previous];
        const existingChat = next[existingIndex]!;
        const existingTimestamp = Number(existingChat.lastMessage?.timestamp ?? 0);
        const snapshotTimestamp = Number(parsedChat.lastMessage?.timestamp ?? 0);
        next[existingIndex] =
          existingTimestamp > snapshotTimestamp
            ? {
                ...parsedChat,
                lastMessage: existingChat.lastMessage,
                isUnread: existingChat.isUnread,
              }
            : parsedChat;
        return next;
      });

      if (userInitiatedChatContactId.current === chat.contactId) {
        openChat(parsedChat, messages);
        userInitiatedChatContactId.current = null;
      }
    } catch (error) {
      Logger.error("Failed to load a newly started chat", error as Error);
    }
  };
}
