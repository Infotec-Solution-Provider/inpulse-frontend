import { AuthContext } from "@/app/auth-context";
import filesService from "@/lib/services/files.service";
import { isExternalOperator } from "@/lib/permissions/operator-access";
import { getTypeTextIcon } from "@/lib/utils/get-type-text-icon";
import { replaceMentions } from "@/lib/utils/message-mentions";
import { useContext, useEffect, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";
import { DetailedInternalChat, InternalChatContext } from "../../internal-context";
import { DetailedChat, WhatsappContext } from "../../whatsapp-context";
import ChatsMenuItem from "./chats-menu-item";
import { recordFrontendPerformanceMetric } from "@/lib/performance/frontend-performance";
import { useFrontendRenderMetric } from "@/lib/performance/use-frontend-render-metric";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";

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
  useFrontendRenderMetric("ChatsMenuList");
  const { user } = useContext(AuthContext);
  const isExternal = isExternalOperator(user?.NIVEL);
  const { chats, openChat, currentChat, chatFilters, parameters } = useContext(WhatsappContext);
  const { internalChats, openInternalChat, users } = useContext(InternalChatContext);
  const { state } = useContext(ContactsContext);
  const virtualizedChatListEnabled = isFeatureEnabled(
    parameters,
    FEATURE_FLAGS.virtualizedChatList,
  );

  const userNameById = useMemo(
    () => new Map(users.map((participant) => [participant.CODIGO, participant.NOME])),
    [users],
  );

  const filteredComputation = useMemo(() => {
    const startedAt = performance.now();
    const validChats = Array.isArray(chats) ? chats : [];
    const validInternalChats = Array.isArray(internalChats) ? internalChats : [];

    const combinedChats: (DetailedInternalChat | DetailedChat)[] = [
      ...validChats,
      ...validInternalChats,
    ];

    const result = combinedChats.filter((chat) => {
      if (isExternal && chat.chatType !== "internal") {
        return false;
      }

      if (isExternal && chat.chatType === "internal" && chat.isGroup) {
        return false;
      }

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
    return { result, duration: performance.now() - startedAt };
  }, [chats, internalChats, chatFilters, isExternal]);
  const filteredChats = filteredComputation.result;

  useEffect(() => {
    recordFrontendPerformanceMetric({
      name: "interaction.chat_filter",
      value: filteredComputation.duration,
      unit: "ms",
      tags: { interaction: "chat_filter", source: "committed" },
      detailed: true,
    });
  }, [filteredComputation]);

  const sortedComputation = useMemo(() => {
    const startedAt = performance.now();
    const getUserCreatorName = (chat: CombinedChat): string => {
      if (chat.chatType === "wpp") {
        // For WhatsApp chats, prefer assigned user name via userId
        const uid = (chat as any).userId as number | undefined;
        const assigned = uid ? userNameById.get(uid) : undefined;
        return String(assigned || "").toLowerCase();
      }
      // Internal chats: use creatorId if available, else first participant's name
      const internal = chat as DetailedInternalChat;
      const creatorId = (internal as any).creatorId as number | undefined;
      const creator = creatorId ? userNameById.get(creatorId) : undefined;
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

    const result = [...filteredChats].sort((a, b) => {
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
    return { result, duration: performance.now() - startedAt };
  }, [filteredChats, chatFilters.sortBy, chatFilters.sortOrder, userNameById]);
  const sortedChats = sortedComputation.result;

  useEffect(() => {
    recordFrontendPerformanceMetric({
      name: "interaction.chat_sort",
      value: sortedComputation.duration,
      unit: "ms",
      tags: { interaction: "chat_sort", source: "committed" },
      detailed: true,
    });
  }, [sortedComputation]);

  const renderChatItem = (index: number, chat: CombinedChat) => {
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
        <div
          key={`${chat.chatType}:${chat.id}`}
          className={`px-3 pb-2 ${index === 0 ? "pt-3" : ""}`}
        >
          <ChatsMenuItem
            isUnread={chat.isUnread}
            isOpen={currentChat?.id === chat.id && currentChat?.chatType === "internal"}
            name={names}
            message={
              chat.lastMessage
                ? !["template", "text", "system", "chat"].includes(chat.lastMessage.type)
                  ? getTypeTextIcon(chat.lastMessage.type)
                  : replaceMentions(chat.lastMessage.body, users ?? [], state.contacts ?? [])
                : "Nenhuma mensagem"
            }
            messageDate={chat.lastMessage ? new Date(+chat.lastMessage.timestamp) : null}
            tags={[{ color: tagColor, name: tagName }]}
            onClick={() => openInternalChat(chat)}
            avatar={avatar}
          />
        </div>
      );
    }
    return (
      <div key={`${chat.chatType}:${chat.id}`} className={`px-3 pb-2 ${index === 0 ? "pt-3" : ""}`}>
        <ChatsMenuItem
          isUnread={chat.isUnread}
          isOpen={currentChat?.id === chat.id && currentChat?.chatType === "wpp"}
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
      </div>
    );
  };

  if (!virtualizedChatListEnabled) {
    return (
      <menu className="scrollbar-whatsapp flex flex-col bg-slate-300/5 dark:bg-slate-800/50">
        {sortedChats.map((chat, index) => renderChatItem(index, chat))}
      </menu>
    );
  }

  return (
    <Virtuoso
      className="scrollbar-whatsapp h-full bg-slate-300/5 dark:bg-slate-800/50"
      data={sortedChats}
      increaseViewportBy={300}
      computeItemKey={(_, chat) => `${chat.chatType}:${chat.id}`}
      itemContent={renderChatItem}
    />
  );
}
