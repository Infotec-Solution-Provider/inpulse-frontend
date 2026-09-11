import type { WppMessage } from "@/lib/sdk-local";

export function createMessageAttemptKey(): string {
  return crypto.randomUUID();
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

/** Send through the synchronous endpoint without attempt lookup or polling. */
export async function sendDirectMessage<T extends { idempotencyKey?: string }>(
  data: T,
  send: (data: T) => Promise<WppMessage>,
): Promise<WppMessage> {
  // Do not opt into the durable worker or retry an uncertain provider response.
  return assertPersistedMessage(await send({ ...data, idempotencyKey: undefined }));
}

/** The message endpoint was never called, so the original draft can be recovered safely. */
export class DefinitiveMessageSendError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "DefinitiveMessageSendError";
  }
}

/** A missing attempt after a failed POST does not prove that the POST was rejected. */
export class UnconfirmedMessageSendError extends Error {
  constructor(
    public readonly idempotencyKey: string,
    cause?: unknown,
    public readonly lookupError?: unknown,
  ) {
    super("Ainda não foi possível confirmar o envio da mensagem.", { cause });
    this.name = "UnconfirmedMessageSendError";
  }
}

export function isDefinitiveSendFailure(error: unknown): boolean {
  const visited = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if (current instanceof UnconfirmedMessageSendError) return false;
    if (current instanceof DefinitiveMessageSendError) return true;
    const candidate = current as { response?: { status?: number }; cause?: unknown };
    if (candidate.response?.status !== undefined) {
      return [400, 401, 403, 413, 415, 422].includes(candidate.response.status);
    }
    current = candidate.cause;
  }
  return false;
}

/** Dispatch once; reconcile a lost response by reading the same attempt, never by resending. */
export async function sendIdentifiedMessage<T extends { idempotencyKey: string }>(
  data: T,
  send: (data: T) => Promise<WppMessage>,
  lookup: (key: string) => Promise<WppMessage | null>,
  signal?: AbortSignal,
): Promise<WppMessage> {
  signal?.throwIfAborted();
  if (!data.idempotencyKey.trim()) {
    throw new DefinitiveMessageSendError("Identificação do envio indisponível.");
  }
  try {
    const message = assertPersistedMessage(await send(data));
    signal?.throwIfAborted();
    return message;
  } catch (error) {
    signal?.throwIfAborted();
    if (isDefinitiveSendFailure(error)) throw error;

    let recovered: WppMessage | null;
    try {
      recovered = await lookup(data.idempotencyKey);
      signal?.throwIfAborted();
      if (recovered) return assertPersistedMessage(recovered);
    } catch (lookupError) {
      signal?.throwIfAborted();
      throw new UnconfirmedMessageSendError(data.idempotencyKey, error, lookupError);
    }
    throw new UnconfirmedMessageSendError(data.idempotencyKey, error);
  }
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
