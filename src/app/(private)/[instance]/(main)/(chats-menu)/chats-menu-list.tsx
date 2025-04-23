import { useContext, useMemo } from "react";
import { DetailedChat, WhatsappContext } from "../../whatsapp-context";
import { getTypeTextIcon } from "@/lib/utils/get-type-text-icon";
import ChatsMenuItem from "./chats-menu-item";

const matchesFilter = (chat: DetailedChat, search: string) => {
  const matchCnpj = chat.customer?.CPF_CNPJ?.includes(search);
  const matchCompanyName = chat.customer?.RAZAO?.toLowerCase().includes(search.toLowerCase());
  const matchCustomerErp = chat.customer?.COD_ERP === search;
  const matchCustomerId = chat.customer?.CODIGO?.toString() === search;
  const matchName = chat.contact?.name?.toLowerCase().includes(search.toLowerCase());
  const matchContactPhone = chat.contact?.phone?.includes(search.replace(/\D/g, ""));

  return (
    matchCnpj ||
    matchCompanyName ||
    matchCustomerErp ||
    matchCustomerId ||
    matchName ||
    matchContactPhone
  );
};

export default function ChatsMenuList() {
  const { chats, openChat, currentChat, chatFilters } = useContext(WhatsappContext);

  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      if (chatFilters.showingType === "scheduled" || chatFilters.showingType === "internal") {
        return false;
      }
      if (chatFilters.showingType === "unread" && !chat.isUnread) {
        return false;
      }
      return matchesFilter(chat, chatFilters.search);
    });
  }, [chats, chatFilters]);

  return (
    <menu className="flex flex-col gap-2 overflow-y-auto bg-slate-300/5 p-3">
      {filteredChats.map((chat) => (
        <ChatsMenuItem
          isUnread={chat.isUnread}
          isOpen={currentChat?.id === chat.id}
          key={chat.id}
          name={chat.contact?.name || "Contato excluído"}
          avatar={chat.avatarUrl}
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
      ))}
    </menu>
  );
}
