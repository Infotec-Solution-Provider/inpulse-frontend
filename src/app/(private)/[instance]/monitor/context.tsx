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

    const onlyDigits = (s?: string | null) => (s ?? "").toString().replace(/\D/g, "");

    const search = normalize(filters.searchText);

    const matchesSearch = (values: Array<string | null | undefined>) => {
      if (!search) return true;
      const joined = values.filter(Boolean).map(String);
      const haystack = normalize(joined.join(" "));
      if (haystack.includes(search)) return true;

      // Phone number support: match digits-only
      const searchDigits = onlyDigits(filters.searchText);
      if (searchDigits.length >= 3) {
        const hayDigits = onlyDigits(joined.join(""));
        if (hayDigits.includes(searchDigits)) return true;
      }
      return false;
    };

    const filteredIntChats = intChats.filter((chat) => {
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
        anyChat?.customer?.COD_ERP,
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
      // Busca por cliente (COD_ERP e nomes) quando disponível
      const anySched = schedule as any;
      const scheduleCandidates: Array<string | null | undefined> = [
        anySched?.customer?.RAZAO,
        anySched?.customer?.FANTASIA,
        anySched?.customer?.COD_ERP,
      ];
      if (!matchesSearch(scheduleCandidates)) return false;
      return true;
    });

    const sortedAllChats = [...filteredIntChats, ...filteredWppChats, ...filteredSchedules].sort(
      (a, b) => {
        const getLastMessageTs = (item: DetailedInternalChat | DetailedChat): number => {
          const anyItem = item as any;
          const ts = anyItem?.lastMessage?.timestamp ?? anyItem?.lastMsg?.timestamp;
          return ts ? Number(ts) : 0;
        };
        const getDateValue = (
          item: DetailedInternalChat | DetailedChat | DetailedSchedule,
          key: "startedAt" | "finishedAt" | "scheduledAt" | "lastMessage",
        ): number => {
          if (key === "lastMessage") {
            if ("chatType" in item) return getLastMessageTs(item as any);
            return 0;
          }
          const v: any = (item as any)[key];
          if (!v) return 0;
          const n = Number(v);
          if (Number.isFinite(n)) return n;
          const d = new Date(v);
          return Number.isFinite(d.getTime()) ? d.getTime() : 0;
        };
        const getNameValue = (item: DetailedInternalChat | DetailedChat | DetailedSchedule): string => {
          const anyItem = item as any;
          if ("chatType" in item) {
            if (item.chatType === "wpp") {
              return (
                anyItem?.contact?.name ||
                anyItem?.customer?.RAZAO ||
                anyItem?.customer?.FANTASIA ||
                ""
              )
                .toString()
                .toLowerCase();
            }
            // internal chat
            return (
              anyItem?.groupName ||
              anyItem?.title ||
              anyItem?.users?.[0]?.NOME ||
              ""
            )
              .toString()
              .toLowerCase();
          }
          // schedule: try contact/customer names if present (depends on data shape)
          return (anyItem?.contactName || anyItem?.customerName || "").toString().toLowerCase();
        };

        const order = filters.sortOrder === "asc" ? 1 : -1;
        const key = filters.sortBy;
        if (key === "name") {
          const an = getNameValue(a);
          const bn = getNameValue(b);
          if (an < bn) return -1 * order;
          if (an > bn) return 1 * order;
          // tie-breaker: last message desc then startedAt desc
          const alt = getDateValue(a as any, "lastMessage");
          const blt = getDateValue(b as any, "lastMessage");
          if (alt !== blt) return blt - alt;
          const asd = getDateValue(a as any, "startedAt");
          const bsd = getDateValue(b as any, "startedAt");
          return bsd - asd;
        }

        const av = getDateValue(a as any, key as any);
        const bv = getDateValue(b as any, key as any);
        if (av < bv) return -1 * order;
        if (av > bv) return 1 * order;
        // tie-breaker: last message desc then name asc
        const alt = getDateValue(a as any, "lastMessage");
        const blt = getDateValue(b as any, "lastMessage");
        if (alt !== blt) return blt - alt;
        const an = getNameValue(a);
        const bn = getNameValue(b);
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
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
