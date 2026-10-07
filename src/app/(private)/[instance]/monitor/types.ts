import type { DetailedInternalChat } from "../internal-context";
import type { DetailedChat, DetailedSchedule } from "../whatsapp-context";

export type MonitorOperationalStatus =
  | "all"
  | "in_progress"
  | "waiting_agent"
  | "waiting_customer"
  | "unread"
  | "overdue"
  | "scheduled";

export interface MonitorOperational {
  status: "in_progress" | "waiting_agent" | "waiting_customer" | "finished" | "scheduled";
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  waitingSince: string | null;
  unreadCount: number | null;
  channel: string | null;
  deliveryStatus: string | null;
  slaBreached: boolean | null;
}

export type MonitorItem = (DetailedChat | DetailedInternalChat | DetailedSchedule) & {
  operational: MonitorOperational;
};

export interface MonitorSummary {
  inProgress: number;
  waitingAgent: number;
  waitingCustomer: number;
  unread: number;
  overdue: number;
  scheduled: number;
  slaMinutes: number | null;
}

type DateRange = { from: string | null; to: string | null };

export interface MonitorFiltersState {
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
  operationalStatus: MonitorOperationalStatus;
  sortBy: "urgency" | "startedAt" | "finishedAt" | "lastMessage" | "name" | "scheduledAt";
  sortOrder: "asc" | "desc";
  startedAt: DateRange;
  finishedAt: DateRange;
  scheduledAt: DateRange;
  scheduledTo: DateRange;
  scheduledBy: number | "all";
  scheduledFor: number | "all";
}

export interface MonitorSearchResult {
  items: MonitorItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface MonitorPreferences {
  filters: MonitorFiltersState;
  pageSize: number;
  autoRefresh: boolean;
  viewMode: "cards" | "compact";
}
