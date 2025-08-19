import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DetailedChat, DetailedSchedule, useWhatsappContext } from "../whatsapp-context";
import useInternalChatContext, { DetailedInternalChat } from "../internal-context";
import { AuthContext } from "@/app/auth-context";

interface MonitorContextProps {
  chats: (DetailedInternalChat | DetailedChat | DetailedSchedule)[];
  filters: MonitorFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<MonitorFiltersState>>;
  resetFilters: () => void;
}

interface MonitorProviderProps {
  children: React.ReactNode;
}

interface MonitorFiltersState {
  searchText: string;
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
  searchText: "",
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
  const {
    monitorChats: wppChats,
    getChatsMonitor,
    getMonitorSchedules,
    monitorSchedules,
  } = useWhatsappContext();
  const { monitorInternalChats: intChats, getInternalChatsMonitor } = useInternalChatContext();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    if (token) {
      getMonitorSchedules();
      getChatsMonitor();
      getInternalChatsMonitor();
    }
  }, [getChatsMonitor, getInternalChatsMonitor, getMonitorSchedules, token]);

  const [filters, setFilters] = useState<MonitorFiltersState>(initialFilters);
  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const filteredChats = useMemo(() => {
    const normalize = (s?: string | null) =>
      (s ?? "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const search = normalize(filters.searchText);

    const matchesSearch = (values: Array<string | null | undefined>) => {
      if (!search) return true;
      const haystack = normalize(values.filter(Boolean).join(" "));
      return haystack.includes(search);
    };

    const filteredIntChats = intChats.filter((chat) => {
      let falseCount = 0;

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

      // Busca por nome (grupo/participantes) e última mensagem
      const anyChat = chat as any;
      const nameCandidates: Array<string | null | undefined> = [
        anyChat?.name,
        anyChat?.title,
        anyChat?.groupName,
      ];
      if (Array.isArray(anyChat?.participants)) {
        for (const p of anyChat.participants) {
          nameCandidates.push(p?.name, p?.userName, p?.NOME);
        }
      }
      const lastMessageCandidates: Array<string | null | undefined> = [
        anyChat?.lastMessageBody,
        anyChat?.lastMessage?.body,
        anyChat?.lastMessageText,
        anyChat?.lastMsg?.body,
        // fallback comum: primeiro/último item de um array de mensagens
        anyChat?.messages?.[anyChat?.messages?.length - 1]?.body,
        anyChat?.messages?.[0]?.body,
      ];
      if (!matchesSearch([...nameCandidates, ...lastMessageCandidates])) return false;

      return true;
    });

    const filteredWppChats = wppChats.filter((chat) => {
      if (!filters.categories.showCustomerChats) return false;
      if (filters.user !== "all" && chat.userId !== filters.user) return false;
      if (!filters.showBots && chat.botId !== null) return false;
      if (filters.showOnlyScheduled && !chat.isSchedule) return false;
      if (
        filters.scheduledFor !== "all" &&
        "schedule" in chat &&
        chat.schedule?.scheduledFor !== filters.scheduledFor
      ) {
        return false;
      }

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

      if (
        filters.scheduledAt.from &&
        chat.schedule?.scheduledAt &&
        new Date(chat.schedule.scheduledAt) < new Date(filters.scheduledAt.from)
      ) {
        return false;
      }
      if (
        filters.scheduledAt.to &&
        chat.schedule?.scheduledAt &&
        new Date(chat.schedule.scheduledAt) > new Date(filters.scheduledAt.to)
      ) {
        return false;
      }

      if (
        filters.scheduledTo.from &&
        chat.schedule?.scheduleDate &&
        new Date(chat.schedule.scheduleDate) < new Date(filters.scheduledTo.from)
      ) {
        return false;
      }

      if (
        filters.scheduledTo.to &&
        chat.schedule?.scheduleDate &&
        new Date(chat.schedule.scheduleDate) > new Date(filters.scheduledTo.to)
      ) {
        return false;
      }

      // Busca por nome (contato/cliente) e última mensagem
      const anyChat = chat as any;
      const nameCandidates: Array<string | null | undefined> = [
        anyChat?.contact?.name,
        anyChat?.contact?.phone,
        anyChat?.customer?.RAZAO,
        anyChat?.customer?.FANTASIA,
      ];
      const lastMessageCandidates: Array<string | null | undefined> = [
        anyChat?.lastMessageBody,
        anyChat?.lastMessage?.body,
        anyChat?.lastMessageText,
        anyChat?.lastMsg?.body,
        anyChat?.messages?.[anyChat?.messages?.length - 1]?.body,
        anyChat?.messages?.[0]?.body,
      ];
      if (!matchesSearch([...nameCandidates, ...lastMessageCandidates])) return false;

      return true;
    });

    const filteredSchedules = monitorSchedules.filter((schedule) => {
      if (!filters.categories.showSchedules) return false;
      if (filters.scheduledBy !== "all" && schedule.scheduledBy !== filters.scheduledBy)
        return false;
      if (filters.scheduledFor !== "all" && schedule.scheduledFor !== filters.scheduledFor)
        return false;

      if (
        filters.scheduledAt.from &&
        new Date(schedule.scheduledAt) < new Date(filters.scheduledAt.from)
      ) {
        return false;
      }
      if (
        filters.scheduledAt.to &&
        new Date(schedule.scheduledAt) > new Date(filters.scheduledAt.to)
      ) {
        return false;
      }
      return true;
    });

    const sortedAllChats = [...filteredIntChats, ...filteredWppChats, ...filteredSchedules].sort(
      (a, b) => {
        // Use startedAt if available, otherwise fallback to scheduledAt for WppSchedule
        const getSortDate = (item: DetailedInternalChat | DetailedChat | DetailedSchedule) => {
          if ("startedAt" in item && item.startedAt) {
            return new Date(item.startedAt);
          }
          if ("scheduledAt" in item && item.scheduledAt) {
            return new Date(item.scheduledAt);
          }
          return new Date(0);
        };
        const aDate = getSortDate(a);
        const bDate = getSortDate(b);
        return bDate.getTime() - aDate.getTime();
      },
    );

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
