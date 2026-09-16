import { createContext, useContext } from "react";
import type { User } from "../../src/lib/sdk-local";

export const auth = { instance: "tenant-a", token: "initial-token", user: { CODIGO: 1, SETOR: 1, NIVEL: null, ATIVO: "SIM" } as User };
export const AuthContext = createContext(auth);
export const useAuthContext = () => useContext(AuthContext);
export const SocketContext = createContext({ socket: {
  subscribe: () => () => undefined,
  on: () => undefined, off: () => undefined, emit: () => undefined,
} });
export const InternalChatContext = createContext({ messages: {}, sendInternalMessage: async () => { throw new Error("Unexpected internal send"); } });
export const toast = { error: () => undefined, info: () => undefined, success: () => undefined, warning: () => undefined };
export const Logger = { info: () => undefined, error: () => undefined, warn: () => undefined, debug: () => undefined };
export const Formatter = { phone: (value: string) => value };
export const sanitizeErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);
