import type { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import type { InternalChat, InternalChatMember, InternalMessage, User } from "@/lib/sdk-local";

type InternalChatWithSummary = InternalChat & {
  participants: InternalChatMember[];
  isUnread?: boolean;
  lastMessage?: InternalMessage | null;
};

export default function processInternalChatsAndMessages(
  userId: number,
  users: User[],
  chats: InternalChatWithSummary[],
  messages: InternalMessage[],
) {
  const currentParticipantByChat = new Map(
    chats.map((chat) => [
      chat.id,
      chat.participants.find((participant) => participant.userId === userId),
    ]),
  );
  const userById = new Map(users.map((user) => [user.CODIGO, user]));

  // Ordenar mensagens por timestamp
  messages.sort((a, b) => ((a.timestamp || 0) < (b.timestamp || 0) ? -1 : 1));

  const lastMessages: Record<number, InternalMessage> = {};
  const chatsMessages: Record<number, InternalMessage[]> = {};
  const unreadChatIds = new Set<number>();

  for (const message of messages) {
    // Atualizar status de leitura com base no `lastReadAt`.
    const userParticipant = currentParticipantByChat.get(message.internalChatId);

    // Caso o o participante tenha o `lastReadAt` definido
    // Atualiza o status da mensagem para "READ" se a mensagem for mais antiga que o `lastReadAt`
    if (userParticipant && userParticipant.lastReadAt) {
      const lastReadAtTimestamp = new Date(userParticipant.lastReadAt).getTime();
      const messageTimestamp = +message.timestamp;
      const isCurrentUser = message.from === `user:${userId}`;

      if (lastReadAtTimestamp >= messageTimestamp && message.status !== "READ" && !isCurrentUser) {
        message.status = "READ";
      }
    }

    // Caso este chat não tenha mensagens previas, inicializa o array de msgs
    if (!chatsMessages[message.internalChatId]) {
      chatsMessages[message.internalChatId] = [];
    }

    // Adiciona a mensagem ao array de mensagens do chat
    chatsMessages[message.internalChatId].push(message);

    // Atualiza a última mensagem do chat, caso a mensagem atual seja mais recente que a última mensagem do chat
    if (
      !lastMessages[message.internalChatId] ||
      message.timestamp > lastMessages[message.internalChatId].timestamp
    ) {
      lastMessages[message.internalChatId] = message;
    }

    if (message.from !== `user:${userId}` && message.status !== "READ") {
      unreadChatIds.add(message.internalChatId);
    }
  }

  const detailedChats = chats.map((chat) => ({
    ...chat,
    chatType: "internal",
    isUnread: chat.isUnread ?? unreadChatIds.has(chat.id),
    lastMessage: chat.lastMessage ?? (lastMessages[chat.id] || null),
    users: chat.participants
      .map((participant) => userById.get(participant.userId))
      .filter((user): user is User => !!user),
  })) as DetailedInternalChat[];

  detailedChats.sort((a, b) =>
    (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
  );

  return { detailedChats, chatsMessages };
}
