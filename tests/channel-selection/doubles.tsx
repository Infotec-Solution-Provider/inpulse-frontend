import { createContext, useContext, type ContextType } from "react";
export type ChatContextType = ContextType<
  typeof import("../../src/app/(private)/[instance]/(main)/(chat)/chat-context").ChatContext
>;
export type WhatsappContextType = ContextType<
  typeof import("../../src/app/(private)/[instance]/whatsapp-context").WhatsappContext
>;

// Only the service contexts are replaced; the composer and channel menu are real.
export const WhatsappContext = createContext({} as WhatsappContextType);
export const useWhatsappContext = () => useContext(WhatsappContext);
export const ChatContext = createContext({} as ChatContextType);
