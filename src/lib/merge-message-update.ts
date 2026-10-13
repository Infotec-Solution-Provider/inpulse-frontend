import { InternalMessage, WppMessage } from "@/lib/sdk-local";
import compareMessageStatus from "@/lib/utils/compare-message-status";
import { preserveMessageMentionMetadata } from "./utils/message-mentions";

type RealtimeMessage = WppMessage | InternalMessage;

export default function mergeMessageUpdate<T extends RealtimeMessage>(previous: T, incoming: T): T {
  if (previous.status === "REVOKED") return previous;
  const merged = { ...previous } as T;

  const withMetadata = preserveMessageMentionMetadata(previous, incoming);
  for (const [key, value] of Object.entries(withMetadata)) {
    if (value !== null && value !== undefined) {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }

  merged.status = compareMessageStatus(previous.status, incoming.status);
  merged.isEdited = previous.isEdited || incoming.isEdited;
  merged.isForwarded = previous.isForwarded || incoming.isForwarded;
  if (previous.isEdited && !incoming.isEdited) merged.body = previous.body;
  if (previous.isEdited && !incoming.isEdited) merged.mentionEntities = previous.mentionEntities;
  else if (previous.body !== incoming.body && incoming.mentionEntities === undefined) delete merged.mentionEntities;
  if (incoming.reaction === undefined) merged.reaction = previous.reaction;

  return merged;
}
