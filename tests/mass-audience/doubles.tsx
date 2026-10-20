import { createContext, useContext } from "react";
export const AuthContext = createContext({
  instance: "fixture-a",
  token: "fixture-token",
  user: { CODIGO: 1, NOME: "Operador fictício" },
});
export const useAuthContext = () => useContext(AuthContext);
export const WhatsappContext = createContext({
  channels: [{ id: 1, name: "Canal fictício", type: "REMOTE" }],
  templates: [],
  sectors: [
    { id: 1, name: "Comercial" },
    { id: 2, name: "Suporte" },
  ],
});
