import { createContext, type ReactNode } from "react";
import axios from "axios";

export const AuthContext = createContext({ token: "test-token" });
export const AppContext = createContext({
  openModal: (_node: ReactNode) => {},
  closeModal: () => {},
});
export const SocketContext = createContext({ socket: { on: () => {}, off: () => {} } });
export const WhatsappContext = createContext({
  wppApi: { current: { setAuth: () => {}, ax: axios.create() } },
});
