import { createContext, createElement, useContext, useState } from "react";
import {
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import { Bell } from "lucide-react";
import type { ReactNode } from "react";
import type { User } from "../../src/lib/sdk-local";
import type { DetailedChat } from "../../src/app/(private)/[instance]/whatsapp-context";

declare global {
  interface Window {
    monitorHarness: {
      switchUser: (id: number) => void;
      switchTenant: (instance: string) => void;
      refreshToken: () => void;
      setRole: (role: string) => void;
      emit: () => void;
      listeners: () => number;
      actions: () => { type: string; chatId: number }[];
      complete: () => void;
      fail: () => void;
      opened: () => boolean[];
      dark: () => void;
      navigate: (path: string) => void;
    };
  }
}

export const AuthContext = createContext({
  instance: "tenant-a",
  token: "test-token",
  user: { CODIGO: 1, NOME: "Supervisor", NIVEL: "ADMIN" } as User,
  signOut: () => undefined,
});
export const useAuthContext = () => useContext(AuthContext);
export const state = {
  actions: [] as { type: string; chatId: number; resolve: () => void; reject: () => void }[],
  opened: [] as boolean[],
};
const pendingAction = (type: string, chatId: number) =>
  new Promise<void>((resolve, reject) => {
    state.actions.push({
      type,
      chatId,
      resolve,
      reject: () => reject(new Error("Falha simulada")),
    });
  });
const currentChat = { id: 999, chatType: "wpp" } as DetailedChat;
const whatsapp = {
  parameters: {} as Record<string, string>,
  sectors: [{ id: 1, name: "Atendimento" }],
  currentChat,
  setCurrentChat: () => undefined,
  openChat: (_chat: unknown, _messages: unknown, markAsRead = true) => {
    state.opened.push(markAsRead);
  },
  isReadOnlyMode: false,
  finishChat: (id: number) => pendingAction("finish", id),
  transferAttendance: (id: number) => pendingAction("transfer", id),
  wppApi: { current: { getResults: async () => [{ id: 1, name: "Concluído" }] } },
};
export const WhatsappContext = createContext(whatsapp);
export const useWhatsappContext = () => useContext(WhatsappContext);
export const InternalChatContext = createContext({
  users: [
    { CODIGO: 1, NOME: "Supervisor", SETOR: 1 },
    { CODIGO: 2, NOME: "Ana", SETOR: 1 },
  ] as User[],
  openInternalChat: (_chat: unknown, markAsRead = true) => {
    state.opened.push(markAsRead);
  },
});
export const useInternalChatContext = () => useContext(InternalChatContext);
const listeners = new Map<string, Set<() => void>>();
function subscribe(event: string, fn: () => void) {
  const set = listeners.get(event) ?? new Set();
  set.add(fn);
  listeners.set(event, set);
  return () => {
    set.delete(fn);
  };
}
export const socket = {
  subscribe,
  subscribeConnection: (fn: () => void) => subscribe("connect", fn),
  emit: () => {
    for (const set of listeners.values()) for (const fn of set) fn();
  },
  listenerCount: () => [...listeners.values()].reduce((count, set) => count + set.size, 0),
};
export const SocketContext = createContext({ socket });
export const AppContext = createContext({
  modal: null as ReactNode,
  openModal: (_node: ReactNode) => {},
  closeModal: () => {},
});
export const TestMessage = ({ text }: { text: string }) => createElement("li", {}, text);
export const TestMessages = () => createElement("p", {}, "Histórico da intervenção");
export const TestComposer = () => createElement("textarea", { "aria-label": "Mensagem" });
export const TestCustomerDetail = ({
  customerId,
  canEdit,
  presentation,
}: {
  customerId: number;
  canEdit: boolean;
  presentation?: "modal" | "panel";
}) =>
  createElement(
    "div",
    presentation === "panel" ? {} : { role: "dialog", "aria-label": "Detalhes do cliente" },
    `Cliente ${customerId} · ${canEdit ? "Edição habilitada" : "Somente leitura"}`,
  );

// Notification backends are outside this harness; real shell/theme/portal behavior is exercised.
export function TestNotifications() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return createElement(
    "div",
    {},
    createElement(
      IconButton,
      { "aria-label": "notificações", onClick: (event) => setAnchor(event.currentTarget) },
      createElement(Bell, { size: 18 }),
    ),
    createElement(
      Menu,
      { open: Boolean(anchor), anchorEl: anchor, onClose: () => setAnchor(null) },
      createElement(MenuItem, { onClick: () => setAnchor(null) }, "Nenhuma notificação"),
    ),
  );
}
export function TestNotificationPreferences({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return createElement(
    Dialog,
    { open, onClose },
    createElement(DialogTitle, {}, "Preferências de notificação"),
    createElement(
      DialogContent,
      {},
      createElement(Button, { onClick: onClose }, "Fechar preferências"),
    ),
  );
}
