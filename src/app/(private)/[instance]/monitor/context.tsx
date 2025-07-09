import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DetailedChat, useWhatsappContext } from "../whatsapp-context";
import useInternalChatContext, { DetailedInternalChat } from "../internal-context";
import { AuthContext } from "@/app/auth-context";

interface MonitorContextProps {
  chats: (DetailedInternalChat | DetailedChat)[];
  filters: MonitorFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<MonitorFiltersState>>;
  resetFilters: () => void;
}

interface MonitorProviderProps {
  children: React.ReactNode;
}

interface MonitorFiltersState {
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

export const MonitorContext = createContext<MonitorContextProps>({} as MonitorContextProps);

export function MonitorProvider({ children }: MonitorProviderProps) {
  const { monitorChats: wppChats, getChatsMonitor } = useWhatsappContext();
  const { monitorInternalChats: intChats, getInternalChatsMonitor } = useInternalChatContext();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    if(token) {
      getChatsMonitor();
      getInternalChatsMonitor();
    }
  }, [getChatsMonitor, getInternalChatsMonitor, token]);

  const [filters, setFilters] = useState<MonitorFiltersState>(initialFilters);
  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const filteredChats = useMemo(() => {
    const filteredIntChats = intChats.filter((chat) => {
      const falseCount = 0;

      if (chat.isGroup && !filters.categories.showInternalGroups) return false;
      if (!chat.isGroup && !filters.categories.showInternalChats) return false;
      if (filters.user !== "all" && !chat.participants.some((p) => p.userId === filters.user)) {
        return false;
      }
      if (filters.showOnlyScheduled) {
        return false;
      }

      const chatStartedAt = new Date(chat.startedAt);
      if (filters.startedAt.from && chatStartedAt < new Date(filters.startedAt.from)) {
        return false;
      }
      if (filters.startedAt.to && chatStartedAt > new Date(filters.startedAt.to)) {
        return false;
      }

      return falseCount === 0;
    });

    const filteredWppChats = wppChats.filter((chat) => {
      if (!filters.categories.showCustomerChats) return false;
      if (filters.user !== "all" && chat.userId !== filters.user) return false;
      if (!filters.showBots && chat.botId !== null) return false;
      if (filters.showOnlyScheduled && !chat.isSchedule) return false;

      const isOngoing = chat.finishedAt === null && chat.startedAt !== null;
      const isFinished = chat.finishedAt !== null;

      if (!filters.showOngoing && !filters.showFinished) return false;
      if (filters.showOngoing && !filters.showFinished && !isOngoing) return false;
      if (!filters.showOngoing && filters.showFinished && !isFinished) return false;

      if (filters.startedAt.from && new Date(chat.startedAt) < new Date(filters.startedAt.from)) {
        return false;
      }
      if (filters.startedAt.to && new Date(chat.startedAt) > new Date(filters.startedAt.to)) {
        return false;
      }
      if (
        filters.finishedAt.from &&
        chat.finishedAt &&
        new Date(chat.finishedAt) < new Date(filters.finishedAt.from)
      ) {
        return false;
      }
      if (
        filters.finishedAt.to &&
        chat.finishedAt &&
        new Date(chat.finishedAt) > new Date(filters.finishedAt.to)
      ) {
        return false;
      }

      return true;
    });

    const sortedAllChats = [...filteredIntChats, ...filteredWppChats].sort((a, b) => {
      const aStartedAt = new Date(a.startedAt);
      const bStartedAt = new Date(b.startedAt);
      return aStartedAt.getTime() - bStartedAt.getTime();
    });

    return sortedAllChats;
  }, [wppChats, intChats, filters]);

  return (
    <MonitorContext.Provider
      value={{
        chats: filteredChats,
        filters,
        setFilters,
        resetFilters,
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
