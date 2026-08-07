import { InternalMessage, WppMessage } from "@/lib/sdk-local";
import compareMessageStatus from "@/lib/utils/compare-message-status";

type RealtimeMessage = WppMessage | InternalMessage;

export default function mergeMessageUpdate<T extends RealtimeMessage>(previous: T, incoming: T): T {
  if (previous.status === "REVOKED") return previous;
  const merged = { ...previous } as T;

  for (const [key, value] of Object.entries(incoming)) {
    if (value !== null && value !== undefined) {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }

  merged.status = compareMessageStatus(previous.status, incoming.status);
  merged.isEdited = previous.isEdited || incoming.isEdited;
  merged.isForwarded = previous.isForwarded || incoming.isForwarded;
  if (previous.isEdited && !incoming.isEdited) merged.body = previous.body;
  if (incoming.reaction === undefined) merged.reaction = previous.reaction;

  return merged;
}
