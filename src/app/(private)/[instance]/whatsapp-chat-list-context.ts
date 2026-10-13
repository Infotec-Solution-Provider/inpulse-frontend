"use client";

import { ChangeFiltersAction, ChatsFiltersState } from "@/lib/reducers/chats-filter.reducer";
import { ActionDispatch, createContext, useContext } from "react";
import type { DetailedInternalChat } from "./internal-context";
import type { DetailedChat } from "./whatsapp-context";

interface WhatsappChatListContextValue {
  chats: DetailedChat[];
  currentChat: DetailedChat | DetailedInternalChat | null;
  chatFilters: ChatsFiltersState;
  changeChatFilters: ActionDispatch<[ChangeFiltersAction]>;
  openChat: (chat: DetailedChat) => void;
  parameters: Record<string, string>;
}

export const WhatsappChatListContext = createContext({} as WhatsappChatListContextValue);

export function useWhatsappChatList() {
  return useContext(WhatsappChatListContext);
}
