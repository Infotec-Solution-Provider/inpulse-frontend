import { useSyncExternalStore } from "react";
const listeners = new Set<() => void>();
const state = {
  parameters: JSON.parse(sessionStorage.getItem("@test/parameters") || "{}") as Record<string, string>,
  user: { CODIGO: 23, NIVEL: "ADMIN" }, instance: "odim", loaded: true,
  historyCalls: [] as any[],
  failHistory: new URLSearchParams(location.search).has("history-error"),
  historyEmpty: new URLSearchParams(location.search).has("history-empty"),
  historyDelay: Number(new URLSearchParams(location.search).get("history-delay") || 0),
  route: new URLSearchParams(location.search).get("route") || "/odim", effects: 0, renders: 0, revision: 0,
};
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function watch() { useSyncExternalStore(subscribe, () => state.revision); }
Object.assign(window, { flagTest: {
  state,
  update(patch: Partial<typeof state>) {
    Object.assign(state, patch); state.revision++;
    sessionStorage.setItem("@test/parameters", JSON.stringify(state.parameters));
    listeners.forEach(listener => listener());
  },
} });
export function useAuthContext() { watch(); return { token: "fixture-token", instance: state.instance, user: state.user, status: "authenticated" }; }
const wppApi = { current: { ax: { async get(url: string, config: any) {
  state.historyCalls.push({ url, params: config.params, instance: config.headers["x-crm-instance"] });
  if (state.historyDelay) await new Promise(resolve => setTimeout(resolve, state.historyDelay));
  if (state.failHistory) throw new Error("backend unavailable");
  const older = config.params.beforeId !== undefined;
  return { data: { data: { entries: state.historyEmpty ? [] : [{ id: older ? 99 : 100, body: older ? "Registro anterior" : "<img src=x onerror=alert(1)>\n  Texto com espaços", occurredAt: "2026-11-09T12:30:00Z" }], nextBeforeId: state.historyEmpty || older ? null : 100 } } };
} } } };
export function useWhatsappContext() { watch(); return { loaded: state.loaded, parameters: state.parameters, wppApi }; }
export function usePathname() { watch(); return state.route; }
