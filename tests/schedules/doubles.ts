import { createContext, useContext } from "react";
import WhatsappClient from "../../src/lib/sdk-local/whatsapp.client";
export const AuthContext = createContext({
  instance: "suprimaxxi",
  token: "test-token",
  user: { CODIGO: 1 },
});
export const useAuthContext = () => useContext(AuthContext);
export const WhatsappContext = createContext({
  wppApi: { current: new WhatsappClient("http://127.0.0.1:4193") },
});
export const useWhatsappContext = () => useContext(WhatsappContext);
