import type { MonitorOperational } from "./types";

export function lastMessageChannelLabel(operational?: MonitorOperational): string | null {
  const channel = operational?.lastMessageChannel;
  if (!channel) return null;
  return [channel.name.trim(), channel.phone].filter(Boolean).join(" · ") || `Canal #${channel.id}`;
}
