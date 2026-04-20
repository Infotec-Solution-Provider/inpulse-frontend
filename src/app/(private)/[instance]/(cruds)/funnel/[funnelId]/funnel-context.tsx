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
  FunnelType,
} from "@/lib/types/funnel.types";

interface StagePageState {
  page: number;
  totalRows: number;
  perPage: number;
}

interface FunnelContextValue {
  funnelId: number;
  funnelName: string;
  funnelType: FunnelType;
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
  // Manual funnel handlers
  addManualEntry: (stageId: number, ccId: number) => Promise<void>;
  removeManualEntry: (entryId: number, stageId: number) => Promise<void>;
  moveCard: (entryId: number, fromStageId: number, toStageId: number) => Promise<void>;
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
  const [funnelType, setFunnelType] = useState<FunnelType>("AUTOMATIC");
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
        if (found) {
          setFunnelName(found.name);
          setFunnelType(found.type);
        }
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

  const addManualEntry = useCallback(
    async (stageId: number, ccId: number) => {
      if (!token) return;
      const card = await funnelApiService.addManualEntry(token, funnelId, stageId, ccId);
      setColumns((prev) =>
        prev.map((col) => {
          if (col.stageId !== stageId) return col;
          return { ...col, clients: [card, ...col.clients], total: col.total + 1 };
        }),
      );
    },
    [token, funnelId],
  );

  const removeManualEntry = useCallback(
    async (entryId: number, stageId: number) => {
      if (!token) return;
      // Optimistic update
      setColumns((prev) =>
        prev.map((col) => {
          if (col.stageId !== stageId) return col;
          return {
            ...col,
            clients: col.clients.filter((c) => c.entryId !== entryId),
            total: Math.max(0, col.total - 1),
          };
        }),
      );
      try {
        await funnelApiService.removeManualEntry(token, funnelId, entryId);
      } catch {
        toast.error("Erro ao remover cliente. Recarregando...");
        await loadBoard();
      }
    },
    [token, funnelId, loadBoard],
  );

  const moveCard = useCallback(
    async (entryId: number, fromStageId: number, toStageId: number) => {
      if (!token || fromStageId === toStageId) return;
      // Optimistic update: move card between columns
      let movedCard: FunnelCard | undefined;
      setColumns((prev) => {
        let card: FunnelCard | undefined;
        const next = prev.map((col) => {
          if (col.stageId === fromStageId) {
            card = col.clients.find((c) => c.entryId === entryId);
            return {
              ...col,
              clients: col.clients.filter((c) => c.entryId !== entryId),
              total: Math.max(0, col.total - 1),
            };
          }
          return col;
        });
        movedCard = card;
        if (!card) return prev;
        return next.map((col) => {
          if (col.stageId !== toStageId) return col;
          return { ...col, clients: [card!, ...col.clients], total: col.total + 1 };
        });
      });
      void movedCard;
      try {
        await funnelApiService.moveManualEntry(token, funnelId, entryId, toStageId);
      } catch {
        toast.error("Erro ao mover cliente. Recarregando...");
        await loadBoard();
      }
    },
    [token, funnelId, loadBoard],
  );

  return (
    <FunnelContext.Provider
      value={{
        funnelId,
        funnelName,
        funnelType,
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
        addManualEntry,
        removeManualEntry,
        moveCard,
      }}
    >
      {children}
    </FunnelContext.Provider>
  );
}
