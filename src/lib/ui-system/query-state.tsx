"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
  type SetStateAction,
  type Dispatch,
} from "react";

export function createQueryStore() {
  const values = new Map<string, unknown>(),
    listeners = new Set<() => void>();
  return {
    read<T>(key: string, initial: T): T {
      if (!values.has(key)) values.set(key, initial);
      return values.get(key) as T;
    },
    write<T>(key: string, next: T) {
      values.set(key, next);
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
const QueryContext = createContext<ReturnType<typeof createQueryStore> | null>(null);
/** Only query controls are retained. No records, tokens or persistent browser storage. */
export function CrmQueryProvider({ scope, children }: { scope: string; children: ReactNode }) {
  const store = useMemo(createQueryStore, [scope]);
  return <QueryContext.Provider value={store}>{children}</QueryContext.Provider>;
}
export function useCrmQueryState<T>(
  key: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const provider = useContext(QueryContext),
    fallback = useMemo(createQueryStore, []),
    store = provider ?? fallback;
  const seed = useMemo(
    () => (typeof initial === "function" ? (initial as () => T)() : initial),
    [store, key],
  ); // Same initialization semantics as useState.
  const get = useCallback(() => store.read(key, seed), [store, key, seed]);
  const value = useSyncExternalStore(store.subscribe, get, get);
  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => store.write(key, typeof next === "function" ? (next as (old: T) => T)(get()) : next),
    [store, key, get],
  );
  return [value, set];
}
