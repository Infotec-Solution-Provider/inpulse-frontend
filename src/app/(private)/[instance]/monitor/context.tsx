import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DetailedChat, DetailedSchedule, useWhatsappContext } from "../whatsapp-context";
import { DetailedInternalChat } from "../internal-context";
import { AuthContext } from "@/app/auth-context";

interface MonitorContextProps {
  chats: (DetailedInternalChat | DetailedChat | DetailedSchedule)[];
  filters: MonitorFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<MonitorFiltersState>>;
  resetFilters: () => void;
  applyFilters: (nextFilters?: MonitorFiltersState) => void;
  totalCount: number;
  page: number;
  pageSize: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  refetch: () => void;
}

interface MonitorProviderProps {
  children: React.ReactNode;
}

interface MonitorFiltersState {
  searchText: string;
  searchColumn: "all" | "name" | "phone" | "customer" | "message";
  categories: {
    showCustomerChats: boolean;
    showInternalChats: boolean;
    showInternalGroups: boolean;
    showSchedules: boolean;
  };
  user: number | "all";
  showBots: boolean;
  showOngoing: boolean;
  showFinished: boolean;
  showOnlyScheduled: boolean;
  showUnreadOnly: boolean;
  showPendingResponseOnly: boolean;
  sortBy: "startedAt" | "finishedAt" | "lastMessage" | "name" | "scheduledAt";
  sortOrder: "asc" | "desc";
  startedAt: {
    from: string | null;
    to: string | null;
  };
  finishedAt: {
    from: string | null;
    to: string | null;
  };
  scheduledAt: {
    from: string | null;
    to: string | null;
  };
  scheduledTo: {
    from: string | null;
    to: string | null;
  };
  scheduledBy: number | "all";
  scheduledFor: number | "all";
}

const initialFilters: MonitorFiltersState = {
  searchText: "",
  searchColumn: "all",
  categories: {
    showCustomerChats: true,
    showInternalChats: true,
    showInternalGroups: true,
    showSchedules: true,
  },
  user: "all",
  showBots: false,
  showOngoing: true,
  showFinished: true,
  showOnlyScheduled: false,
  showUnreadOnly: false,
  showPendingResponseOnly: false,
  sortBy: "startedAt",
  sortOrder: "desc",
  startedAt: {
    from: null,
    to: null,
  },
  finishedAt: {
    from: null,
    to: null,
  },
  scheduledAt: {
    from: null,
    to: null,
  },
  scheduledTo: {
    from: null,
    to: null,
  },
  scheduledBy: "all",
  scheduledFor: "all",
};

const STORAGE_KEY = "monitor_filters";

// Função para salvar filtros no localStorage
const saveFiltersToStorage = (filters: MonitorFiltersState) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.error("Erro ao salvar filtros no localStorage:", error);
  }
};

export const MonitorContext = createContext<MonitorContextProps>({} as MonitorContextProps);

export function MonitorProvider({ children }: MonitorProviderProps) {
  const { wppApi } = useWhatsappContext();
  const { token } = useContext(AuthContext);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [chats, setChats] = useState<(DetailedInternalChat | DetailedChat | DetailedSchedule)[]>(
    [],
  );
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState<MonitorFiltersState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<MonitorFiltersState>(initialFilters);

  const applyFilters = (nextFilters?: MonitorFiltersState) => {
    const resolved = nextFilters ?? filters;
    setAppliedFilters(resolved);
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  };

  const fetchData = useCallback(async () => {
    if (!token || !wppApi.current) {
      setChats([]);
      setTotalCount(0);
      return;
    }

    try {
      setIsLoading(true);
      wppApi.current.setAuth(token);

      const clientAny = wppApi.current as any;
      const searchFn = clientAny.searchMonitorData
        ? clientAny.searchMonitorData.bind(clientAny)
        : async ({ page: p, pageSize: ps, filters: f }: any) => {
            const response = await clientAny.ax?.post?.("/api/whatsapp/monitor/search", {
              page: p,
              pageSize: ps,
              filters: f,
            });
            return response?.data?.data ?? { items: [], totalCount: 0 };
          };

      const res = await searchFn({
        page,
        pageSize,
        filters: appliedFilters,
      });

      const items = Array.isArray(res?.items) ? res.items : [];
      const total = typeof res?.totalCount === "number" ? res.totalCount : items.length;
      setChats(items);
      setTotalCount(total);
    } finally {
      setIsLoading(false);
    }
  }, [token, page, pageSize, appliedFilters, wppApi]);

  // Fazer consulta quando página muda ou filtros aplicados mudam
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => {
    fetchData();
  };

  return (
    <MonitorContext.Provider
      value={{
        chats,
        filters,
        setFilters,
        resetFilters,
        applyFilters,
        totalCount,
        page,
        pageSize,
        setPage,
        setPageSize,
        isLoading,
        refetch,
      }}
    >
      {children}
    </MonitorContext.Provider>
  );
}

export default function useMonitorContext() {
  const context = useContext(MonitorContext);

  if (!context) {
    throw new Error("useMonitorContext must be used within a MonitorProvider");
  }
  return context;
}
