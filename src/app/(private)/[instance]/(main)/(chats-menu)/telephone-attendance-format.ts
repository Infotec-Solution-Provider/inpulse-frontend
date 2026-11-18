import { Formatter } from "@in.pulse-crm/utils";
import type { CustomerCallHistoryDetail } from "./(start-chat-modal)/customer-crm-detail-modal.types";

export function formatPhone(phone?: string | null) {
  if (!phone) return "-";
  try {
    return Formatter.phone(phone);
  } catch {
    return phone;
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatCurrency(value?: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function getHistoryResultLabel(item: CustomerCallHistoryDetail) {
  if (item.RESULTADO_NOME?.trim()) return item.RESULTADO_NOME;
  return item.TIPO_ACAO === "RECEP" ? "Atendimento receptivo" : "Atendimento ativo";
}

export function normalizePhone(phone?: string | null) {
  return phone?.replace(/\D/g, "") || "";
}
