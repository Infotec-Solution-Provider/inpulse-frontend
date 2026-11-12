import { createContext, useContext } from "react";

export const AuthContext = createContext({ instance: "odim", token: "fixture-token", user: { CODIGO: 7 } });
export const WhatsappContext = createContext<any>({});
export const useWhatsappContext = () => useContext(WhatsappContext);
export const ChatContext = createContext<any>({
  getMessageById: () => undefined,
  handleQuoteMessage: () => {},
  handleEditMessage: () => {},
  pendingSends: [],
});
const errors: string[] = [];
export const toast = {
  error: (message: string) => {
    errors.push(message);
    document.querySelector("[data-testid=errors]")!.textContent = errors.join("\n");
  },
  warning: () => {},
};
