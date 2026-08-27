import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { WppChatWithDetails, WppMessage } from "@/lib/sdk-local";
import { recordFrontendPerformanceMetric } from "@/lib/performance/frontend-performance";

export default function processChatsAndMessages(
  /* socketClient: SocketClient, */
  chats: WppChatWithDetails[],
  messages: WppMessage[],
) {
  recordFrontendPerformanceMetric({
    name: "volume.chats_loaded",
    value: chats.length,
    unit: "count",
    detailed: true,
  });
  recordFrontendPerformanceMetric({
    name: "volume.messages_loaded",
    value: messages.length,
    unit: "count",
    detailed: true,
  });

  messages.sort((a, b) => ((a.timestamp || 0) < (b.timestamp || 0) ? -1 : 1));

  const lastMessages: Record<number, WppMessage> = {};
  const chatsMessages: Record<number, WppMessage[]> = {};

  for (const message of messages) {
    const contactIdOrZero = message.contactId || 0;

    if (!chatsMessages[contactIdOrZero]) {
      chatsMessages[contactIdOrZero] = [];
    }
    chatsMessages[contactIdOrZero].push(message);

    if (
      !lastMessages[contactIdOrZero] ||
      message.timestamp > lastMessages[contactIdOrZero].timestamp
    ) {
      lastMessages[contactIdOrZero] = message;
    }
  }

  const isFromUs = (message: WppMessage) => {
    const bool =
      message.from.startsWith("me:") ||
      message.from.startsWith("system:") ||
      message.from.startsWith("bot") ||
      message.from.startsWith("thirdparty");

    return bool;
  };

  const detailedChats: DetailedChat[] = [];

  for (const chat of chats) {
    const detailedChat: DetailedChat = {
      ...chat,
      chatType: "wpp",
      isUnread: messages.some(
        (m) => m.contactId === chat.contactId && m.status !== "READ" && !isFromUs(m),
      ),
      lastMessage: chat.contactId ? lastMessages[chat.contactId] || null : null,
    };

    // Se tem uma mensagem do contato, que status seja diferente de "READ" e que não seja nossa

    detailedChats.push(detailedChat);
  }

  detailedChats.sort((a, b) =>
    (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
  );

  return { detailedChats, chatsMessages };
}
