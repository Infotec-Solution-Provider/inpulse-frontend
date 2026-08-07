"use client";

import { AuthContext } from "@/app/auth-context";
import useInternalChatContext from "@/app/(private)/[instance]/internal-context";
import { useWhatsappContext, WPP_BASE_URL } from "@/app/(private)/[instance]/whatsapp-context";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import {
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip as MuiTooltip,
} from "@mui/material";
import axios from "axios";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

const ALL_OPTION_VALUE = "__ALL__";
const POLLING_INTERVAL_MS = 60000;

interface OperatorDashboardFilters {
  startDate: string;
  endDate: string;
  sectors: string;
  operators: string;
}

interface OperatorPerformanceSummary {
  periodStart: string | null;
  periodEnd: string | null;
  operatorsCount: number;
  onlineOperatorsCount: number;
  offlineOperatorsCount: number;
  telephonyPausedOperatorsCount: number;
  currentOpenChatsCount: number;
  crmStatusSource: "mocked";
  crmUpcomingSchedulesCount: number;
  ordersCount: number;
  callsCount: number;
  contactsResultCount: number;
  messagesCount: number;
  sentMessagesCount: number;
  receivedMessagesCount: number;
  contactsCount: number;
  chatsHandledCount: number;
  chatsFinishedCount: number;
  pendingReturnsCount: number;
  transfersSentCount: number;
  transfersReceivedCount: number;
  averageFirstResponseSeconds: number | null;
  averageHandlingSeconds: number | null;
}

interface OperatorPerformanceRow {
  userId: number;
  userName: string;
  userActive: string | number | null;
  userType: string | number | null;
  userSector: string | null;
  isWhatsappOnline: boolean;
  whatsappStatus: "online" | "offline";
  telephonyStatus: "offline" | "available" | "paused";
  telephonyStatusCode: string | null;
  telephonyStatusSince: string | null;
  ordersCount: number;
  callsCount: number;
  contactsResultCount: number;
  crmStatus: "mocked";
  crmStatusLabel: string;
  crmConvertedProposals: number;
  crmUpcomingSchedulesCount: number;
  currentOpenChatsCount: number;
  messagesCount: number;
  sentMessagesCount: number;
  receivedMessagesCount: number;
  contactsCount: number;
  chatsHandledCount: number;
  chatsFinishedCount: number;
  respondedChatsCount: number;
  pendingReturnsCount: number;
  transfersSentCount: number;
  transfersReceivedCount: number;
  averageFirstResponseSeconds: number | null;
  averageHandlingSeconds: number | null;
  previousMessagesCount: number;
  previousChatsFinishedCount: number;
  previousPendingReturnsCount: number;
  previousTransfersSentCount: number;
  previousTransfersReceivedCount: number;
  previousAverageFirstResponseSeconds: number | null;
  previousAverageHandlingSeconds: number | null;
}

interface OperatorAgendaItem {
  id: string;
  scheduleId: number;
  scheduleAt: string;
  contactName: string | null;
  contactPhone: string | null;
  telephonyCampaignName: string | null;
  description: string | null;
}

interface OperatorPerformanceDailySeriesRow {
  date: string;
  label: string;
  previousDate: string | null;
  messagesCount: number;
  chatsFinishedCount: number;
  pendingReturnsCount: number;
  transfersSentCount: number;
  transfersReceivedCount: number;
  averageFirstResponseSeconds: number | null;
  averageHandlingSeconds: number | null;
  previousMessagesCount: number;
  previousChatsFinishedCount: number;
  previousPendingReturnsCount: number;
  previousTransfersSentCount: number;
  previousTransfersReceivedCount: number;
  previousAverageFirstResponseSeconds: number | null;
  previousAverageHandlingSeconds: number | null;
}

interface OperatorPerformanceDetailsResult {
  operatorId: number;
  firstResponses: Array<{
    chatId: number;
    contactId: number | null;
    contactName: string | null;
    contactPhone: string | null;
    firstCustomerMessageAt: string | null;
    firstCustomerMessageBody: string | null;
    firstResponseAt: string | null;
    firstResponseBody: string | null;
    firstResponseSeconds: number;
  }>;
  pendingReturns: Array<{
    chatId: number;
    contactId: number | null;
    contactName: string | null;
    contactPhone: string | null;
    startedAt: string | null;
    lastCustomerMessageAt: string | null;
    lastCustomerMessageBody: string | null;
    waitingSeconds: number;
  }>;
}

interface OperatorDashboardData {
  summary: OperatorPerformanceSummary;
  previousSummary: OperatorPerformanceSummary | null;
  comparisonEnabled: boolean;
  operatorPerformance: OperatorPerformanceRow[];
  dailySeries: OperatorPerformanceDailySeriesRow[];
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDefaultFilters(): OperatorDashboardFilters {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
    sectors: "*",
    operators: "*",
  };
}

function parseIds(value: string): string[] {
  if (!value || value === "*") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMultiSelectValue(value: string | string[]): string[] {
  return Array.isArray(value) ? value : value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return "-";
  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
  }

  return `${remainingSeconds}s`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "amber" | "red" | "slate";
}) {
  const tones = {
    green:
      "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
    amber:
      "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
    red: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
    slate:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/30",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${tones[tone]}`}>
      {label}
    </span>
  );
}

function CompactStat({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip?: string;
}) {
  const content = (
    <div className="inline-flex min-w-[120px] items-center justify-between gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
      <span className="truncate uppercase tracking-[0.12em]">{label}</span>
      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );

  if (!tooltip) return content;
  return (
    <MuiTooltip title={tooltip} arrow>
      {content}
    </MuiTooltip>
  );
}

type ColumnAlign = "left" | "right";

interface ColumnDef {
  id: string;
  label: string;
  tooltip: string;
  align?: ColumnAlign;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: OperatorPerformanceRow, ctx: { nowTick: number }) => React.ReactNode;
}

const TELEPHONY_STATUS_TEXT: Record<string, { label: string; tone: "green" | "amber" | "red" | "slate" }> = {
  D: { label: "Disponível", tone: "green" },
  P: { label: "Em pausa", tone: "amber" },
  L: { label: "Em ligação", tone: "amber" },
  F: { label: "Offline", tone: "red" },
  O: { label: "Offline", tone: "red" },
};

function formatStatusDuration(sinceIso: string | null, nowTick: number) {
  if (!sinceIso) return "-";
  const since = new Date(sinceIso).getTime();
  if (!Number.isFinite(since)) return "-";
  const totalSeconds = Math.max(0, Math.floor((nowTick - since) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function resolveTelephonyDisplay(row: OperatorPerformanceRow) {
  if (row.telephonyStatusCode && TELEPHONY_STATUS_TEXT[row.telephonyStatusCode.toUpperCase()]) {
    return TELEPHONY_STATUS_TEXT[row.telephonyStatusCode.toUpperCase()];
  }
  if (row.telephonyStatus === "paused") return { label: "Em pausa", tone: "amber" as const };
  if (row.telephonyStatus === "available") return { label: "Disponível", tone: "green" as const };
  return { label: "Offline", tone: "red" as const };
}

const OPERATOR_COLUMNS: ColumnDef[] = [
  {
    id: "operator",
    label: "Operador",
    tooltip: "Nome e ID do operador. Usado como chave primária na tabela.",
    render: (row) => (
      <>
        <div className="font-medium text-slate-900 dark:text-slate-100">{row.userName}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">#{row.userId}</div>
      </>
    ),
  },
  {
    id: "sector",
    label: "Setor",
    tooltip: "Setor cadastrado do operador no CRM.",
    render: (row) => row.userSector || "-",
  },
  {
    id: "whatsapp",
    label: "Online",
    tooltip: "Indica se o operador possui sessão WhatsApp ativa no momento.",
    render: (row) => (
      <StatusBadge
        label={row.whatsappStatus === "online" ? "Online" : "Offline"}
        tone={row.whatsappStatus === "online" ? "green" : "red"}
      />
    ),
  },
  {
    id: "telephony",
    label: "Telefonia",
    tooltip:
      "Status atual do operador na telefonia (operadores_status). Mostra o tempo decorrido desde a última mudança.",
    render: (row, { nowTick }) => {
      const display = resolveTelephonyDisplay(row);
      const duration = formatStatusDuration(row.telephonyStatusSince, nowTick);
      return (
        <div className="flex flex-col gap-0.5">
          <StatusBadge label={display.label} tone={display.tone} />
          <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{duration}</span>
        </div>
      );
    },
  },
  {
    id: "openChats",
    label: "Conversas",
    tooltip: "Chats WhatsApp abertos atualmente atribuídos ao operador.",
    align: "right",
    cellClassName: "font-semibold",
    render: (row) => row.currentOpenChatsCount,
  },
  {
    id: "schedules",
    label: "Agendamentos",
    tooltip: "Agendamentos futuros do CRM (campanhas_clientes) ainda não concluídos.",
    align: "right",
    render: (row) => row.crmUpcomingSchedulesCount,
  },
  {
    id: "pending",
    label: "Em espera (Whats)",
    tooltip: "Conversas WhatsApp abertas aguardando resposta do operador.",
    align: "right",
    render: (row) => row.pendingReturnsCount,
  },
  {
    id: "messages",
    label: "Mensagens",
    tooltip: "Total de mensagens trocadas pelo operador no período (enviadas + recebidas).",
    align: "right",
    render: (row) => row.messagesCount,
  },
  {
    id: "finished",
    label: "Atendimentos finalizados",
    tooltip: "Atendimentos encerrados pelo operador no período (historico_cli).",
    align: "right",
    render: (row) => row.chatsFinishedCount,
  },
  {
    id: "proposals",
    label: "Propostas enviadas",
    tooltip: "Propostas convertidas em compras pelo operador no período.",
    align: "right",
    render: (row) => row.crmConvertedProposals,
  },
  {
    id: "orders",
    label: "Pedidos",
    tooltip: "Pedidos cadastrados pelo operador no período (compras com TIPO = 'PD').",
    align: "right",
    render: (row) => row.ordersCount,
  },
  {
    id: "calls",
    label: "Ligações",
    tooltip: "Agendamentos com telefone ligado no período (campanhas_clientes com TELEFONE_LIGADO preenchido).",
    align: "right",
    render: (row) => row.callsCount,
  },
  {
    id: "contacts",
    label: "Contatos",
    tooltip: "Atendimentos do operador no período cujo resultado teve ECONTATO = 'SIM' (historico_cli).",
    align: "right",
    render: (row) => row.contactsResultCount,
  },
  {
    id: "firstResponse",
    label: "1ª resposta",
    tooltip: "Tempo médio entre a primeira mensagem do cliente e a primeira resposta do operador.",
    render: (row) => formatDuration(row.averageFirstResponseSeconds),
  },
  {
    id: "handling",
    label: "Atendimento",
    tooltip: "Tempo médio de atendimento entre início e fim no período.",
    render: (row) => formatDuration(row.averageHandlingSeconds),
  },
  {
    id: "transfers",
    label: "Transferências",
    tooltip: "Soma de transferências enviadas e recebidas pelo operador no período.",
    align: "right",
    render: (row) => row.transfersSentCount + row.transfersReceivedCount,
  },
];

const LAYOUT_PRESETS: Array<{ id: "default" | "whatsapp" | "telephony"; label: string; columns: string[] }> = [
  {
    id: "default",
    label: "Padrão",
    columns: OPERATOR_COLUMNS.map((column) => column.id),
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    columns: [
      "operator",
      "sector",
      "whatsapp",
      "openChats",
      "pending",
      "messages",
      "finished",
      "firstResponse",
      "handling",
      "transfers",
    ],
  },
  {
    id: "telephony",
    label: "Telefonia",
    columns: [
      "operator",
      "sector",
      "telephony",
      "schedules",
      "proposals",
      "orders",
      "calls",
      "contacts",
    ],
  },
];

const COLUMN_VISIBILITY_STORAGE_KEY = "operators-dashboard:column-visibility:v1";
const LAYOUT_STORAGE_KEY = "operators-dashboard:active-layout:v1";

type LayoutId = "default" | "whatsapp" | "telephony" | "custom";

function loadStoredVisibility(): Record<string, boolean> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, boolean>;
  } catch {
    return null;
  }
  return null;
}

function loadStoredLayout(): LayoutId {
  if (typeof window === "undefined") return "default";
  const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (raw === "default" || raw === "whatsapp" || raw === "telephony" || raw === "custom") return raw;
  return "default";
}

function buildVisibilityForLayout(layoutId: LayoutId, storedCustom: Record<string, boolean> | null) {
  if (layoutId === "custom" && storedCustom) {
    const visibility: Record<string, boolean> = {};
    for (const column of OPERATOR_COLUMNS) {
      visibility[column.id] = storedCustom[column.id] ?? false;
    }
    return visibility;
  }

  const preset = LAYOUT_PRESETS.find((item) => item.id === layoutId) || LAYOUT_PRESETS[0];
  const visibleIds = new Set(preset.columns);
  const visibility: Record<string, boolean> = {};
  for (const column of OPERATOR_COLUMNS) {
    visibility[column.id] = visibleIds.has(column.id);
  }
  return visibility;
}

export default function OperatorsDashboard() {
  const { token } = useContext(AuthContext);
  const { users } = useInternalChatContext();
  const { sectors } = useWhatsappContext();

  const [draftFilters, setDraftFilters] = useState<OperatorDashboardFilters>(() => buildDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<OperatorDashboardFilters>(() => buildDefaultFilters());
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<OperatorPerformanceRow | null>(null);
  const [details, setDetails] = useState<OperatorPerformanceDetailsResult | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [agendaOperator, setAgendaOperator] = useState<OperatorPerformanceRow | null>(null);
  const [agendaItems, setAgendaItems] = useState<OperatorAgendaItem[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);

  const [activeLayout, setActiveLayout] = useState<LayoutId>("default");
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    buildVisibilityForLayout("default", null),
  );
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<HTMLElement | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const storedLayout = loadStoredLayout();
    const storedCustom = loadStoredVisibility();
    setActiveLayout(storedLayout);
    setColumnVisibility(buildVisibilityForLayout(storedLayout, storedCustom));
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const persistCustomVisibility = useCallback((visibility: Record<string, boolean>) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
    } catch {
      // ignore quota errors
    }
  }, []);

  const applyLayout = useCallback(
    (layoutId: LayoutId) => {
      const storedCustom = layoutId === "custom" ? loadStoredVisibility() : null;
      const nextVisibility = buildVisibilityForLayout(layoutId, storedCustom);
      setActiveLayout(layoutId);
      setColumnVisibility(nextVisibility);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, layoutId);
      }
    },
    [],
  );

  const toggleColumnVisibility = useCallback(
    (columnId: string) => {
      setColumnVisibility((prev) => {
        const next = { ...prev, [columnId]: !prev[columnId] };
        persistCustomVisibility(next);
        return next;
      });
      setActiveLayout("custom");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, "custom");
      }
    },
    [persistCustomVisibility],
  );

  const visibleColumns = useMemo(
    () => OPERATOR_COLUMNS.filter((column) => columnVisibility[column.id]),
    [columnVisibility],
  );

  const headers = useMemo(() => {
    if (!token) return undefined;
    return { authorization: `Bearer ${token}` };
  }, [token]);

  const operatorOptions = useMemo(
    () =>
      users
        .filter((user) => Number.isFinite(Number(user.CODIGO)))
        .map((user) => ({
          id: String(user.CODIGO),
          name: user.NOME || user.LOGIN || `#${user.CODIGO}`,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [users],
  );

  const sectorOptions = useMemo(
    () =>
      sectors
        .filter((sector) => Number.isFinite(Number(sector.id)))
        .map((sector) => ({
          id: String(sector.id),
          name: sector.name || `#${sector.id}`,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [sectors],
  );

  const visibleOperatorRows = useMemo(
    () => (data?.operatorPerformance || []).filter((row) => row.userId > 0),
    [data],
  );

  const loadDashboard = useCallback(
    async (filters: OperatorDashboardFilters) => {
      if (!headers) return;

      setLoading(true);
      try {
        const response = await axios.get(`${WPP_BASE_URL}/api/whatsapp/dashboard/operator-performance`, {
          headers,
          params: {
            startDate: filters.startDate,
            endDate: filters.endDate,
            SETORES: filters.sectors || "*",
            OPERADORES: filters.operators || "*",
          },
        });

        setData(response.data?.data || null);
      } catch (error) {
        toast.error(`Falha ao carregar dashboard de operadores.\n${sanitizeErrorMessage(error)}`);
      } finally {
        setLoading(false);
      }
    },
    [headers],
  );

  const loadDetails = useCallback(
    async (operatorId: number, filters: OperatorDashboardFilters) => {
      if (!headers) return;

      setDetailsLoading(true);
      try {
        const response = await axios.get(
          `${WPP_BASE_URL}/api/whatsapp/dashboard/operator-performance/${operatorId}/details`,
          {
            headers,
            params: {
              startDate: filters.startDate,
              endDate: filters.endDate,
              SETORES: filters.sectors || "*",
            },
          },
        );

        setDetails(response.data?.data || null);
      } catch (error) {
        toast.error(`Falha ao carregar detalhes do operador.\n${sanitizeErrorMessage(error)}`);
      } finally {
        setDetailsLoading(false);
      }
    },
    [headers],
  );

  const loadAgenda = useCallback(
    async (operatorId: number) => {
      if (!headers) return;

      setAgendaLoading(true);
      try {
        const response = await axios.get(`${WPP_BASE_URL}/api/whatsapp/schedules/unified`, {
          headers,
          params: {
            userId: operatorId,
            channels: "TELEFONIA",
            perPage: "100",
          },
        });

        setAgendaItems(response.data?.data || []);
      } catch (error) {
        toast.error(`Falha ao carregar agendamentos do operador.\n${sanitizeErrorMessage(error)}`);
      } finally {
        setAgendaLoading(false);
      }
    },
    [headers],
  );

  useEffect(() => {
    if (!headers) return;
    void loadDashboard(appliedFilters);
  }, [appliedFilters, headers, loadDashboard]);

  useEffect(() => {
    if (!headers) return;

    const intervalId = window.setInterval(() => {
      void loadDashboard(appliedFilters);
      if (selectedOperator) {
        void loadDetails(selectedOperator.userId, appliedFilters);
      }
      if (agendaOperator) {
        void loadAgenda(agendaOperator.userId);
      }
    }, POLLING_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [agendaOperator, appliedFilters, headers, loadAgenda, loadDashboard, loadDetails, selectedOperator]);

  const selectedOperatorIds = useMemo(() => parseIds(draftFilters.operators), [draftFilters.operators]);
  const selectedSectorIds = useMemo(() => parseIds(draftFilters.sectors), [draftFilters.sectors]);

  const handleOperatorsChange = (ids: string[]) => {
    if (ids.includes(ALL_OPTION_VALUE)) {
      setDraftFilters((prev) => ({ ...prev, operators: "*" }));
      return;
    }

    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    setDraftFilters((prev) => ({
      ...prev,
      operators: uniqueIds.length ? uniqueIds.join(",") : "*",
    }));
  };

  const handleSectorsChange = (ids: string[]) => {
    if (ids.includes(ALL_OPTION_VALUE)) {
      setDraftFilters((prev) => ({ ...prev, sectors: "*" }));
      return;
    }

    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    setDraftFilters((prev) => ({
      ...prev,
      sectors: uniqueIds.length ? uniqueIds.join(",") : "*",
    }));
  };

  const topOperatorsChartData = useMemo(() => {
    return [...visibleOperatorRows]
      .sort((left, right) => {
        if (right.currentOpenChatsCount !== left.currentOpenChatsCount) {
          return right.currentOpenChatsCount - left.currentOpenChatsCount;
        }
        return right.pendingReturnsCount - left.pendingReturnsCount;
      })
      .slice(0, 8)
      .map((row) => ({
        name: row.userName,
        conversas: row.currentOpenChatsCount,
        emEspera: row.pendingReturnsCount,
      }));
  }, [visibleOperatorRows]);

  const dailySeriesData = useMemo(() => {
    return (data?.dailySeries || []).map((row) => ({
      name: row.label,
      mensagens: row.messagesCount,
      atendimentosFinalizados: row.chatsFinishedCount,
      emEspera: row.pendingReturnsCount,
    }));
  }, [data]);

  const openDetails = (row: OperatorPerformanceRow) => {
    if (row.userId <= 0) {
      return;
    }

    setSelectedOperator(row);
    setDetails(null);
    void loadDetails(row.userId, appliedFilters);
  };

  const openAgenda = (row: OperatorPerformanceRow) => {
    if (row.userId <= 0) {
      return;
    }

    setAgendaOperator(row);
    setAgendaItems([]);
    void loadAgenda(row.userId);
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Dashboard de Operadores
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              Supervisão operacional em tempo real com status do WhatsApp, carga atual, tempos médios,
              pendências e transferências por operador.
            </p>
          </div>

          <form
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedFilters(draftFilters);
            }}
          >
            <TextField
              label="Data inicial"
              type="date"
              size="small"
              value={draftFilters.startDate}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, startDate: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Data final"
              type="date"
              size="small"
              value={draftFilters.endDate}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, endDate: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Setores"
              size="small"
              value={selectedSectorIds}
              SelectProps={{
                multiple: true,
                renderValue: (selected) => {
                  const values = selected as string[];
                  if (!values.length) return "Todos";
                  if (values.length === 1) {
                    return sectorOptions.find((option) => option.id === values[0])?.name || values[0];
                  }
                  return `${values.length} setores`;
                },
              }}
              onChange={(event) => handleSectorsChange(normalizeMultiSelectValue(event.target.value))}
            >
              <MenuItem value={ALL_OPTION_VALUE}>Todos</MenuItem>
              {sectorOptions.map((sector) => (
                <MenuItem key={sector.id} value={sector.id}>
                  {sector.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Operadores"
              size="small"
              value={selectedOperatorIds}
              SelectProps={{
                multiple: true,
                renderValue: (selected) => {
                  const values = selected as string[];
                  if (!values.length) return "Todos";
                  if (values.length === 1) {
                    return operatorOptions.find((option) => option.id === values[0])?.name || values[0];
                  }
                  return `${values.length} operadores`;
                },
              }}
              onChange={(event) => handleOperatorsChange(normalizeMultiSelectValue(event.target.value))}
            >
              <MenuItem value={ALL_OPTION_VALUE}>Todos</MenuItem>
              {operatorOptions.map((operator) => (
                <MenuItem key={operator.id} value={operator.id}>
                  {operator.name}
                </MenuItem>
              ))}
            </TextField>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={() => {
                  void loadDashboard(appliedFilters);
                  if (selectedOperator) {
                    void loadDetails(selectedOperator.userId, appliedFilters);
                  }
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Atualizar
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
          Métricas reais por operador combinando WhatsApp, atendimentos finalizados (historico_cli), agendamentos
          (campanhas_clientes), propostas (compras com TIPO &lsquo;PR&rsquo;), pedidos (compras com TIPO &lsquo;PD&rsquo;),
          ligações realizadas e contatos efetivos (ECONTATO &lsquo;SIM&rsquo;).
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          <CompactStat
            label="Online"
            value={String(data?.summary.onlineOperatorsCount || 0)}
            tooltip="Operadores com sessão WhatsApp ativa neste momento."
          />
          <CompactStat
            label="Telefonia em pausa"
            value={String(data?.summary.telephonyPausedOperatorsCount || 0)}
            tooltip="Operadores cujo status atual de telefonia indica pausa."
          />
          <CompactStat
            label="Conversas"
            value={String(data?.summary.currentOpenChatsCount || 0)}
            tooltip="Conversas WhatsApp abertas atribuídas a operadores no momento."
          />
          <CompactStat
            label="Em espera"
            value={String(data?.summary.pendingReturnsCount || 0)}
            tooltip="Conversas WhatsApp aguardando resposta do operador."
          />
          <CompactStat
            label="Atendimentos"
            value={String(data?.summary.chatsFinishedCount || 0)}
            tooltip="Atendimentos encerrados no período selecionado (historico_cli)."
          />
          <CompactStat
            label="1ª resposta"
            value={formatDuration(data?.summary.averageFirstResponseSeconds)}
            tooltip="Tempo médio entre a primeira mensagem do cliente e a primeira resposta do operador."
          />
          <CompactStat
            label="Atendimento"
            value={formatDuration(data?.summary.averageHandlingSeconds)}
            tooltip="Tempo médio de duração dos atendimentos finalizados no período."
          />
          <CompactStat
            label="Agendamentos"
            value={String(data?.summary.crmUpcomingSchedulesCount || 0)}
            tooltip="Agendamentos futuros pendentes nas campanhas do CRM."
          />
          <CompactStat
            label="Pedidos"
            value={String(data?.summary.ordersCount || 0)}
            tooltip="Pedidos cadastrados no período (compras com TIPO = 'PD')."
          />
          <CompactStat
            label="Ligações"
            value={String(data?.summary.callsCount || 0)}
            tooltip="Agendamentos com telefone ligado no período (campanhas_clientes.TELEFONE_LIGADO)."
          />
          <CompactStat
            label="Contatos"
            value={String(data?.summary.contactsResultCount || 0)}
            tooltip="Atendimentos no período com resultado ECONTATO = 'SIM' (historico_cli)."
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Operadores</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Monitoramento em tempo real por operador com foco em status, carga atual, fila e ritmo de resposta.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && <span className="text-xs text-slate-500">Atualizando tabela...</span>}
            <MuiTooltip title="Configurar colunas visíveis e layouts">
              <button
                type="button"
                onClick={(event) => setColumnMenuAnchor(event.currentTarget)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ViewColumnIcon fontSize="small" />
                Colunas
              </button>
            </MuiTooltip>
            <Menu
              anchorEl={columnMenuAnchor}
              open={Boolean(columnMenuAnchor)}
              onClose={() => setColumnMenuAnchor(null)}
              slotProps={{ paper: { sx: { maxHeight: 480 } } }}
            >
              <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Layouts
              </li>
              {LAYOUT_PRESETS.map((preset) => (
                <MenuItem
                  key={preset.id}
                  selected={activeLayout === preset.id}
                  onClick={() => applyLayout(preset.id)}
                >
                  <ListItemText primary={preset.label} />
                </MenuItem>
              ))}
              <MenuItem
                selected={activeLayout === "custom"}
                onClick={() => applyLayout("custom")}
              >
                <ListItemText primary="Personalizado" secondary="Use os toggles abaixo" />
              </MenuItem>
              <Divider />
              <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Colunas
              </li>
              {OPERATOR_COLUMNS.map((column) => (
                <MenuItem
                  key={column.id}
                  onClick={() => toggleColumnVisibility(column.id)}
                  dense
                >
                  <Checkbox
                    edge="start"
                    checked={Boolean(columnVisibility[column.id])}
                    tabIndex={-1}
                    disableRipple
                    size="small"
                  />
                  <ListItemText primary={column.label} secondary={column.tooltip} />
                </MenuItem>
              ))}
            </Menu>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1540px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                {visibleColumns.map((column) => (
                  <th
                    key={column.id}
                    className={`px-3 py-3 ${column.align === "right" ? "text-right" : ""} ${column.headerClassName || ""}`}
                  >
                    <MuiTooltip title={column.tooltip} arrow>
                      <span className="cursor-help">{column.label}</span>
                    </MuiTooltip>
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleOperatorRows.map((row) => (
                <tr key={row.userId} className="border-b border-slate-100 dark:border-slate-800">
                  {visibleColumns.map((column) => (
                    <td
                      key={column.id}
                      className={`px-3 py-3 ${column.align === "right" ? "text-right" : ""} ${column.cellClassName || ""}`}
                    >
                      {column.render(row, { nowTick })}
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <MuiTooltip title="Ver detalhes operacionais">
                        <button
                          type="button"
                          onClick={() => openDetails(row)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <InfoOutlinedIcon fontSize="small" />
                        </button>
                      </MuiTooltip>
                      <MuiTooltip title="Ver agendamentos de telefonia">
                        <button
                          type="button"
                          onClick={() => openAgenda(row)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <EventNoteOutlinedIcon fontSize="small" />
                        </button>
                      </MuiTooltip>
                    </div>
                  </td>
                </tr>
              ))}
              {!visibleOperatorRows.length && (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-3 py-10 text-center text-sm text-slate-500">
                    Nenhum operador encontrado para os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Contexto agregado do período
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Série histórica para dar contexto, sem tirar o foco da operação atual.
              </p>
            </div>
            {loading && <span className="text-xs text-slate-500">Carregando...</span>}
          </div>
          <div className="h-[280px] rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40">
            {dailySeriesData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="mensagens" name="Mensagens" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="atendimentosFinalizados" name="Atendimentos finalizados" stroke="#16a34a" strokeWidth={2} />
                  <Line type="monotone" dataKey="emEspera" name="Em espera" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Sem série diária para o período selecionado.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Fila mais carregada</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Visão dos operadores com maior pressão no momento.
            </p>
          </div>
          <div className="h-[280px] rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40">
            {topOperatorsChartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOperatorsChartData} layout="vertical" margin={{ left: 32, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="conversas" name="Conversas" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="emEspera" name="Em espera" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Sem dados de carga para exibir.
              </div>
            )}
          </div>
        </div>
      </section>

      <Dialog
        open={Boolean(selectedOperator)}
        onClose={() => {
          setSelectedOperator(null);
          setDetails(null);
        }}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          {selectedOperator ? `Detalhes de ${selectedOperator.userName}` : "Detalhes do operador"}
        </DialogTitle>
        <DialogContent>
          <div className="grid gap-6 py-2 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Primeiras respostas
                </h3>
                {detailsLoading && <span className="text-xs text-slate-500">Carregando...</span>}
              </div>
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="px-2 py-2">Contato</th>
                      <th className="px-2 py-2">1ª mensagem do cliente</th>
                      <th className="px-2 py-2">1ª resposta</th>
                      <th className="px-2 py-2">Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(details?.firstResponses || []).map((item) => (
                      <tr key={`fr-${item.chatId}`} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-2">
                          <div className="font-medium text-slate-800 dark:text-slate-100">
                            {item.contactName || `Chat #${item.chatId}`}
                          </div>
                          <div className="text-[11px] text-slate-500">{item.contactPhone || "-"}</div>
                        </td>
                        <td className="px-2 py-2">{formatDateTime(item.firstCustomerMessageAt)}</td>
                        <td className="px-2 py-2">{formatDateTime(item.firstResponseAt)}</td>
                        <td className="px-2 py-2 font-semibold">{formatDuration(item.firstResponseSeconds)}</td>
                      </tr>
                    ))}
                    {!detailsLoading && !details?.firstResponses?.length && (
                      <tr>
                        <td colSpan={4} className="px-2 py-8 text-center text-slate-500">
                          Sem detalhes de primeira resposta para o período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Retornos pendentes
                </h3>
                {detailsLoading && <span className="text-xs text-slate-500">Carregando...</span>}
              </div>
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="px-2 py-2">Contato</th>
                      <th className="px-2 py-2">Última mensagem do cliente</th>
                      <th className="px-2 py-2">Aguardando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(details?.pendingReturns || []).map((item) => (
                      <tr key={`pr-${item.chatId}`} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-2">
                          <div className="font-medium text-slate-800 dark:text-slate-100">
                            {item.contactName || `Chat #${item.chatId}`}
                          </div>
                          <div className="text-[11px] text-slate-500">{item.contactPhone || "-"}</div>
                        </td>
                        <td className="px-2 py-2">{formatDateTime(item.lastCustomerMessageAt)}</td>
                        <td className="px-2 py-2 font-semibold">{formatDuration(item.waitingSeconds)}</td>
                      </tr>
                    ))}
                    {!detailsLoading && !details?.pendingReturns?.length && (
                      <tr>
                        <td colSpan={3} className="px-2 py-8 text-center text-slate-500">
                          Sem retornos pendentes para o operador no filtro atual.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(agendaOperator)}
        onClose={() => {
          setAgendaOperator(null);
          setAgendaItems([]);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {agendaOperator ? `Agendamentos de ${agendaOperator.userName}` : "Agendamentos do operador"}
        </DialogTitle>
        <DialogContent>
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Campanhas e clientes</h3>
              {agendaLoading && <span className="text-xs text-slate-500">Carregando...</span>}
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500">
                    <th className="px-2 py-2">Agendamento</th>
                    <th className="px-2 py-2">Contato</th>
                    <th className="px-2 py-2">Telefone</th>
                    <th className="px-2 py-2">Campanha</th>
                    <th className="px-2 py-2">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {agendaItems.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-2">{formatDateTime(item.scheduleAt)}</td>
                      <td className="px-2 py-2 font-medium text-slate-800 dark:text-slate-100">
                        {item.contactName || `#${item.scheduleId}`}
                      </td>
                      <td className="px-2 py-2">{item.contactPhone || "-"}</td>
                      <td className="px-2 py-2">{item.telephonyCampaignName || "-"}</td>
                      <td className="px-2 py-2">{item.description || "-"}</td>
                    </tr>
                  ))}
                  {!agendaLoading && !agendaItems.length && (
                    <tr>
                      <td colSpan={5} className="px-2 py-8 text-center text-slate-500">
                        Sem agendamentos de telefonia para este operador.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </DialogContent>
      </Dialog>
    </div>
  );
}