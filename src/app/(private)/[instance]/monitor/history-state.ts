import type { InternalMessage, WppMessage } from "@/lib/sdk-local";

type MonitorMessage = InternalMessage | WppMessage;

export function monitorMessageDate(message: MonitorMessage): Date {
  const timestamp = Number(message.timestamp);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
  }
  if ("sentAt" in message && message.sentAt) {
    const sentAt = new Date(message.sentAt);
    if (Number.isFinite(sentAt.getTime())) return sentAt;
  }
  return new Date(0);
}

export function mergeMonitorHistoryMessages(
  previous: MonitorMessage[],
  incoming: MonitorMessage[],
): MonitorMessage[] {
  const merged = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) merged.set(message.id, message);
  return [...merged.values()].sort(
    (a, b) => monitorMessageDate(a).getTime() - monitorMessageDate(b).getTime() || a.id - b.id,
  );
}
