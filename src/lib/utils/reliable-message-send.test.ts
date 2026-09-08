import { describe, expect, it, vi } from "vitest";
import {
  assertPersistedMessage,
  getPendingMessageKey,
  isAttemptMissing,
  MessageSendCoordinator,
  messageAttemptStorageKey,
  resolveMessageAttempt,
  sendOfficialMessage,
} from "./reliable-message-send";
import type { WppMessage } from "@/lib/sdk-local";

const message = (status = "PENDING") => ({ id: 42, status }) as WppMessage;
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  } satisfies Storage;
}

describe("reliable message sends", () => {
  it("sends official messages directly without opting into the queue and preserves the payload", async () => {
    const data = { idempotencyKey: "draft-attempt", text: "hello", fileId: 12, quotedId: 8 };
    const send = vi.fn(async () => message("SENT"));
    expect(await sendOfficialMessage(data, send)).toMatchObject({ id: 42, status: "SENT" });
    expect(send).toHaveBeenCalledExactlyOnceWith({ ...data, idempotencyKey: undefined });
    expect(data.idempotencyKey).toBe("draft-attempt");
  });

  it("does not retry an official send after a lost provider response", async () => {
    const send = vi.fn(async () => { throw new Error("response lost"); });
    await expect(sendOfficialMessage({ idempotencyKey: "draft-attempt" }, send)).rejects.toThrow("response lost");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("reconciles a lost POST response without creating a second message on retry", async () => {
    let persisted: WppMessage | undefined;
    const lookup = vi.fn(async () => {
      if (!persisted) throw { response: { status: 404 } };
      return persisted;
    });
    const send = vi.fn(async () => {
      persisted = message("UNKNOWN");
      throw new Error("response lost after persistence");
    });
    await expect(resolveMessageAttempt(lookup, send)).rejects.toThrow("response lost");
    expect(await resolveMessageAttempt(lookup, send)).toMatchObject({ id: 42, status: "UNKNOWN" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("never resends when lookup times out or reports a conflicting attempt", async () => {
    const send = vi.fn(async () => message());
    await expect(
      resolveMessageAttempt(async () => {
        throw new Error("lookup timeout");
      }, send),
    ).rejects.toThrow("lookup timeout");
    await expect(
      resolveMessageAttempt(async () => {
        throw { response: { status: 409 } };
      }, send),
    ).rejects.toMatchObject({ response: { status: 409 } });
    expect(send).not.toHaveBeenCalled();
  });

  it("shares concurrent clicks for the same intention and retains the error for both callers", async () => {
    const coordinator = new MessageSendCoordinator();
    let reject!: (error: Error) => void;
    const send = vi.fn(
      () =>
        new Promise<WppMessage>((_, fail) => {
          reject = fail;
        }),
    );
    const first = coordinator.run("tenant/user/client", "attempt-1", send);
    const second = coordinator.run("tenant/user/client", "attempt-1", send);
    const result = Promise.allSettled([first, second]);
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(1);
    reject(new Error("network disconnected after POST"));
    expect((await result).map((entry) => entry.status)).toEqual(["rejected", "rejected"]);
    const retry = vi.fn(async () => message());
    expect(await coordinator.run("tenant/user/client", "attempt-1", retry)).toMatchObject({
      id: 42,
    });
  });

  it("does not combine separate intentions or users with identical contents", async () => {
    const coordinator = new MessageSendCoordinator();
    const send = vi.fn(async () => message());
    await Promise.all([
      coordinator.run("tenant/user-a/client", "attempt-1", send),
      coordinator.run("tenant/user-b/client", "attempt-1", send),
      coordinator.run("tenant/user-a/client", "attempt-2", send),
    ]);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("keeps the key through reload/retry until a persisted acknowledgement removes it", async () => {
    const session = storage();
    const slot = await messageAttemptStorageKey("tenant/user/client", { text: "hello" });
    const key = getPendingMessageKey(slot, session);
    expect(getPendingMessageKey(slot, session)).toBe(key);
    expect(await messageAttemptStorageKey("other/user/client", { text: "hello" })).not.toBe(slot);
    session.removeItem(slot);
    expect(getPendingMessageKey(slot, session)).not.toBe(key);
  });

  it("accepts durable UNKNOWN/PENDING and rejects empty successful responses", () => {
    expect(assertPersistedMessage(message("UNKNOWN"))).toMatchObject({ id: 42, status: "UNKNOWN" });
    expect(assertPersistedMessage(message())).toMatchObject({ id: 42 });
    expect(() => assertPersistedMessage(undefined as unknown as WppMessage)).toThrow(
      "não confirmou",
    );
    expect(() => assertPersistedMessage({ status: "SENT" } as WppMessage)).toThrow("não confirmou");
    expect(() => assertPersistedMessage(message("invalid-status"))).toThrow("não confirmou");
  });

  it("recognizes a missing attempt through the SDK error wrapper, but never a transport failure", () => {
    expect(isAttemptMissing(new Error("not found", { cause: { response: { status: 404 } } }))).toBe(
      true,
    );
    expect(isAttemptMissing(new Error("timeout"))).toBe(false);
    expect(isAttemptMissing({ response: { status: 409 } })).toBe(false);
  });
});
