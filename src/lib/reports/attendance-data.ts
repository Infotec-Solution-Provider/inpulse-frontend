import axios from "axios";
import type { EntityOption } from "@/components/reports/SearchableEntityFilter";
import type {
  ReportChartPoint,
  ReportChartType,
  ResultColumn,
  ResultRow,
} from "@/components/reports/ReportResults";
import type { ReportPeriod } from "@/lib/reports/filters";
import type { AttendanceReportId } from "./attendance-routes";

interface ContactMessages {
  contactId: number;
  contactName: string;
  customerId: number | null;
  customerName?: string | null;
  messagesCount: number;
  sentMessagesCount: number;
  receivedMessagesCount: number;
}

interface HourMessages {
  sector: string | null;
  hour: number;
  weekDay: number;
  messagesCount: number;
  sentMessagesCount: number;
  receivedMessagesCount: number;
}

interface WaitingContact {
  CODIGO_ATENDIMENTO: number;
  CONTATO: string;
  CLIENTE: string | null;
  SETOR: string | null;
  OPERADOR: string | null;
}

export interface AttendanceFilters {
  period: ReportPeriod | null;
  operators: EntityOption[];
  sectors: EntityOption[];
}

export interface AttendanceResult {
  rows: ResultRow[];
  csvHeaders: string[];
  csvRows: unknown[][];
  points: ReportChartPoint[];
}

interface AttendanceDefinition {
  chartTitle: string;
  chartType?: ReportChartType;
  chartNote?: string;
  directions?: boolean;
  metric: string;
  columns: ResultColumn[];
  searchHint: string;
  emptyMessage: string;
  execute: (
    token: string,
    filters: AttendanceFilters,
    signal: AbortSignal,
  ) => Promise<AttendanceResult>;
}

const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL || "http://localhost:8005";
const numberColumn = (label: string) => ({ label, numeric: true });
const weekdayLabels = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

async function fetchReport<T>(
  endpoint: string,
  token: string,
  signal: AbortSignal,
  params?: Record<string, string | number>,
) {
  const response = await axios.get<{ data: T }>(
    `${WHATSAPP_URL}/api/whatsapp/dashboard/${endpoint}`,
    {
      signal,
      headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` },
      params,
    },
  );
  return response.data.data;
}

function resultWithCsv<T extends object>(
  source: T[],
  rows: ResultRow[],
  points: ReportChartPoint[],
): AttendanceResult {
  const csvHeaders = Object.keys(source[0] ?? {});
  const keys = csvHeaders as (keyof T)[];
  return { rows, points, csvHeaders, csvRows: source.map((row) => keys.map((key) => row[key])) };
}

function requiredPeriod(period: ReportPeriod | null) {
  if (!period) throw new Error("Informe o período do relatório.");
  return period;
}

function queryIds(options: EntityOption[]) {
  return options.length ? options.map((option) => option.id).join(",") : "*";
}

export const attendanceReportDefinitions: Record<AttendanceReportId, AttendanceDefinition> = {
  messagesPerContact: {
    chartTitle: "Contatos com mais mensagens",
    chartNote:
      "O gráfico mostra os 10 contatos com maior volume. A tabela inclui todos os contatos retornados.",
    metric: "Mensagens",
    columns: [
      { label: "Contato" },
      { label: "Cliente" },
      numberColumn("Mensagens"),
      numberColumn("Enviadas"),
      numberColumn("Recebidas"),
    ],
    searchHint: "Nome ou código do contato ou cliente",
    emptyMessage: "Nenhuma mensagem encontrada para os filtros aplicados.",
    async execute(token, filters, signal) {
      const { startDate, endDate } = requiredPeriod(filters.period);
      const operator = filters.operators[0];
      const params = {
        date: `${startDate}_${endDate}`,
        ...(operator ? { user: operator.id } : {}),
      };
      const { messagesPerContact: source } = await fetchReport<{
        messagesPerContact: ContactMessages[];
      }>("messages-per-contact", token, signal, params);
      const rows = source.map((row) => ({
        key: row.contactId,
        cells: [
          row.contactName,
          row.customerName,
          row.messagesCount,
          row.sentMessagesCount,
          row.receivedMessagesCount,
        ],
        search: [row.contactName, row.contactId, row.customerName, row.customerId].join(" "),
      }));
      const points = [...source]
        .sort((a, b) => b.messagesCount - a.messagesCount)
        .slice(0, 10)
        .map((row) => ({ label: row.contactName, total: row.messagesCount }));
      return resultWithCsv(source, rows, points);
    },
  },
  messagesPerHourDay: {
    chartTitle: "Volume por horário",
    chartType: "line",
    chartNote:
      "O gráfico reúne os dias por hora. A tabela detalha por setor, dia da semana e hora.",
    directions: true,
    metric: "Mensagens",
    columns: [
      { label: "Setor" },
      { label: "Dia da semana" },
      { label: "Hora" },
      numberColumn("Mensagens"),
      numberColumn("Enviadas"),
      numberColumn("Recebidas"),
    ],
    searchHint: "Setor, dia ou hora",
    emptyMessage: "Nenhuma mensagem encontrada para os filtros aplicados.",
    async execute(token, filters, signal) {
      const { startDate, endDate } = requiredPeriod(filters.period);
      const params = {
        MIN_DATE: startDate,
        MAX_DATE: endDate,
        OPERADORES: queryIds(filters.operators),
        SETORES: queryIds(filters.sectors),
      };
      const { messagesPerHourDay: source } = await fetchReport<{
        messagesPerHourDay: HourMessages[];
      }>("messages-per-hour-day", token, signal, params);
      const byHour = new Map<
        number,
        { label: string; total: number; sent: number; received: number }
      >();
      const rows = source.map((row) => {
        const label = `${String(row.hour).padStart(2, "0")}h`;
        const point = byHour.get(row.hour) ?? { label, total: 0, sent: 0, received: 0 };
        point.total += row.messagesCount;
        point.sent += row.sentMessagesCount;
        point.received += row.receivedMessagesCount;
        byHour.set(row.hour, point);
        const day = weekdayLabels[row.weekDay - 1] ?? String(row.weekDay);
        const sector = row.sector || "Sem setor";
        return {
          key: JSON.stringify([row.sector, row.weekDay, row.hour]),
          cells: [
            sector,
            day,
            label,
            row.messagesCount,
            row.sentMessagesCount,
            row.receivedMessagesCount,
          ],
          search: `${sector} ${day} ${label}`,
        };
      });
      const points = [...byHour].sort(([a], [b]) => a - b).map(([, point]) => point);
      return resultWithCsv(source, rows, points);
    },
  },
  contactsAwaitingReturn: {
    chartTitle: "Pendências por setor",
    chartType: "pie",
    metric: "Pendências",
    columns: [
      { label: "Contato" },
      { label: "Cliente" },
      { label: "Setor" },
      { label: "Operador" },
    ],
    searchHint: "Contato, cliente, setor ou operador",
    emptyMessage: "Nenhum contato aguardando retorno no momento da consulta.",
    async execute(token, _filters, signal) {
      const source = await fetchReport<WaitingContact[]>("contacts-awaiting-return", token, signal);
      const bySector = new Map<string, number>();
      const rows = source.map((row) => {
        const sector = row.SETOR || "Sem setor";
        bySector.set(sector, (bySector.get(sector) ?? 0) + 1);
        return {
          key: row.CODIGO_ATENDIMENTO,
          cells: [row.CONTATO, row.CLIENTE, sector, row.OPERADOR],
          search: [row.CONTATO, row.CLIENTE, sector, row.OPERADOR, row.CODIGO_ATENDIMENTO].join(
            " ",
          ),
        };
      });
      const points = [...bySector].map(([label, total]) => ({ label, total }));
      return resultWithCsv(source, rows, points);
    },
  },
};
