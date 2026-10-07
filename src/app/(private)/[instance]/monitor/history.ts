import type { InternalMessage, WppMessage } from "@/lib/sdk-local";
import monitorService from "@/lib/services/monitor.service";

export interface MonitorHistoryPage {
  messages: (InternalMessage | WppMessage)[];
  quotedMessages?: (InternalMessage | WppMessage)[];
  nextCursor: number | null;
}

export async function loadMonitorHistory(
  type: "wpp" | "internal",
  chatId: number,
  beforeId: number | null,
  signal: AbortSignal,
) {
  const response = await monitorService.ax.get<{ data: MonitorHistoryPage }>(
    `/api/whatsapp/monitor/chats/${type}/${chatId}/messages`,
    { params: { limit: 50, ...(beforeId ? { beforeId } : {}) }, signal },
  );
  const page = response.data.data;
  if (!page || !Array.isArray(page.messages)) throw new Error("Histórico inválido.");
  return page;
}

export function monitorMessageDate(message: InternalMessage | WppMessage): Date {
  if ("sentAt" in message && message.sentAt) return new Date(message.sentAt);
  const timestamp = Number(message.timestamp);
  return new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
}
