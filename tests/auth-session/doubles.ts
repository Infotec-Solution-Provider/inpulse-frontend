import { useSyncExternalStore } from "react";
import type { User } from "../../src/lib/sdk-local";

type Session = { token: string; user: User };
type PendingRefresh = { resolve: (session: Session) => void; reject: (error: Error) => void };
const user = { CODIGO: 1, SETOR: 1, NIVEL: null, ATIVO: "SIM" } as User;

export const state = {
  refreshCalls: 0,
  pending: [] as PendingRefresh[],
  redirects: [] as string[],
  toasts: [] as string[],
};
const router = { replace: (path: string) => { state.redirects.push(path); } };
let pathname = "/test-tenant";
const navigationListeners = new Set<() => void>();
export const useRouter = () => router;
export const usePathname = () => useSyncExternalStore(
  (listener) => { navigationListeners.add(listener); return () => { navigationListeners.delete(listener); }; },
  () => pathname,
);
export function navigate(path: string) {
  pathname = path;
  navigationListeners.forEach((listener) => listener());
}
export const toast = { error: (message: string) => { state.toasts.push(message); } };
export const sanitizeErrorMessage = (error: unknown) => String(error);
export const usersService = {
  setAuth: () => undefined,
  getUserById: async () => user,
};
export const authService = {
  refresh: (_instance: string, signal: AbortSignal) => {
    state.refreshCalls += 1;
    return new Promise<Session>((resolve, reject) => {
      state.pending.push({ resolve, reject });
      signal.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
    });
  },
  login: async () => { throw new Error("Login is not exercised by this harness"); },
  logout: async () => undefined,
  fetchSessionData: async () => { throw new Error("Legacy migration is not exercised by this harness"); },
};

export function resolveRefresh() {
  const refresh = state.pending.shift();
  if (!refresh) throw new Error("No refresh request is pending");
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 }));
  refresh.resolve({ token: `test.${payload}.${state.refreshCalls}`, user: { ...user } });
}

export function rejectRefresh(status: number) {
  const refresh = state.pending.shift();
  if (!refresh) throw new Error("No refresh request is pending");
  refresh.reject(Object.assign(new Error(`Refresh returned ${status}`), {
    isAxiosError: true,
    response: { status },
  }));
}
