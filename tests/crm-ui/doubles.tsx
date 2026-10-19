import { createContext, useContext } from "react";
export const AuthContext = createContext({
  instance: "tenant-a",
  token: "fixture-a",
  status: "authenticated",
  user: { CODIGO: 1, NOME: "Supervisão demonstrativa", NIVEL: "ADMIN" },
  signOut: () => {},
});
export const useAuthContext = () => useContext(AuthContext);
export const AppContext = createContext({
  modal: null,
  openModal: (_value: unknown) => {},
  closeModal: () => {},
});
export const useAppContext = () => useContext(AppContext);
export const WhatsappContext = createContext({
  parameters: {},
  loaded: true,
  sectors: [],
  currentChat: null,
});
export const useWhatsappContext = () => useContext(WhatsappContext);
export function Empty() {
  return null;
}
