"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/sdk-local";
import type { DetailedInternalChat } from "./internal-context";

interface InternalChatListContextValue {
  internalChats: DetailedInternalChat[];
  users: User[];
  openInternalChat: (chat: DetailedInternalChat) => void;
}

export const InternalChatListContext = createContext({} as InternalChatListContextValue);

export function useInternalChatList() {
  return useContext(InternalChatListContext);
}
