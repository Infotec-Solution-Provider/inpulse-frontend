"use client";

import { Context, createContext, useContext } from "react";
import { WhatsappContext } from "./whatsapp-context";
import type { WppClient } from "./whatsapp-context";

interface WhatsappSessionValue {
  parameters: Record<string, string>;
  channels: WppClient[];
  loaded: boolean;
}

export const WhatsappSessionContext = createContext({} as WhatsappSessionValue);
const unusedFallbackContext = createContext<WhatsappSessionValue>({ parameters: {}, channels: [], loaded: false });

export function useWhatsappSession() {
  const session = useContext(WhatsappSessionContext);
  // Standalone dialogs and existing harnesses may provide the full context.
  // Mounted session consumers subscribe only to the smaller session context.
  const fallback = useContext(session.parameters ? unusedFallbackContext : WhatsappContext as unknown as Context<WhatsappSessionValue>);
  return session.parameters ? session : fallback;
}
