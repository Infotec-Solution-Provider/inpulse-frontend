"use client";

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { AuthContext } from "@/app/auth-context";
import { AppContext } from "../../app-context";
import { normalizePageSize } from "../filters-state";
import {
  createTelephonyFilters,
  reconcileTelephonyGeography,
  restoreTelephonyPreferences,
  serializeTelephonyPreferences,
  telephonyStorageKey,
} from "./filter-state";
import { useTelephonyMonitorData } from "./use-telephony-monitor-data";
import type {
  TelephonyMonitorFilters,
  TelephonyMonitorMode,
  TelephonyMonitorPreferences,
} from "./types";

interface FilterState extends TelephonyMonitorPreferences {
  scopeKey: string;
  identityKey: string;
  appliedFilters: TelephonyMonitorFilters;
  page: number;
}

export default function useTelephonyMonitor(
  mode: TelephonyMonitorMode,
  options: { modalOpen?: boolean } = {},
) {
  const { instance, user, token } = useContext(AuthContext);
  const { modal } = useContext(AppContext);
  const identityKey = JSON.stringify([instance, user?.CODIGO ?? null, Boolean(token)]);
  const storageKey =
    instance && user && token ? telephonyStorageKey(instance, user.CODIGO, mode) : null;
  const scopeKey = storageKey ?? `anonymous:${mode}`;
  const memory = useRef({ identityKey, modes: new Map<TelephonyMonitorMode, FilterState>() });
  if (memory.current.identityKey !== identityKey)
    memory.current = { identityKey, modes: new Map() };
  const initial = useMemo<FilterState>(() => {
    let raw: string | null = null;
    try {
      if (storageKey && typeof window !== "undefined") raw = localStorage.getItem(storageKey);
    } catch {
      /* Storage is optional. */
    }
    const saved = restoreTelephonyPreferences(raw, mode);
    return { ...saved, scopeKey, identityKey, appliedFilters: saved.filters, page: 1 };
  }, [scopeKey, identityKey]);
  const [state, setState] = useState(initial);
  if (state.identityKey === identityKey) memory.current.modes.set(state.filters.mode, state);
  const current =
    state.scopeKey === scopeKey && state.identityKey === identityKey
      ? state
      : (memory.current.modes.get(mode) ?? initial);
  const ready = state.scopeKey === scopeKey && Boolean(storageKey);
  const modalOpen = Boolean(modal) || Boolean(options.modalOpen);

  // A mode/identity transition returns only the new scope's defaults while restoring its state.
  useEffect(() => {
    setState((previous) =>
      previous.scopeKey === scopeKey && previous.identityKey === identityKey ? previous : current,
    );
  }, [scopeKey, identityKey]);

  const update = useCallback(
    (transform: (previous: FilterState) => FilterState) => {
      setState((previous) => (previous.scopeKey === scopeKey ? transform(previous) : previous));
    },
    [scopeKey],
  );
  const setPage = useCallback<Dispatch<SetStateAction<number>>>(
    (value) =>
      update((previous) => {
        const next = typeof value === "function" ? value(previous.page) : value;
        return { ...previous, page: Number.isFinite(next) ? Math.max(1, Math.trunc(next)) : 1 };
      }),
    [update],
  );
  const data = useTelephonyMonitorData({
    scopeKey,
    identityKey,
    token,
    filters: current.appliedFilters,
    page: current.page,
    pageSize: current.pageSize,
    enabled: ready,
    autoRefresh: current.autoRefresh,
    modalOpen,
    onPageOverflow: setPage,
  });

  useEffect(() => {
    if (!storageKey || !ready) return;
    try {
      localStorage.setItem(
        storageKey,
        serializeTelephonyPreferences({
          filters: current.appliedFilters,
          pageSize: current.pageSize,
          autoRefresh: current.autoRefresh,
        }),
      );
    } catch {
      /* Private browsing/storage limits do not prevent operation. */
    }
  }, [storageKey, ready, current.appliedFilters, current.pageSize, current.autoRefresh]);

  const setFilters = useCallback<Dispatch<SetStateAction<TelephonyMonitorFilters>>>(
    (value) =>
      update((previous) => ({
        ...previous,
        filters: reconcileTelephonyGeography({
          ...(typeof value === "function" ? value(previous.filters) : value),
          mode,
        }),
      })),
    [mode, update],
  );
  const applyFilters = useCallback(
    (next?: TelephonyMonitorFilters) => {
      const applied = reconcileTelephonyGeography({ ...(next ?? current.filters), mode });
      const same =
        current.page === 1 && JSON.stringify(applied) === JSON.stringify(current.appliedFilters);
      update((previous) => ({ ...previous, filters: applied, appliedFilters: applied, page: 1 }));
      if (same) data.refetch();
    },
    [current.filters, current.appliedFilters, current.page, mode, update, data.refetch],
  );
  const resetFilters = useCallback(() => {
    const filters = createTelephonyFilters(mode);
    const same =
      current.page === 1 && JSON.stringify(filters) === JSON.stringify(current.appliedFilters);
    update((previous) => ({ ...previous, filters, appliedFilters: filters, page: 1 }));
    if (same) data.refetch();
  }, [mode, current.appliedFilters, current.page, update, data.refetch]);
  const setPageSize = useCallback<Dispatch<SetStateAction<number>>>(
    (value) =>
      update((previous) => ({
        ...previous,
        page: 1,
        pageSize: normalizePageSize(typeof value === "function" ? value(previous.pageSize) : value),
      })),
    [update],
  );
  const setAutoRefresh = useCallback<Dispatch<SetStateAction<boolean>>>(
    (value) =>
      update((previous) => ({
        ...previous,
        autoRefresh: typeof value === "function" ? value(previous.autoRefresh) : value,
      })),
    [update],
  );

  return {
    ...data,
    filters: current.filters,
    appliedFilters: current.appliedFilters,
    hasUnappliedFilters: JSON.stringify(current.filters) !== JSON.stringify(current.appliedFilters),
    setFilters,
    applyFilters,
    resetFilters,
    page: current.page,
    pageSize: current.pageSize,
    setPage,
    setPageSize,
    autoRefresh: current.autoRefresh,
    setAutoRefresh,
    autoRefreshPaused: current.autoRefresh && modalOpen,
  };
}
