import type { SendMessageDataState } from "@/app/(private)/[instance]/(main)/(chat)/chat-reducer";

export interface PendingChatSend {
  id: string;
  scope: string;
  snapshot: SendMessageDataState;
  status: "queued" | "sending" | "unconfirmed" | "failed";
  clientId?: number;
  chatId?: number;
  to?: string;
  messageId?: number;
  contactId?: number;
  fileName?: string;
  error?: string;
  verificationStartedAt?: number;
  verificationChecks?: number;
  verificationLastCheckedAt?: number;
}

const sessions = new Map<string, PendingChatSend[]>();
const listeners = new Set<() => void>();
const scheduledWrites = new Set<string>();
export const EMPTY_PENDING_SENDS: PendingChatSend[] = [];
const storageKey = (session: string) => `@inpulse/pending-sends/${session}`;

export function getPendingChatSends(session: string): PendingChatSend[] {
  const existing = sessions.get(session);
  if (existing) return existing;
  let restored: PendingChatSend[] = [];
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey(session)) || "[]");
    if (Array.isArray(stored)) {
      restored = stored
        .filter(
          (item): item is PendingChatSend =>
            item &&
            typeof item.id === "string" &&
            typeof item.scope === "string" &&
            typeof item.snapshot?.text === "string" &&
            ["queued", "sending", "unconfirmed", "failed"].includes(item.status),
        )
        .map((item) => ({
          ...item,
          snapshot: { ...item.snapshot, file: undefined },
          status:
            item.status === "failed"
              ? "failed"
              : item.status === "sending" && item.messageId
                ? "sending"
                : "unconfirmed",
        }));
    }
  } catch {
    // Memory remains usable when browser storage is unavailable.
  }
  sessions.set(session, restored);
  return restored;
}

export function updatePendingChatSends(
  session: string,
  update: (current: PendingChatSend[]) => PendingChatSend[],
): void {
  const next = update(getPendingChatSends(session));
  sessions.set(session, next);
  listeners.forEach((listener) => listener());
  if (scheduledWrites.has(session)) return;
  scheduledWrites.add(session);
  // Never await storage before clearing the editor or starting the request.
  queueMicrotask(() => {
    scheduledWrites.delete(session);
    try {
      const entries = sessions.get(session) || [];
      if (!entries.length) sessionStorage.removeItem(storageKey(session));
      else
        sessionStorage.setItem(
          storageKey(session),
          JSON.stringify(
            entries.map((entry) => ({
              ...entry,
              snapshot: { ...entry.snapshot, file: undefined },
            })),
          ),
        );
    } catch {
      // Keep the in-memory attempt even if storage is full or disabled.
    }
  });
}

export function subscribePendingChatSends(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function samePendingContent(
  attempt: PendingChatSend,
  scope: string,
  clientId: number | undefined,
  snapshot: SendMessageDataState,
): boolean {
  const original = attempt.snapshot;
  return (
    attempt.scope === scope &&
    attempt.clientId === clientId &&
    attempt.status === "unconfirmed" &&
    original.text === snapshot.text &&
    original.quotedId === snapshot.quotedId &&
    original.fileId === snapshot.fileId &&
    attempt.fileName === snapshot.file?.name &&
    original.sendAsAudio === snapshot.sendAsAudio &&
    original.sendAsDocument === snapshot.sendAsDocument &&
    JSON.stringify(original.mentions || []) === JSON.stringify(snapshot.mentions || [])
  );
}
