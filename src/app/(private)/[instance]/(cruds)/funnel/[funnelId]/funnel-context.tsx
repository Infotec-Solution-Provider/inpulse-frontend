"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { AuthContext } from "@/app/auth-context";
import funnelApiService from "@/lib/services/funnel.service";
import type {
  FunnelBoardColumn,
  FunnelCard,
  FunnelSnapshotStatus,
} from "@/lib/types/funnel.types";

interface StagePageState {
  page: number;
  totalRows: number;
  perPage: number;
}

interface FunnelContextValue {
  funnelName: string;
  columns: FunnelBoardColumn[];
  loading: boolean;
  hasSnapshot: boolean;
  snapshotStatus: FunnelSnapshotStatus;
  lastComputedAt: string | null;
  loadBoard: () => Promise<void>;
  triggerRefresh: () => Promise<void>;
  loadMoreClients: (stageId: number) => Promise<void>;
  hasMore: (stageId: number) => boolean;
  loadingMore: Record<number, boolean>;
}

export const FunnelContext = createContext<FunnelContextValue>({} as FunnelContextValue);

export function useFunnelContext() {
  const ctx = useContext(FunnelContext);
  if (!ctx || Object.keys(ctx).length === 0) {
    throw new Error("useFunnelContext must be used inside FunnelProvider");
  }
  return ctx;
}

interface Props {
  funnelId: number;
  children: ReactNode;
}

export default function FunnelProvider({ funnelId, children }: Props) {
  const PREVIEW = 10;
  const { token } = useContext(AuthContext);

  const [funnelName, setFunnelName] = useState("");
  const [columns, setColumns] = useState<FunnelBoardColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [snapshotStatus, setSnapshotStatus] = useState<FunnelSnapshotStatus>("idle");
  const [lastComputedAt, setLastComputedAt] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState<Record<number, boolean>>({});
  const [pageState, setPageState] = useState<Record<number, StagePageState>>({});

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const loadBoard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const board = await funnelApiService.getBoard(token, funnelId, PREVIEW);

      if (!board) {
        setHasSnapshot(false);
        setColumns([]);
        return;
      }

      setHasSnapshot(true);
      setLastComputedAt(board.computedAt);
      setColumns(board.columns);

      const newPageState: Record<number, StagePageState> = {};
      for (const col of board.columns) {
        newPageState[col.stageId] = { page: 1, totalRows: col.total, perPage: PREVIEW };
      }
      setPageState(newPageState);
    } catch {
      toast.error("Não foi possível carregar o funil de vendas.");
    } finally {
      setLoading(false);
    }
  }, [token, funnelId]);

  // Load funnel name and board on mount
  useEffect(() => {
    if (!token) return;
    funnelApiService
      .listFunnels(token)
      .then((list) => {
        const found = list.find((f) => f.id === funnelId);
        if (found) setFunnelName(found.name);
      })
      .catch(() => {/* non-fatal */});
    loadBoard();
  }, [token, funnelId, loadBoard]);

  const triggerRefresh = useCallback(async () => {
    if (!token) return;
    stopPolling();
    try {
      const { snapshotId } = await funnelApiService.triggerSnapshot(token, funnelId);
      setSnapshotStatus("processing");

      pollingRef.current = setInterval(async () => {
        try {
          const status = await funnelApiService.getSnapshotStatus(token, funnelId, snapshotId);
          if (status.status === "DONE") {
            stopPolling();
            setSnapshotStatus("done");
            await loadBoard();
          } else if (status.status === "FAILED") {
            stopPolling();
            setSnapshotStatus("failed");
            toast.error("Falha no processamento do funil. Tente novamente.");
          }
        } catch {
          stopPolling();
          setSnapshotStatus("failed");
          toast.error("Erro ao verificar status do processamento.");
        }
      }, 3000);
    } catch {
      toast.error("Não foi possível iniciar o processamento.");
    }
  }, [token, funnelId, stopPolling, loadBoard]);

  const hasMore = useCallback(
    (stageId: number) => {
      const ps = pageState[stageId];
      if (!ps) return false;
      return ps.page * ps.perPage < ps.totalRows;
    },
    [pageState],
  );

  const loadMoreClients = useCallback(
    async (stageId: number) => {
      const ps = pageState[stageId];
      if (!ps || !hasMore(stageId) || !token) return;

      setLoadingMore((prev) => ({ ...prev, [stageId]: true }));
      try {
        const nextPage = ps.page + 1;
        const result = await funnelApiService.getClientsByStage(
          token,
          funnelId,
          stageId,
          nextPage,
          ps.perPage,
        );

        setColumns((prev) =>
          prev.map((col) => {
            if (col.stageId !== stageId) return col;
            const existingIds = new Set(col.clients.map((c: FunnelCard) => c.ccId));
            const newClients = result.clients.filter((c) => !existingIds.has(c.ccId));
            return { ...col, clients: [...col.clients, ...newClients] };
          }),
        );

        setPageState((prev) => ({
          ...prev,
          [stageId]: { ...ps, page: nextPage, totalRows: result.page.totalRows },
        }));
      } catch {
        toast.error("Não foi possível carregar mais clientes.");
      } finally {
        setLoadingMore((prev) => ({ ...prev, [stageId]: false }));
      }
    },
    [pageState, hasMore, token, funnelId],
  );

  return (
    <FunnelContext.Provider
      value={{
        funnelName,
        columns,
        loading,
        hasSnapshot,
        snapshotStatus,
        lastComputedAt,
        loadBoard,
        triggerRefresh,
        loadMoreClients,
        hasMore,
        loadingMore,
      }}
    >
      {children}
    </FunnelContext.Provider>
  );
}
