import { useSyncExternalStore } from "react";
let auth = {
  instance: "tenant-a",
  token: "token-a",
  status: "authenticated",
  user: { CODIGO: 99, NIVEL: "ADMIN" },
};
const listeners = new Set<() => void>();
export function useAuthContext() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => auth,
  );
}
export function switchAuth(instance: string, token: string, role = "ADMIN") {
  auth = { ...auth, instance, token, user: { ...auth.user, NIVEL: role } };
  for (const listener of listeners) listener();
}
