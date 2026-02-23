"use client";

import { AuthContext } from "@/app/auth-context";
import { WPP_BASE_URL } from "@/app/(private)/[instance]/whatsapp-context";
import axios from "axios";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";

export type ChartType = "bar" | "pie" | "line";
export type ReportKey =
  | "contactsAwaitingReturn"
  | "messagesPerUser"
  | "messagesPerContact"
  | "messagesPerHourDay"
  | "satisfactionSurvey";

const REPORTS_URL = process.env["NEXT_PUBLIC_REPORTS_URL"] || "http://localhost:8006";

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  userId: string;
  sectors: string;
  operators: string;
  minDate: string;
  maxDate: string;
}

export interface AwaitingReturnRow {
  CODIGO_ATENDIMENTO: number;
  CONTATO: string;
  CLIENTE: string | null;
  OPERADOR: string | null;
  SETOR: string | null;
  DATA_MENSAGEM_CLIENTE: string | null;
}

export interface MessagesPerUserRow {
  userId: number;
  userName: string;
  userActive: string | number | null;
  userType: string | number | null;
  userSector: string | null;
  attendancesCount: number;
  messagesCount: number;
  sentMessagesCount: number;
  receivedMessagesCount: number;
  contactsCount: number;
}

export interface MessagesPerContactRow {
  contactId: number;
  contactName: string;
  customerId: number | null;
  customerName?: string | null;
  customerCnpj?: string | null;
  customerSector?: string | null;
  messagesCount: number;
  sentMessagesCount: number;
  receivedMessagesCount: number;
  attendancesCount: number;
}

export interface MessagesPerHourDayRow {
  sector: string | null;
  hour: number;
  weekDay: number;
  messagesCount: number;
  sentMessagesCount: number;
  receivedMessagesCount: number;
}

export interface SatisfactionSurveyAnalyticalRow {
  chatId: number;
  operatorId: number | null;
  operatorName: string | null;
  contactId: number | null;
  contactName: string | null;
  contactPhone: string | null;
  customerId: number | null;
  customerName: string | null;
  customerCnpj: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  answers: Record<
    "q1" | "q2" | "q3" | "q4",
    { question: string; rating: number | null; answerText: string | null }
  >;
}

export interface SatisfactionSurveySyntheticRow {
  questionKey: "q1" | "q2" | "q3" | "q4";
  questionLabel: string;
  averageScore: number | null;
  totalAnswers: number;
  distribution: Array<{ score: number; count: number }>;
}

interface DashboardContextType {
  filters: DashboardFilters;
  setFilters: (filters: DashboardFilters) => void;
  loading: boolean;
  selectedReport: ReportKey;
  setSelectedReport: (report: ReportKey) => void;
  chartTypes: Record<ReportKey, ChartType>;
  setChartType: (key: ReportKey, type: ChartType) => void;
  contactsAwaitingReturn: AwaitingReturnRow[];
  messagesPerUser: MessagesPerUserRow[];
  messagesPerContact: MessagesPerContactRow[];
  messagesPerHourDay: MessagesPerHourDayRow[];
  satisfactionSurveyAnalytical: SatisfactionSurveyAnalyticalRow[];
  satisfactionSurveySynthetic: SatisfactionSurveySyntheticRow[];
  loadReport: (report?: ReportKey) => Promise<void>;
}

const defaultChartTypes: Record<ReportKey, ChartType> = {
  contactsAwaitingReturn: "pie",
  messagesPerUser: "bar",
  messagesPerContact: "bar",
  messagesPerHourDay: "line",
  satisfactionSurvey: "bar",
};

const defaultFilters: DashboardFilters = {
  startDate: "",
  endDate: "",
  userId: "",
  sectors: "*",
  operators: "*",
  minDate: "",
  maxDate: "",
};

export const DashboardContext = createContext({} as DashboardContextType);

export default function DashboardProvider({
  children,
  initialSelectedReport,
}: {
  children: ReactNode;
  initialSelectedReport?: ReportKey;
}) {
  const { token } = useContext(AuthContext);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [chartTypes, setChartTypes] = useState<Record<ReportKey, ChartType>>(defaultChartTypes);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportKey>(initialSelectedReport || "messagesPerUser");

  const [contactsAwaitingReturn, setContactsAwaitingReturn] = useState<AwaitingReturnRow[]>([]);
  const [messagesPerUser, setMessagesPerUser] = useState<MessagesPerUserRow[]>([]);
  const [messagesPerContact, setMessagesPerContact] = useState<MessagesPerContactRow[]>([]);
  const [messagesPerHourDay, setMessagesPerHourDay] = useState<MessagesPerHourDayRow[]>([]);
  const [satisfactionSurveyAnalytical, setSatisfactionSurveyAnalytical] = useState<SatisfactionSurveyAnalyticalRow[]>(
    [],
  );
  const [satisfactionSurveySynthetic, setSatisfactionSurveySynthetic] = useState<SatisfactionSurveySyntheticRow[]>([]);

  const setChartType = useCallback((key: ReportKey, type: ChartType) => {
    setChartTypes((prev) => ({ ...prev, [key]: type }));
  }, []);

  const headers = useMemo(() => {
    if (!token) return undefined;
    return { authorization: `Bearer ${token}` };
  }, [token]);

  const loadReport = useCallback(
    async (report?: ReportKey) => {
    setLoading(true);
    try {
      const dateFilter =
        filters.startDate && filters.endDate
          ? `${filters.startDate}_${filters.endDate}`
          : null;
      const target = report || selectedReport;

      if (target === "messagesPerUser") {
        const res = await axios.get(`${WPP_BASE_URL}/api/whatsapp/dashboard/messages-per-user`, {
          headers,
          params: dateFilter ? { date: dateFilter } : undefined,
        });
        setMessagesPerUser(res.data?.data?.messagesPerUser || []);
      }

      if (target === "messagesPerContact") {
        const res = await axios.get(`${WPP_BASE_URL}/api/whatsapp/dashboard/messages-per-contact`, {
          headers,
          params: {
            ...(dateFilter ? { date: dateFilter } : {}),
            ...(filters.userId ? { user: filters.userId } : {}),
          },
        });
        setMessagesPerContact(res.data?.data?.messagesPerContact || []);
      }

      if (target === "messagesPerHourDay") {
        const res = await axios.get(`${WPP_BASE_URL}/api/whatsapp/dashboard/messages-per-hour-day`, {
          headers,
          params: {
            SETORES: filters.sectors || "*",
            OPERADORES: filters.operators || "*",
            ...(filters.minDate ? { MIN_DATE: filters.minDate } : {}),
            ...(filters.maxDate ? { MAX_DATE: filters.maxDate } : {}),
          },
        });
        setMessagesPerHourDay(res.data?.data?.messagesPerHourDay || []);
      }

      if (target === "contactsAwaitingReturn") {
        const res = await axios.get(
          `${WPP_BASE_URL}/api/whatsapp/dashboard/contacts-awaiting-return`,
          {
            headers,
          },
        );
        setContactsAwaitingReturn(res.data?.data || []);
      }

      if (target === "satisfactionSurvey") {
        const res = await axios.get(`${REPORTS_URL}/api/reports/satisfaction-survey`, {
          headers,
          params: {
            ...(filters.startDate ? { startDate: filters.startDate } : {}),
            ...(filters.endDate ? { endDate: filters.endDate } : {}),
            ...(filters.operators && filters.operators !== "*" ? { operators: filters.operators } : {}),
          },
        });

        setSatisfactionSurveyAnalytical(res.data?.data?.analytical || []);
        setSatisfactionSurveySynthetic(res.data?.data?.synthetic || []);
      }
    } catch (err) {
      toast.error("Falha ao carregar relatórios!\n" + sanitizeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters, headers, selectedReport]);

  useEffect(() => {
    if (initialSelectedReport) {
      setSelectedReport(initialSelectedReport);
    }
  }, [initialSelectedReport]);

  useEffect(() => {
    if (token) {
      loadReport(selectedReport);
    }
  }, [token, loadReport, selectedReport]);

  return (
    <DashboardContext.Provider
      value={{
        filters,
        setFilters,
        loading,
        selectedReport,
        setSelectedReport,
        chartTypes,
        setChartType,
        contactsAwaitingReturn,
        messagesPerUser,
        messagesPerContact,
        messagesPerHourDay,
        satisfactionSurveyAnalytical,
        satisfactionSurveySynthetic,
        loadReport,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
