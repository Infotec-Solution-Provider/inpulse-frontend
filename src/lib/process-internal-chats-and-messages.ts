import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { InternalChat, InternalMessage, User } from "@in.pulse-crm/sdk";

export default function processInternalChatsAndMessages(
  userId: number,
  users: User[],
  chats: (InternalChat & { participants: number[] })[],
  messages: InternalMessage[],
) {
  messages.sort((a, b) => ((a.timestamp || 0) < (b.timestamp || 0) ? -1 : 1));

  const lastMessages: Record<number, InternalMessage> = {};
  const chatsMessages: Record<number, InternalMessage[]> = {};

  for (const message of messages) {
    if (!chatsMessages[message.internalChatId]) {
      chatsMessages[message.internalChatId] = [];
    }

    chatsMessages[message.internalChatId].push(message);

    if (
      !lastMessages[message.internalChatId] ||
      message.timestamp > lastMessages[message.internalChatId].timestamp
    ) {
      lastMessages[message.internalChatId] = message;
    }
  }

  const isFromMe = (message: InternalMessage) => {
    return message.from === `user:${userId}`;
  };

  const isFromChat = (message: InternalMessage, chat: InternalChat) => {
    return chat.id === message.internalChatId;
  };

  const detailedChats = chats.map((chat) => ({
    ...chat,
    chatType: "internal",
    isUnread: messages.some((m) => isFromChat(m, chat) && !isFromMe(m) && m.status !== "READ"),
    lastMessage: lastMessages[chat.id] || null,
    users: users.filter((user) => chat.participants.includes(user.CODIGO)),
  })) as DetailedInternalChat[];

  detailedChats.sort((a, b) =>
    (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
  );

  return { detailedChats, chatsMessages };
}
