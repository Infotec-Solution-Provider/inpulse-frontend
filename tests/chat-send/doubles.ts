import { createContext, useSyncExternalStore } from "react";
import type { User, WppMessage } from "../../src/lib/sdk-local";
import type { SendMessageDataState } from "../../src/app/(private)/[instance]/(main)/(chat)/chat-reducer";
import {
  DefinitiveMessageSendError,
  UnconfirmedMessageSendError,
} from "../../src/lib/utils/reliable-message-send";

type Payload = SendMessageDataState & {
  idempotencyKey?: string;
  clientId?: number;
  contactId?: number;
  chatId?: number;
};
type Pending<T> = { resolve: (result: T) => void; reject: (error: Error) => void };
type Send = Pending<WppMessage> & { to: string; data: Payload; kind: "wpp" | "internal" | "edit" };
type Lookup = Pending<WppMessage | null> & { args: unknown[] };

export const state = {
  sends: [] as Send[],
  lookups: [] as Lookup[],
  toasts: [] as string[],
};
const makeChat = (id: number, chatType: "wpp" | "internal" = "wpp") => ({
  id,
  chatType,
  contactId: id + 100,
  contact: { id: id + 100, phone: `55119000000${id}` },
});
const listeners = new Set<() => void>();
let environment = {
  auth: {
    instance: "tenant-a",
    token: "first-token",
    user: { CODIGO: 1, SETOR: 1, NIVEL: null, ATIVO: "SIM" } as User,
  },
  currentChat: makeChat(1),
  selectedChannel: { id: 23 },
};
function updateEnvironment(next: typeof environment) {
  environment = next;
  listeners.forEach((listener) => listener());
}
export function useEnvironment() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => environment,
  );
}
export function switchChat(id: number, chatType: "wpp" | "internal" = "wpp") {
  updateEnvironment({ ...environment, currentChat: makeChat(id, chatType) });
}
export function switchTenant(instance: string) {
  updateEnvironment({ ...environment, auth: { ...environment.auth, instance } });
}
export function refreshToken() {
  updateEnvironment({
    ...environment,
    auth: { ...environment.auth, token: "refreshed-token", user: { ...environment.auth.user } },
  });
}
export function switchChannel(id: number) {
  updateEnvironment({ ...environment, selectedChannel: { id } });
}

function recordSend(kind: Send["kind"], to: string, data: Payload) {
  return new Promise<WppMessage>((resolve, reject) => {
    state.sends.push({ kind, to, data, resolve, reject });
  });
}
export const quotedMessage: WppMessage = {
  id: 77,
  instance: "tenant-a",
  body: "Earlier message",
  from: "551190000001",
  to: "me:23",
  status: "RECEIVED",
  type: "chat",
  timestamp: "1789128000",
  sentAt: new Date("2026-09-11T12:00:00.000Z"),
  chatId: 1,
  contactId: 101,
  clientId: 23,
  wwebjsId: null,
  wabaId: null,
  gupshupId: null,
  gupshupRequestId: null,
  quotedId: null,
  isForwarded: false,
  isEdited: false,
  fileId: null,
  fileName: null,
  fileType: null,
  fileSize: null,
  wwebjsIdStanza: null,
  userId: null,
  agentId: null,
  billingCategory: null,
};
export const whatsapp = {
  sendMessage: (to: string, data: Payload) => recordSend("wpp", to, data),
  lookupMessageAttempt: (...args: unknown[]) => new Promise<WppMessage | null>((resolve, reject) => {
    state.lookups.push({ args, resolve, reject });
  }),
  editMessage: (id: string, text: string) => recordSend("edit", id, { text } as Payload),
  isReadOnlyMode: false,
  messages: { 101: [quotedMessage] } as Record<number, WppMessage[]>,
};
export const internal = {
  sendInternalMessage: (data: Payload) => recordSend("internal", "internal", data),
  messages: {} as Record<number, WppMessage[]>,
};
export const AuthContext = createContext(environment.auth);
export const WhatsappContext = createContext({ ...whatsapp, ...environment });
export const InternalChatContext = createContext(internal);
export const toast = {
  error: (message: string) => { state.toasts.push(message); },
  info: (message: string) => { state.toasts.push(message); },
  success: (message: string) => { state.toasts.push(message); },
  warning: (message: string) => { state.toasts.push(message); },
};

export function resolveSend(index = 0, status: WppMessage["status"] = "SENT") {
  state.sends[index].resolve({ ...quotedMessage, id: 800 + index, status });
}
export function rejectSend(kind: "unknown" | "definitive" | "http400", index = 0) {
  const send = state.sends[index];
  send.reject(kind === "definitive"
    ? new DefinitiveMessageSendError("Upload rejeitado antes do envio.")
    : kind === "http400"
      ? Object.assign(new Error("Provider failed after dispatch."), { response: { status: 400 } })
    : new UnconfirmedMessageSendError(send.data.idempotencyKey!, new Error("Response timed out")));
}
export function resolveLookup(found: boolean, index = 0) {
  state.lookups[index].resolve(found ? { ...quotedMessage, id: 800, status: "SENT" } : null);
}
