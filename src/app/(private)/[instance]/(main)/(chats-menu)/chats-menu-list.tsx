import { useContext, useMemo } from "react";
import { DetailedChat, WhatsappContext } from "../../whatsapp-context";
import { getTypeTextIcon } from "@/lib/utils/get-type-text-icon";
import ChatsMenuItem from "./chats-menu-item";
import { DetailedChat as DetailedInternalChat ,InternalChatContext } from "../../internal-context";

type CombinedChat = DetailedChat | DetailedInternalChat;

const matchesFilter = (chat: CombinedChat, search: string) => {
  if (chat.chatType === "wpp") {
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
  }

  if (chat.chatType === "internal") {
    const matchName = chat.contact?.name?.toLowerCase().includes(search.toLowerCase());
    return matchName; 
  }
  return false;
};

export default function ChatsMenuList() {
  const { chats, openChat, currentChat, chatFilters } = useContext(WhatsappContext);
  const {internalChats,openInternalChat,currentInternalChat  } = useContext(InternalChatContext);
  const filteredChats = useMemo(() => {
    const validChats = Array.isArray(chats) ? chats : [];
    const validInternalChats = Array.isArray(internalChats) ? internalChats : [];
    
    const combinedChats: (DetailedInternalChat | DetailedChat)[] = [...validChats, ...validInternalChats];

    return combinedChats.filter((chat) => {
      if (chatFilters.showingType === "scheduled" || chatFilters.showingType === "internal") {
        return chat.chatType === "wpp" || chat.chatType === "internal";
      }
      if (chatFilters.showingType === "unread" && !chat.isUnread) {
        return false;
      }
      return matchesFilter(chat, chatFilters.search);
    });
  }, [chats,internalChats, chatFilters]);

  return (
    <menu className="flex flex-col gap-2 overflow-y-auto bg-slate-300/5 p-3">
      {filteredChats.map((chat) => (
        <ChatsMenuItem
          isUnread={chat.isUnread}
          isOpen={currentInternalChat?.id === chat.id || currentChat?.id === chat.id}
          key={chat.id}
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
          onClick={() => {
            if (chat.chatType === "wpp") {
              openChat(chat); 
            } else if (chat.chatType === "internal") {
              openInternalChat(chat); 
            }
          }}        />
      ))}
    </menu>
  );
}
