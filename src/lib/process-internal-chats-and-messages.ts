import { DetailedChat } from "@/app/(private)/[instance]/internal-context";
import { InternalChatWithDetails, InternalMessage } from "@in.pulse-crm/sdk";

export default function processInternalChatsAndMessages(
  chats: InternalChatWithDetails[],
  messages: InternalMessage[],
) {
  messages.sort((a, b) => ((a.timestamp || 0) < (b.timestamp || 0) ? -1 : 1));

  const lastMessages: Record<number, InternalMessage> = {};
  const chatsMessages: Record<number, InternalMessage[]> = {};

  for (const message of messages) {
    const contactIdOrZero = message.internalcontactId || 0;

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

  const isFromUs = (message: InternalMessage) => {
    return !["system", "me"].some((v) => v.includes(message.from));
  };

  const detailedChats = chats.map((chat) => ({
    ...chat,
    chatType:'internal',
    isUnread: messages.some(
      (m) => m.internalcontactId === chat.internalcontactId && m.status !== "READ" && !isFromUs(m),
    ),
    lastMessage: chat.internalcontactId ? lastMessages[chat.internalcontactId] || null : null,
  })) as DetailedChat[];

  detailedChats.sort((a, b) =>
    (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
  );

  return { detailedChats, chatsMessages };
}
