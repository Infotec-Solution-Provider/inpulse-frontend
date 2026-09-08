import type { WppMessage } from "@/lib/sdk-local";

export function createMessageAttemptKey(): string {
  return crypto.randomUUID();
}

export async function messageAttemptStorageKey(scope: string, content: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify([scope, content])),
  );
  return `inpulse-send-attempt:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function getPendingMessageKey(
  storageKey: string,
  storage: Storage = sessionStorage,
): string {
  const existing = storage.getItem(storageKey);
  if (existing) return existing;
  const key = createMessageAttemptKey();
  storage.setItem(storageKey, key);
  return key;
}

export function assertPersistedMessage(message: WppMessage): WppMessage {
  if (
    !message ||
    !Number.isSafeInteger(message.id) ||
    message.id <= 0 ||
    !["PENDING", "UNKNOWN", "SENT", "RECEIVED", "READ", "DOWNLOADED", "ERROR", "REVOKED"].includes(
      message.status,
    )
  ) {
    throw new Error("O servidor não confirmou o registro da mensagem.");
  }
  return message;
}

/** WABA uses the synchronous endpoint while the operator queue is investigated. */
export async function sendOfficialMessage<T extends { idempotencyKey?: string }>(
  data: T,
  send: (data: T) => Promise<WppMessage>,
): Promise<WppMessage> {
  // Do not opt into the durable worker or retry an uncertain provider response.
  return assertPersistedMessage(await send({ ...data, idempotencyKey: undefined }));
}

/** Share only concurrent calls for the same intention. Completed sends can be sent again explicitly. */
export class MessageSendCoordinator {
  private readonly pending = new Map<string, Promise<WppMessage>>();

  run(scope: string, key: string, send: () => Promise<WppMessage>): Promise<WppMessage> {
    const identity = JSON.stringify([scope, key]);
    const existing = this.pending.get(identity);
    if (existing) return existing;
    const promise = Promise.resolve().then(send).then(assertPersistedMessage);
    this.pending.set(identity, promise);
    void promise
      .finally(() => {
        if (this.pending.get(identity) === promise) this.pending.delete(identity);
      })
      .catch(() => undefined);
    return promise;
  }
}

export function isAttemptMissing(error: unknown): boolean {
  const candidate = error as { response?: { status?: number }; cause?: unknown };
  return (
    candidate?.response?.status === 404 || (!!candidate?.cause && isAttemptMissing(candidate.cause))
  );
}

export async function resolveMessageAttempt(
  lookup: () => Promise<WppMessage>,
  send: () => Promise<WppMessage>,
): Promise<WppMessage> {
  try {
    return assertPersistedMessage(await lookup());
  } catch (error) {
    // A timeout, 409, or invalid response is not proof that the operation does not exist.
    if (!isAttemptMissing(error)) throw error;
    return assertPersistedMessage(await send());
  }
}
