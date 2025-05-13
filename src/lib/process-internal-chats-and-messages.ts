import { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import { InternalChat, InternalChatMember, InternalMessage, User } from "@in.pulse-crm/sdk";

export default function processInternalChatsAndMessages(
  userId: number,
  users: User[],
  chats: (InternalChat & { participants: InternalChatMember[] })[],
  messages: InternalMessage[],
) {
  // Criar um mapa de chats por `internalChatId` para acesso rápido
  const chatsMap = new Map<number, InternalChat & { participants: InternalChatMember[] }>();
  chats.forEach((chat) => chatsMap.set(chat.id, chat));

  // Ordenar mensagens por timestamp
  messages.sort((a, b) => ((a.timestamp || 0) < (b.timestamp || 0) ? -1 : 1));

  const lastMessages: Record<number, InternalMessage> = {};
  const chatsMessages: Record<number, InternalMessage[]> = {};

  for (const message of messages) {
    // Atualizar status de leitura com base no `lastReadAt`'
    const chat = chatsMap.get(message.internalChatId);
    // Encontra o participante que cooresponde ao usuário logado
    const userParticipant = chat?.participants.find((p) => p.userId === userId);

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
    users: users.filter((user) => chat.participants.some((p) => p.userId === user.CODIGO)),
  })) as DetailedInternalChat[];

  detailedChats.sort((a, b) =>
    (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
  );

  return { detailedChats, chatsMessages };
}
