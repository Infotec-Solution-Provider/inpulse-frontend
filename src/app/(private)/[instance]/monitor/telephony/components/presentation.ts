import type { Theme } from "@mui/material/styles";
import type { TelephonyMonitorMode } from "../types";

/** The page's Tailwind card surface (white / slate-800) and border (slate-200 / slate-700).
 * The MUI themes are stock, so dark Paper would otherwise be gray (#121212 plus an
 * elevation gradient) instead of the slate palette used around it. */
export const surface = (theme: Theme) => (theme.palette.mode === "dark" ? "#1e293b" : "#ffffff");
export const surfaceBorder = (theme: Theme) =>
  theme.palette.mode === "dark" ? "#334155" : "#e2e8f0";
export const dialogPaperSx = {
  bgcolor: surface,
  backgroundImage: "none",
  borderRadius: 3,
  border: 1,
  borderColor: surfaceBorder,
  "& .MuiDialogContent-dividers": { borderColor: surfaceBorder },
} as const;

export const telephonyModes: Record<
  TelephonyMonitorMode,
  { label: string; unit: string; description: string }
> = {
  schedules: {
    label: "Agendamentos",
    unit: "agendamentos",
    description: "Agendamentos pendentes. Um cliente pode ter mais de um agendamento.",
  },
  calls: {
    label: "Ligações",
    unit: "registros de ligação",
    description: "Cada linha representa uma ligação registrada no histórico.",
  },
  unscheduled: {
    label: "Sem agendamento",
    unit: "clientes",
    description: "Clientes sem agendamento pendente. Cada cliente aparece uma vez.",
  },
};

export function displayDate(value: string | null, withTime = true): string {
  if (!value) return "Não informado";
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (!Number.isFinite(date.getTime())) return "Não informado";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function displayMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return Number.isFinite(year) && month >= 1 && month <= 12
    ? new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : value;
}

export function displayDuration(value: number | null): string {
  if (value === null) return "Duração não informada";
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
