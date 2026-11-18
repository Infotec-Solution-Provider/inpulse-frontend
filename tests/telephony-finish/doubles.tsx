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
  setAuth() {},
  scheduleAvailability: async () => ({
    periods: [{ start: "08:00", end: "18:00" }],
    appointments: [],
    dailyLimit: 0,
    blockDailyLimit: false,
  }),
  getCallSatisfaction: async () => ({ required: false, questions: [] }),
};
