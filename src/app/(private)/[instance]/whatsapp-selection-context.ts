"use client";

import { createContext, Dispatch, SetStateAction, useContext } from "react";
import type { DetailedInternalChat } from "./internal-context";
import type { DetailedChat } from "./whatsapp-context";

interface WhatsappSelectionValue {
  currentChat: DetailedChat | DetailedInternalChat | null;
  setCurrentChat: Dispatch<SetStateAction<DetailedChat | DetailedInternalChat | null>>;
}

export const WhatsappSelectionContext = createContext({} as WhatsappSelectionValue);

export function useWhatsappSelection() {
  return useContext(WhatsappSelectionContext);
}
