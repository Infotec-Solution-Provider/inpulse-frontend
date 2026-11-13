import { createContext, useContext } from "react";
export const AuthContext = createContext({
  token: "fixture-token",
  instance: "fixture",
  user: { CODIGO: 7, NIVEL: "ATIVO" },
});
export const AppContext = createContext({
  closeModal() {
    document.body.dataset.closed = "true";
  },
});
export const useAuthContext = () => useContext(AuthContext);
export const useAppContext = () => useContext(AppContext);
const whatsapp = { parameters: {}, wppApi: { current: { getResults: async () => [] } } };
export const useWhatsappContext = () => whatsapp;
export const customersService = {
  getCallSatisfaction: async () => ({ required: false, questions: [] }),
};
