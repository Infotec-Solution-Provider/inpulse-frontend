import { useSyncExternalStore } from "react";
let auth = {
  instance: "tenant-a",
  token: "token-a",
  user: {
    CODIGO: 7,
    NIVEL: new URLSearchParams(location.search).has("operator") ? "ATIVO" : "ADMIN",
  },
};
const listeners = new Set<() => void>();
export function useAuthContext() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => auth,
  );
}
export function switchTenant() {
  auth = { ...auth, instance: "tenant-b", token: "token-b" };
  listeners.forEach((listener) => listener());
}
