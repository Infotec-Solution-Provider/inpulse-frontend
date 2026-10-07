"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { AuthContext } from "@/app/auth-context";
import { SocketContext } from "../socket-context";
import { AppContext } from "../app-context";
import {
  createInitialFilters,
  equalMonitorFilters,
  monitorStorageKey,
  normalizePageSize,
  restoreMonitorPreferences,
  serializeMonitorPreferences,
} from "./filters-state";
import { useMonitorData } from "./use-monitor-data";
import type { MonitorFiltersState, MonitorOperationalStatus, MonitorPreferences } from "./types";

export type {
  MonitorFiltersState,
  MonitorItem,
  MonitorSummary,
  MonitorOperational,
  MonitorOperationalStatus,
} from "./types";

interface MonitorContextProps extends ReturnType<typeof useMonitorData> {
  filters: MonitorFiltersState;
  appliedFilters: MonitorFiltersState;
  setFilters: Dispatch<SetStateAction<MonitorFiltersState>>;
  hasUnappliedFilters: boolean;
  resetFilters: () => void;
  applyFilters: (nextFilters?: MonitorFiltersState) => void;
  setOperationalStatus: (status: MonitorOperationalStatus) => void;
  page: number;
  pageSize: number;
  setPage: Dispatch<SetStateAction<number>>;
  setPageSize: Dispatch<SetStateAction<number>>;
  autoRefresh: boolean;
  autoRefreshPaused: boolean;
  setAutoRefresh: Dispatch<SetStateAction<boolean>>;
  viewMode: "cards" | "compact";
  setViewMode: Dispatch<SetStateAction<"cards" | "compact">>;
}

export const MonitorContext = createContext<MonitorContextProps | null>(null);

export function MonitorProvider({ children }: { children: ReactNode }) {
  const { token, instance, user } = useContext(AuthContext);
  const storageKey = token && instance && user ? monitorStorageKey(instance, user.CODIGO) : null;
  // Remounting the scoped provider prevents even one rendered frame of another tenant's data.
  return (
    <ScopedMonitorProvider key={storageKey ?? "anonymous"} storageKey={storageKey} token={token}>
      {children}
    </ScopedMonitorProvider>
  );
}

function ScopedMonitorProvider({
  children,
  storageKey,
  token,
}: {
  children: ReactNode;
  storageKey: string | null;
  token: string | null;
}) {
  const { socket } = useContext(SocketContext);
  const { modal } = useContext(AppContext);
  const [saved] = useState<MonitorPreferences>(() => {
    try {
      return restoreMonitorPreferences(
        storageKey && typeof window !== "undefined" ? localStorage.getItem(storageKey) : null,
      );
    } catch {
      return restoreMonitorPreferences(null);
    }
  });
  const [filters, setFilters] = useState(saved.filters);
  const [appliedFilters, setAppliedFilters] = useState(saved.filters);
  const [page, changePage] = useState(1);
  const [pageSize, changePageSize] = useState(saved.pageSize);
  const [autoRefresh, setAutoRefresh] = useState(saved.autoRefresh);
  const [viewMode, setViewMode] = useState(saved.viewMode);
  const data = useMonitorData({
    token: storageKey ? token : null,
    filters: appliedFilters,
    page,
    pageSize,
    autoRefresh,
    modalOpen: Boolean(modal),
    socket,
    onPageOverflow: changePage,
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(
        storageKey,
        serializeMonitorPreferences({ filters: appliedFilters, pageSize, autoRefresh, viewMode }),
      );
    } catch {
      /* Storage can be unavailable; the screen remains functional. */
    }
  }, [storageKey, appliedFilters, pageSize, autoRefresh, viewMode]);

  const applyFilters = useCallback(
    (next?: MonitorFiltersState) => {
      const resolved = next ?? filters;
      setFilters(resolved);
      setAppliedFilters(resolved);
      changePage(1);
      if (page === 1 && equalMonitorFilters(resolved, appliedFilters)) data.refetch();
    },
    [filters, appliedFilters, page, data.refetch],
  );

  const resetFilters = useCallback(() => {
    const defaults = createInitialFilters();
    setFilters(defaults);
    setAppliedFilters(defaults);
    changePage(1);
    if (page === 1 && equalMonitorFilters(defaults, appliedFilters)) data.refetch();
  }, [appliedFilters, page, data.refetch]);

  const setOperationalStatus = useCallback((status: MonitorOperationalStatus) => {
    // Chips apply just their own condition; unsubmitted advanced filters stay as drafts.
    setFilters((previous) => ({ ...previous, operationalStatus: status }));
    setAppliedFilters((previous) => ({ ...previous, operationalStatus: status }));
    changePage(1);
  }, []);

  const setPage = useCallback<Dispatch<SetStateAction<number>>>((value) => {
    changePage((previous) => {
      const next = typeof value === "function" ? value(previous) : value;
      return Number.isFinite(next) ? Math.max(1, Math.trunc(next)) : 1;
    });
  }, []);

  const setPageSize = useCallback<Dispatch<SetStateAction<number>>>((value) => {
    changePageSize((previous) =>
      normalizePageSize(typeof value === "function" ? value(previous) : value),
    );
    changePage(1);
  }, []);

  return (
    <MonitorContext.Provider
      value={{
        ...data,
        filters,
        appliedFilters,
        setFilters,
        hasUnappliedFilters: !equalMonitorFilters(filters, appliedFilters),
        resetFilters,
        applyFilters,
        setOperationalStatus,
        page,
        pageSize,
        setPage,
        setPageSize,
        autoRefresh,
        setAutoRefresh,
        autoRefreshPaused: autoRefresh && Boolean(modal),
        viewMode,
        setViewMode,
      }}
    >
      {children}
    </MonitorContext.Provider>
  );
}

export default function useMonitorContext() {
  const context = useContext(MonitorContext);
  if (!context) throw new Error("useMonitorContext must be used within a MonitorProvider");
  return context;
}
