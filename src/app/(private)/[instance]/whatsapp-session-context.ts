"use client";

import { createContext, useContext } from "react";
import type { WppClient } from "./whatsapp-context";

interface WhatsappSessionValue {
  parameters: Record<string, string>;
  channels: WppClient[];
  loaded: boolean;
}

export const WhatsappSessionContext = createContext({} as WhatsappSessionValue);

export function useWhatsappSession() {
  return useContext(WhatsappSessionContext);
}
