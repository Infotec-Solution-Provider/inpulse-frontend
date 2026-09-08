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
