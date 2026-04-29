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
  FunnelBoardFilters,
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
  boardTraceId: string | null;
  filters: FunnelBoardFilters;
  columns: FunnelBoardColumn[];
  pageState: Record<number, StagePageState>;
  loading: boolean;
  hasSnapshot: boolean;
  snapshotStatus: FunnelSnapshotStatus;
  lastComputedAt: string | null;
  loadBoard: () => Promise<void>;
  triggerRefresh: () => Promise<void>;
  goToStagePage: (stageId: number, page: number) => Promise<void>;
  loadingMore: Record<number, boolean>;
  applyFilters: (nextFilters: FunnelBoardFilters) => Promise<void>;
  resetFilters: () => Promise<void>;
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

const DEFAULT_FILTERS: FunnelBoardFilters = {
  groupQuery: "",
  segmentQuery: "",
  operatorQuery: "",
  campaignQuery: "",
  lastContactFrom: "",
  lastContactTo: "",
  scheduleFrom: "",
  scheduleTo: "",
  sortBy: "ultimoContato",
  sortOrder: "desc",
};

function createTraceId(prefix: string): string {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${randomPart}`;
}

export default function FunnelProvider({ funnelId, children }: Props) {
  const PREVIEW = 10;
  const { token } = useContext(AuthContext);

  const [funnelName, setFunnelName] = useState("");
  const [funnelType, setFunnelType] = useState<FunnelType>("AUTOMATIC");
  const [boardTraceId, setBoardTraceId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FunnelBoardFilters>(DEFAULT_FILTERS);
  const [columns, setColumns] = useState<FunnelBoardColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [snapshotStatus, setSnapshotStatus] = useState<FunnelSnapshotStatus>("idle");
  const [lastComputedAt, setLastComputedAt] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState<Record<number, boolean>>({});
  const [pageState, setPageState] = useState<Record<number, StagePageState>>({});

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardLoadVersionRef = useRef(0);
  const activeBoardTraceRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const fetchStagePage = useCallback(
    async (
      stageId: number,
      page: number,
      perPage: number,
      activeFilters: FunnelBoardFilters,
      loadVersion: number,
      traceId?: string,
      silent = false,
    ) => {
      if (!token) return;

      const startedAt = performance.now();

      setLoadingMore((prev) => ({ ...prev, [stageId]: true }));
      try {
        const result = await funnelApiService.getClientsByStage(
          token,
          funnelId,
          stageId,
          page,
          perPage,
          activeFilters,
          traceId,
        );

        if (boardLoadVersionRef.current !== loadVersion) {
          return;
        }

        setColumns((prev) =>
          prev.map((col) => {
            if (col.stageId !== stageId) return col;
            return { ...col, clients: result.clients, total: result.page.totalRows };
          }),
        );

        setPageState((prev) => ({
          ...prev,
          [stageId]: { page, totalRows: result.page.totalRows, perPage },
        }));

      } catch (error) {
        if (!silent && boardLoadVersionRef.current === loadVersion) {
          toast.error("Não foi possível carregar a página desta etapa.");
        }
      } finally {
        setLoadingMore((prev) => ({ ...prev, [stageId]: false }));
      }
    },
    [token, funnelId],
  );

  const hydrateInitialStagePages = useCallback(
    async (
      stageIds: number[],
      nextPageState: Record<number, StagePageState>,
      activeFilters: FunnelBoardFilters,
      loadVersion: number,
      parentTraceId: string,
    ) => {
      const BATCH_SIZE = 2;

      for (let index = 0; index < stageIds.length; index += BATCH_SIZE) {
        if (boardLoadVersionRef.current !== loadVersion) {
          return;
        }

        const batch = stageIds.slice(index, index + BATCH_SIZE);
        const batchStartedAt = performance.now();

        await Promise.all(
          batch.map((stageId) =>
            fetchStagePage(
              stageId,
              1,
              nextPageState[stageId]?.perPage ?? PREVIEW,
              activeFilters,
              loadVersion,
              `${parentTraceId}:stage-${stageId}:page-1`,
              true,
            ),
          ),
        );

      }
    },
    [fetchStagePage],
  );

  const loadBoardWithFilters = useCallback(async (activeFilters: FunnelBoardFilters) => {
    if (!token) return;

    const loadVersion = boardLoadVersionRef.current + 1;
    const traceId = createTraceId(`board-${funnelId}-v${loadVersion}`);
    boardLoadVersionRef.current = loadVersion;
    activeBoardTraceRef.current = traceId;
    setBoardTraceId(traceId);

    const startedAt = performance.now();

    setLoading(true);
    setLoadingMore({});

    try {
      const board = await funnelApiService.getBoardSummary(token, funnelId, activeFilters, traceId);

      if (boardLoadVersionRef.current !== loadVersion) {
        return;
      }

      if (!board) {
        setHasSnapshot(false);
        setColumns([]);
        setPageState({});
        return;
      }

      const summaryColumns = board.columns.map((col) => ({ ...col, clients: [] }));
      const newPageState: Record<number, StagePageState> = {};
      for (const col of summaryColumns) {
        newPageState[col.stageId] = { page: 1, totalRows: col.total, perPage: PREVIEW };
      }

      setHasSnapshot(true);
      setLastComputedAt(board.computedAt);
      setColumns(summaryColumns);
      setPageState(newPageState);
      setLoading(false);

      const stageIds = summaryColumns.filter((col) => col.total > 0).map((col) => col.stageId);
      void hydrateInitialStagePages(stageIds, newPageState, activeFilters, loadVersion, traceId);
      return;
    } catch (error) {

      toast.error("Não foi possível carregar o funil de vendas.");
    } finally {
      if (boardLoadVersionRef.current === loadVersion) {
        setLoading(false);
      }
    }
  }, [token, funnelId, hydrateInitialStagePages]);

  const loadBoard = useCallback(async () => {
    await loadBoardWithFilters(filters);
  }, [filters, loadBoardWithFilters]);

  // Load funnel metadata on mount
  useEffect(() => {
    if (!token) return;
    const traceId = createTraceId(`metadata-${funnelId}`);
    const startedAt = performance.now();
    funnelApiService
      .getFunnel(token, funnelId, traceId)
      .then((funnel) => {
        setFunnelName(funnel.name);
        setFunnelType(funnel.type);
      })
  }, [token, funnelId]);

  useEffect(() => {
    if (!token) return;
    void loadBoardWithFilters(filters);
  }, [token, funnelId, loadBoardWithFilters]);

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

  const goToStagePage = useCallback(
    async (stageId: number, page: number) => {
      const ps = pageState[stageId];
      if (!ps || !token) return;

      const totalPages = Math.max(1, Math.ceil(ps.totalRows / ps.perPage));
      if (page < 1 || page > totalPages || page === ps.page) return;

      const traceId = `${activeBoardTraceRef.current ?? createTraceId(`board-${funnelId}`)}:stage-${stageId}:page-${page}`;
      await fetchStagePage(stageId, page, ps.perPage, filters, boardLoadVersionRef.current, traceId);
    },
    [pageState, token, filters, fetchStagePage],
  );

  const applyFilters = useCallback(
    async (nextFilters: FunnelBoardFilters) => {
      setFilters(nextFilters);
      setPageState({});
      await loadBoardWithFilters(nextFilters);
    },
    [loadBoardWithFilters],
  );

  const resetFilters = useCallback(async () => {
    setFilters(DEFAULT_FILTERS);
    setPageState({});
    await loadBoardWithFilters(DEFAULT_FILTERS);
  }, [loadBoardWithFilters]);

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
        boardTraceId,
        filters,
        columns,
        pageState,
        loading,
        hasSnapshot,
        snapshotStatus,
        lastComputedAt,
        loadBoard,
        triggerRefresh,
        goToStagePage,
        loadingMore,
        applyFilters,
        resetFilters,
        addManualEntry,
        removeManualEntry,
        moveCard,
      }}
    >
      {children}
    </FunnelContext.Provider>
  );
}
