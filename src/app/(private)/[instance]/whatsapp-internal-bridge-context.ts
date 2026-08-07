"use client";

import type { UserNotificationPreferences, WhatsappClient, WppMessage } from "@/lib/sdk-local";
import type { DetailedInternalChat } from "./internal-context";
import type { DetailedChat } from "./whatsapp-context";
import { createContext, Dispatch, RefObject, SetStateAction, useContext } from "react";

interface WhatsappInternalBridgeValue {
  setCurrentChat: Dispatch<SetStateAction<DetailedChat | DetailedInternalChat | null>>;
  currentChatRef: RefObject<DetailedChat | DetailedInternalChat | null>;
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>;
  wppApi: RefObject<WhatsappClient>;
  notificationPreferences: UserNotificationPreferences;
  unreadCount: number;
}

export const WhatsappInternalBridgeContext = createContext({} as WhatsappInternalBridgeValue);

export function useWhatsappInternalBridge() {
  return useContext(WhatsappInternalBridgeContext);
}
