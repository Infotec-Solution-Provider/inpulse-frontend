import { useContext, useMemo } from "react";
import { DetailedChat, WhatsappContext } from "../../whatsapp-context";
import { getTypeTextIcon } from "@/lib/utils/get-type-text-icon";
import ChatsMenuItem from "./chats-menu-item";
import {
  DetailedInternalChat as DetailedInternalChat,
  InternalChatContext,
} from "../../internal-context";
import { AuthContext } from "@/app/auth-context";
import filesService from "@/lib/services/files.service";

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
  const { internalChats, openInternalChat } = useContext(InternalChatContext);

  const filteredChats = useMemo(() => {
    const validChats = Array.isArray(chats) ? chats : [];
    const validInternalChats = Array.isArray(internalChats) ? internalChats : [];

    const combinedChats: (DetailedInternalChat | DetailedChat)[] = [
      ...validChats,
      ...validInternalChats,
    ];

    return combinedChats.filter((chat) => {
      if (chatFilters.showingType === "scheduled") {
        return false;
      }
      if (chatFilters.showingType === "internal" && chat.chatType !== "internal") {
        return false;
      }
      if (chatFilters.showingType === "unread" && !chat.isUnread) {
        return false;
      }
      return chatFilters.search.length === 0 || matchesFilter(chat, chatFilters.search);
    });
  }, [chats, internalChats, chatFilters]);

  const sortedChats = useMemo(() => {
    return filteredChats.sort((a, b) => {
      // Ordenar por timestamp da última mensagem, se existir
      const aTimestamp = a.lastMessage ? Number(a.lastMessage.timestamp) : 0;
      const bTimestamp = b.lastMessage ? Number(b.lastMessage.timestamp) : 0;

      return bTimestamp - aTimestamp;
    });
  }, [filteredChats]);

  return (
<menu className="flex flex-col gap-2 scrollbar-whatsapp bg-slate-300/5 dark:bg-slate-800/50 p-3">
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
                    : chat.lastMessage.body
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
            avatar={chat.avatarUrl ?? undefined}
            message={
              chat.lastMessage
                ? chat.lastMessage.type !== "chat"
                  ? getTypeTextIcon(chat.lastMessage.type)
                  : chat.lastMessage.body
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
