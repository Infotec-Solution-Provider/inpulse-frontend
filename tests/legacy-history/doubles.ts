import { useSyncExternalStore } from "react";
const listeners = new Set<() => void>();
const query = new URLSearchParams(location.search);
const state = {
  parameters: JSON.parse(sessionStorage.getItem("@history/parameters") || "{}") as Record<string, string>,
  user: { CODIGO: 23, NIVEL: query.get("role") || "ADMIN" }, instance: "odim", token: "fixture-token" as string | null,
  historyCalls: [] as any[], mutations: [] as string[], aborted: 0, chatId: 41,
  fail: query.has("error"), empty: query.has("empty"), delay: Number(query.get("delay") || 0), invalidContact: query.has("wrong-contact"), revision: 0,
};
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function watch() { useSyncExternalStore(subscribe, () => state.revision); }
Object.assign(window, { historyTest: { state, update(patch: Partial<typeof state>) {
  Object.assign(state, patch); state.revision++; listeners.forEach(listener => listener());
} } });
export function useAuthContext() { watch(); return { token: state.token, instance: state.instance, user: state.user }; }
export function useHistoryChatId() { watch(); return state.chatId; }
const mutate = async () => { state.mutations.push("unexpected mutation"); throw new Error("Read-only archive"); };
const wppApi = { current: { ax: { post: mutate, put: mutate, patch: mutate, delete: mutate,
  async get(url: string, config: any) {
    state.historyCalls.push({ url, params: config.params, instance: config.headers["x-crm-instance"] });
    config.signal.addEventListener("abort", () => state.aborted++);
    if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
    if (state.fail) throw new Error("Fixture unavailable");
    const older = config.params.beforeId !== undefined;
    const common = { id: older ? 99 : 100, body: older ? "Mensagem anterior" : "<img src=x onerror=alert(1)>\n  Texto com espaços", occurredAt: "2026-11-09T12:30:00Z" };
    const entry = url.includes("/contacts/") ? {
      ...common, contactId: state.invalidContact ? 999 : 149, chatId: null, clientId: 27, userId: -5000, agentId: null,
      from: "origem sintética", to: "destino sintético", type: "document", sentAt: null, timestamp: "legacy timestamp", status: "READ", statusTimestamp: null,
      fileId: older ? null : 88, fileName: "arquivo <antigo>.pdf", fileType: "application/pdf", fileSize: "42",
      wabaId: null, wwebjsId: null, wwebjsIdStanza: null, gupshupId: null, gupshupRequestId: null, quotedId: null,
    } : common;
    return { data: { data: { entries: state.empty ? [] : [entry], nextBeforeId: state.empty || older ? null : 100 } } };
  },
} } };
export function useWhatsappContext() { watch(); return { loaded: true, parameters: state.parameters, wppApi }; }
export function useContactsContext() { return { customerMap: new Map([[1, "Cliente sintético"]]), customerObjectMap: new Map(), openLinkCustomerModal: mutate }; }
