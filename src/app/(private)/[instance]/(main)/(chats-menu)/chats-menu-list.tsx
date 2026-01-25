import { AuthContext } from "@/app/auth-context";
import filesService from "@/lib/services/files.service";
import { getTypeTextIcon } from "@/lib/utils/get-type-text-icon";
import { useContext, useMemo } from "react";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";
import { DetailedInternalChat, InternalChatContext } from "../../internal-context";
import { DetailedChat, WhatsappContext } from "../../whatsapp-context";
import ChatsMenuItem from "./chats-menu-item";

type CombinedChat = DetailedChat | DetailedInternalChat;

const matchesFilter = (chat: CombinedChat, search: string) => {
  if (chat.chatType === "wpp") {
    const onlyDigits = search.replace(/\D/g, "");
    const matchCnpj = chat.customer?.CPF_CNPJ?.includes(search);
    const matchCompanyName = chat.customer?.RAZAO?.toLowerCase().includes(search.toLowerCase());
    const matchCustomerErp = chat.customer?.COD_ERP === search;
    const matchCustomerId = chat.customer?.CODIGO?.toString() === search;
    const matchName = chat.contact?.name?.toLowerCase().includes(search.toLowerCase());
    const matchContactPhone =
      onlyDigits && chat.contact?.phone && chat.contact.phone.includes(onlyDigits);

    return (
      matchCnpj ||
      matchCompanyName ||
      matchCustomerErp ||
      matchCustomerId ||
      matchName ||
      matchContactPhone
    );
  }

  if (chat.chatType === "internal") {
    const matchName = chat.users.some((u) => u.NOME.toLowerCase().includes(search.toLowerCase()));
    const matchGroupName = chat?.groupName?.toLowerCase().includes(search.toLowerCase());

    return matchName || matchGroupName;
  }
  return false;
};

export default function ChatsMenuList() {
  const { user } = useContext(AuthContext);
  const { chats, openChat, currentChat, chatFilters } = useContext(WhatsappContext);
  const { internalChats, openInternalChat, users } = useContext(InternalChatContext);
  const { state } = useContext(ContactsContext);

  const mentionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of users) {
      const phone = user.WHATSAPP?.replace(/\D/g, "");
      if (phone) {
        map.set(phone, user.NOME);
      }
    }
    for (const contact of state.contacts) {
      const phone = contact.phone?.replace(/\D/g, "");
      if (phone && !map.has(phone)) {
        map.set(phone, contact.name);
      }
    }
    return map;
  }, [users, state.contacts]);

  const replaceMentionsWpp = (text: string): string => {
    return text.replace(/@(\d{6,})/g, (match, phone) => {
      const name = mentionNameMap.get(phone);
      return name ? `@${name}` : match;
    });
  };

  const filteredChats = useMemo(() => {
    const validChats = Array.isArray(chats) ? chats : [];
    const validInternalChats = Array.isArray(internalChats) ? internalChats : [];

    const combinedChats: (DetailedInternalChat | DetailedChat)[] = [
      ...validChats,
      ...validInternalChats,
    ];

    return combinedChats.filter((chat) => {
      if (chatFilters.showingType === "scheduled" && !("schedule" in chat)) {
        return false;
      }
      if (chatFilters.showingType === "internal" && chat.chatType !== "internal") {
        return false;
      }
      if (chatFilters.showingType === "external" && chat.chatType !== "wpp") {
        return false; /*  */
      }
      if (chatFilters.showingType === "unread" && !chat.isUnread) {
        return false;
      }
      return chatFilters.search.length === 0 || matchesFilter(chat, chatFilters.search);
    });
  }, [chats, internalChats, chatFilters]);

  const sortedChats = useMemo(() => {
    const getUserCreatorName = (chat: CombinedChat): string => {
      if (chat.chatType === "wpp") {
        // For WhatsApp chats, prefer assigned user name via userId
        const uid = (chat as any).userId as number | undefined;
        const assigned = uid ? users.find((u) => u.CODIGO === uid)?.NOME : undefined;
        return String(assigned || "").toLowerCase();
      }
      // Internal chats: use creatorId if available, else first participant's name
      const internal = chat as DetailedInternalChat;
      const creatorId = (internal as any).creatorId as number | undefined;
      const creator = creatorId ? users.find((u) => u.CODIGO === creatorId)?.NOME : undefined;
      return String(creator || internal.users?.[0]?.NOME || "").toLowerCase();
    };

    const getDate = (
      chat: CombinedChat,
      key: "startedAt" | "finishedAt" | "lastMessage",
    ): number => {
      if (key === "lastMessage") {
        return chat.lastMessage ? Number((chat as any).lastMessage.timestamp) : 0;
      }
      const value = (chat as any)[key];
      if (!value) return 0;
      try {
        return new Date(value).getTime();
      } catch {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
      }
    };

    const multiplier = chatFilters.sortOrder === "asc" ? 1 : -1;
    const sortBy = chatFilters.sortBy;

    return [...filteredChats].sort((a, b) => {
      if (sortBy === "userCreator") {
        const an = getUserCreatorName(a);
        const bn = getUserCreatorName(b);
        if (an < bn) return -1 * multiplier;
        if (an > bn) return 1 * multiplier;
        // tie-breaker by last message desc
        const at = getDate(a, "lastMessage");
        const bt = getDate(b, "lastMessage");
        return (bt - at) * (multiplier === 1 ? 1 : 1); // keep consistent tiebreaker
      }

      // date-based
      const at = getDate(a, sortBy as any);
      const bt = getDate(b, sortBy as any);
      if (at < bt) return -1 * multiplier;
      if (at > bt) return 1 * multiplier;
      // tie-breaker: last message desc
      const alt = getDate(a, "lastMessage");
      const blt = getDate(b, "lastMessage");
      return blt - alt;
    });
  }, [filteredChats, chatFilters.sortBy, chatFilters.sortOrder]);

  return (
    <menu className="scrollbar-whatsapp flex flex-col gap-2 bg-slate-300/5 p-3 dark:bg-slate-800/50">
      {sortedChats.map((chat) => {
        if (chat.chatType === "internal") {
          const names = chat.isGroup ? chat.groupName! : chat.users.map((u) => u.NOME).join(" e ");
          const tagName = chat.isGroup ? "Grupo Interno" : "Chat Interno";
          const tagColor = chat.isGroup ? "green" : "blue";
          let avatar: string | undefined = undefined;

          if (chat.isGroup && chat.groupImageFileId) {
            avatar = filesService.getFileDownloadUrl(chat.groupImageFileId);
          }

          if (!chat.isGroup) {
            const otherUser = chat.users.find((u) => u.CODIGO !== user?.CODIGO);
            const avatarUrl =
              otherUser?.AVATAR_ID && filesService.getFileDownloadUrl(otherUser.AVATAR_ID);
            avatar = avatarUrl || undefined;
          }

          return (
            <ChatsMenuItem
              isUnread={chat.isUnread}
              isOpen={currentChat?.id === chat.id && currentChat?.chatType === "internal"}
              key={`internal-chat:${chat.id}`}
              name={names}
              message={
                chat.lastMessage
                  ? chat.lastMessage.type !== "chat"
                    ? getTypeTextIcon(chat.lastMessage.type)
                    : replaceMentionsWpp(chat.lastMessage.body)
                  : "Nenhuma mensagem"
              }
              messageDate={chat.lastMessage ? new Date(+chat.lastMessage.timestamp) : null}
              tags={[{ color: tagColor, name: tagName }]}
              onClick={() => openInternalChat(chat)}
              avatar={avatar}
            />
          );
        }
        return (
          <ChatsMenuItem
            isUnread={chat.isUnread}
            isOpen={currentChat?.id === chat.id && currentChat?.chatType === "wpp"}
            key={`chat:${chat.id}`}
            name={chat.contact?.name || "Contato excluído"}
            customer={chat.customer?.RAZAO || chat.customer?.FANTASIA || undefined}
            avatar={chat.avatarUrl ?? undefined}
            message={
              chat.lastMessage
                ? ["text", "system", "text", "chat"].includes(chat.lastMessage.type)
                  ? chat.lastMessage.body
                  : getTypeTextIcon(chat.lastMessage.type)
                : "Nenhuma mensagem"
            }
            messageDate={chat.lastMessage ? new Date(+chat.lastMessage.timestamp) : null}
            tags={[]}
            onClick={() => openChat(chat)}
          />
        );
      })}
    </menu>
  );
}
