import { createContext, useContext, useSyncExternalStore } from "react";
import type { WppMessage } from "../../src/lib/sdk-local";
import chatsFilterReducer, {
  type ChangeFiltersAction,
  type ChatsFiltersState,
} from "../../src/lib/reducers/chats-filter.reducer";
import { UnconfirmedMessageSendError } from "../../src/lib/utils/reliable-message-send";
import { EMPTY_MENTION_DIRECTORY } from "../../src/lib/utils/message-mentions";

const date = new Date("2026-10-19T12:00:00.000Z");
export const user = {
  CODIGO: 1,
  NOME: "Operadora demonstrativa",
  NIVEL: "ADMIN",
  SETOR: 1,
  ATIVO: "SIM",
};
export const auth = { instance: "tenant-a", token: "fixture-only", user, status: "authenticated" };
export const channels = [{ id: 23, name: "Canal de demonstração", type: "REMOTE" }];
export const parameters = {
  feature_telephony_dialer_enabled: "true",
  enable_internal_chats: "true",
};
export const initialMessage = {
  id: 77,
  instance: "tenant-a",
  body: "Olá! Preciso acompanhar meu atendimento.",
  from: "5511900000001",
  to: "me:23",
  status: "RECEIVED",
  type: "chat",
  timestamp: String(date.getTime()),
  sentAt: date,
  chatId: 1,
  contactId: 101,
  clientId: 23,
  quotedId: null,
  fileId: null,
  fileName: null,
  fileType: null,
  fileSize: null,
  isForwarded: false,
  isEdited: false,
  userId: null,
  agentId: null,
} as WppMessage;
const makeChat = (id: number, name: string) => ({
  id,
  chatType: "wpp",
  contactId: 100 + id,
  contact: { id: 100 + id, name, phone: `551190000000${id}` },
  customer: {
    CODIGO: id,
    RAZAO: `Empresa demonstrativa ${id}`,
    COD_ERP: `DEMO-${id}`,
    CPF_CNPJ: "00000000000000",
  },
  startedAt: new Date(date.getTime() - id * 60_000).toISOString(),
  isFinished: false,
  isUnread: id === 2,
  isPinned: false,
  userId: id,
  lastMessage: {
    ...initialMessage,
    id: 70 + id,
    timestamp: String(date.getTime() - id * 60_000),
    body: `Última mensagem de ${name}`,
  },
});
const initialChats = [
  makeChat(1, "Ana Souza"),
  makeChat(2, "Bruno Lima"),
  makeChat(3, "Carla Santos"),
  makeChat(4, "Diego Alves"),
];
type Chat = (typeof initialChats)[number];
type Send = {
  to: string;
  data: Record<string, any>;
  resolve: (value: WppMessage) => void;
  reject: (error: Error) => void;
};
export const state = { sends: [] as Send[], lookups: [] as unknown[][], toasts: [] as string[] };
let snapshot = {
  currentChat: null as Chat | null,
  chats: initialChats,
  filters: {
    showingType: "all",
    search: "",
    sortBy: "lastMessage",
    sortOrder: "desc",
  } as ChatsFiltersState,
  selectedChannel: channels[0],
  messages: Object.fromEntries(
    initialChats.map((chat) => [
      chat.contactId,
      [
        { ...initialMessage, contactId: chat.contactId, chatId: chat.id, from: chat.contact.phone },
        {
          ...initialMessage,
          id: 78,
          body: "Bom dia! Vou conferir a sua solicitação e já retorno.",
          from: "me:23",
          status: "READ",
          contactId: chat.contactId,
          chatId: chat.id,
        },
        {
          ...initialMessage,
          id: 79,
          body: "Combinado. Obrigada pelo retorno!",
          contactId: chat.contactId,
          chatId: chat.id,
          from: chat.contact.phone,
        },
      ],
    ]),
  ) as Record<number, WppMessage[]>,
};
const listeners = new Set<() => void>();
const update = (patch: Partial<typeof snapshot>) => {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
};
export const openChat = (chat: Chat) => update({ currentChat: chat });
export const setCurrentChat = (chat: Chat | null) => update({ currentChat: chat });
export const changeChatFilters = (action: ChangeFiltersAction) =>
  update({ filters: chatsFilterReducer(snapshot.filters, action) });
export function useEnvironment() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => snapshot,
  );
}
export function sendMessage(to: string, data: Record<string, any>) {
  return new Promise<WppMessage>((resolve, reject) =>
    state.sends.push({ to, data, resolve, reject }),
  );
}
export function resolveSend(index = 0) {
  const send = state.sends[index],
    contactId = Number(send.data.contactId),
    chatId = Number(send.data.chatId);
  const message = {
    ...initialMessage,
    id: 800 + index,
    contactId,
    chatId,
    from: "me:23",
    body: String(send.data.text ?? ""),
    status: "SENT",
    quotedId: send.data.quotedId ?? null,
  } as WppMessage;
  update({
    messages: {
      ...snapshot.messages,
      [contactId]: [...(snapshot.messages[contactId] ?? []), message],
    },
  });
  send.resolve(message);
}
export function rejectUnknown(index = 0) {
  const send = state.sends[index];
  send.reject(
    new UnconfirmedMessageSendError(
      String(send.data.idempotencyKey),
      new Error("Fixture response timed out"),
    ),
  );
}
const preferences = async (_kind: string, id: number, action: string) =>
  update({
    chats: snapshot.chats.map((chat) =>
      chat.id === id
        ? {
            ...chat,
            ...(action === "pin" || action === "unpin"
              ? { isPinned: action === "pin" }
              : { isUnread: action === "unread" }),
          }
        : chat,
    ),
  });
export const chatsChannels = { current: new Map<number, number>() };
export const internal = {
  internalChats: [],
  users: [user, { CODIGO: 2, NOME: "Bruno" }],
  mentionDirectory: EMPTY_MENTION_DIRECTORY,
  messages: {},
  currentInternalChatMessages: [],
  phoneNameMap: new Map(),
  whatsappSenderNameMap: new Map(),
  sendInternalMessage: () => Promise.reject(new Error("No internal send configured")),
  updateChatPreference: preferences,
  reactToInternalMessage: async () => {},
  openInternalChat: () => {},
};
export const AuthContext = createContext<any>(auth);
export const WhatsappContext = createContext<any>({});
export const InternalChatContext = createContext<any>(internal);
export const AppContext = createContext<any>({ openModal: () => {}, closeModal: () => {} });
export const ContactsContext = createContext<any>({ state: { contacts: [] } });
export const useAuthContext = () => useContext(AuthContext);
export const useWhatsappContext = () => useContext(WhatsappContext);
export const useWhatsappChatList = useWhatsappContext;
export const useWhatsappSession = useWhatsappContext;
export const useInternalChatContext = () => useContext(InternalChatContext);
export const useAppContext = () => useContext(AppContext);
export const useContactsContext = () => useContext(ContactsContext);
export function makeWhatsapp(env: ReturnType<typeof useEnvironment>) {
  return {
    ...env,
    chatFilters: env.filters,
    currentChatMessages: env.currentChat ? env.messages[env.currentChat.contactId] : [],
    parameters,
    channels,
    loaded: true,
    globalChannel: null,
    chatsChannels,
    changeChatFilters,
    openChat,
    setCurrentChat,
    sendMessage,
    isReadOnlyMode: false,
    setSelectedChannel: (selectedChannel: (typeof channels)[number]) => update({ selectedChannel }),
    updateChatPreference: preferences,
    lookupMessageAttempt: async (...args: unknown[]) => {
      state.lookups.push(args);
      return null;
    },
    editMessage: async () => {},
    reactToMessage: async () => {},
    forwardMessages: async () => {},
    wppApi: {
      current: { setAuth() {}, getSectors: async () => [], getChannels: async () => channels },
    },
  };
}
export const filesService = {
  setAuth() {},
  getFileDownloadUrl: () => "data:text/plain,dados-ficticios",
};
export const customersService = {
  setAuth() {},
  getTelephonySchedules: async () => ({ data: [] }),
  getTelephonyFinishResults: async () => ({ data: [] }),
  startTelephonyScheduleCall: async () => ({ callId: "fixture" }),
  reportTelephonyCall: async () => {},
};
export const toast = Object.fromEntries(
  ["error", "info", "success", "warning"].map((level) => [
    level,
    (message: string) => state.toasts.push(message),
  ]),
);
export function Empty() {
  return null;
}
