import { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import { WppChatWithDetails, WppMessage } from "@in.pulse-crm/sdk";

export default function processChatsAndMessages(
  chats: WppChatWithDetails[],
  messages: WppMessage[],
) {
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
    return !["system", "me"].some((v) => v.includes(message.from));
  };

  const detailedChats = chats.map((chat) => ({
    ...chat,
    isUnread: messages.some(
      (m) => m.contactId === chat.contactId && m.status !== "READ" && !isFromUs(m),
    ),
    lastMessage: chat.contactId ? lastMessages[chat.contactId] || null : null,
  })) as DetailedChat[];

  detailedChats.sort((a, b) =>
    (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
  );

  return { detailedChats, chatsMessages };
}
