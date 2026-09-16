import type { SendMessageDataState } from "@/app/(private)/[instance]/(main)/(chat)/chat-reducer";
import type { MessageSendDiagnostic } from "./message-send-diagnostics";

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
  /**
   * File bytes are deliberately not persisted, but this lightweight fingerprint
   * distinguishes a fresh recorder clip from a possibly-delivered one after a
   * reload. AudioRecorder names every clip "audio.mp3".
   */
  fileSize?: number;
  fileLastModified?: number;
  error?: string;
  diagnostic?: MessageSendDiagnostic;
  attemptNotFound?: boolean;
  /** Manual replay keeps the key; its failure cannot disprove the first POST. */
  resuming?: boolean;
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

export function canResumePendingSend(attempt: PendingChatSend): boolean {
  return attempt.status === "unconfirmed" && attempt.attemptNotFound === true &&
    !attempt.messageId && !!attempt.clientId && !!attempt.chatId && !!attempt.contactId && !!attempt.to &&
    // Preserve the uploaded file identity; bytes do not survive a reload.
    (!attempt.fileName || !!attempt.snapshot.fileId);
}

export function samePendingContent(
  attempt: PendingChatSend,
  scope: string,
  clientId: number | undefined,
  snapshot: SendMessageDataState,
): boolean {
  const original = attempt.snapshot;
  const sameMessage =
    attempt.scope === scope &&
    attempt.clientId === clientId &&
    attempt.status === "unconfirmed" &&
    original.text === snapshot.text &&
    original.quotedId === snapshot.quotedId &&
    original.fileId === snapshot.fileId &&
    original.sendAsAudio === snapshot.sendAsAudio &&
    original.sendAsDocument === snapshot.sendAsDocument &&
    JSON.stringify(original.mentions || []) === JSON.stringify(snapshot.mentions || []);
  if (!sameMessage) return false;

  if (!snapshot.file) return !attempt.fileName;
  if (attempt.fileName !== snapshot.file.name) return false;

  // Older session entries only retained the filename. A filename is not an
  // identity for recorder output, so it must not indefinitely block a new clip.
  return (
    attempt.fileSize !== undefined &&
    attempt.fileLastModified !== undefined &&
    attempt.fileSize === snapshot.file.size &&
    attempt.fileLastModified === snapshot.file.lastModified
  );
}
