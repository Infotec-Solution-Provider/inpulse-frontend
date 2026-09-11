import { describe, expect, it, vi } from "vitest";
import {
  assertPersistedMessage,
  DefinitiveMessageSendError,
  isDefinitiveSendFailure,
  MessageSendCoordinator,
  sendDirectMessage,
  sendIdentifiedMessage,
  UnconfirmedMessageSendError,
} from "./reliable-message-send";
import type { WppMessage } from "@/lib/sdk-local";

const message = (status = "PENDING") => ({ id: 42, status }) as WppMessage;
describe("reliable message sends", () => {
  it("sends messages on every channel directly without opting into the queue and preserves the payload", async () => {
    const data = { idempotencyKey: "draft-attempt", text: "hello", fileId: 12, quotedId: 8 };
    const send = vi.fn(async () => message("SENT"));
    expect(await sendDirectMessage(data, send)).toMatchObject({ id: 42, status: "SENT" });
    expect(send).toHaveBeenCalledExactlyOnceWith({ ...data, idempotencyKey: undefined });
    expect(data.idempotencyKey).toBe("draft-attempt");
  });

  it("does not retry a direct send after a lost provider response", async () => {
    const send = vi.fn(async () => { throw new Error("response lost"); });
    await expect(sendDirectMessage({ idempotencyKey: "draft-attempt" }, send)).rejects.toThrow("response lost");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("preserves the identified payload and sends before doing any lookup", async () => {
    const data = {
      idempotencyKey: "attempt-1", text: "hello", fileId: 12, quotedId: 8,
      sendAsAudio: true, sendAsChatOwner: true, mentions: ["5511999999999"],
    };
    const send = vi.fn(async () => message());
    const lookup = vi.fn(async () => null);
    expect(await sendIdentifiedMessage(data, send, lookup)).toMatchObject({ id: 42 });
    expect(send).toHaveBeenCalledExactlyOnceWith(data);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("recovers a lost POST response by looking up the same attempt once", async () => {
    const send = vi.fn(async () => { throw new Error("timeout"); });
    const lookup = vi.fn(async () => message("SENT"));
    expect(await sendIdentifiedMessage({ idempotencyKey: "attempt-1" }, send, lookup))
      .toMatchObject({ id: 42, status: "SENT" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledExactlyOnceWith("attempt-1");
    expect(send.mock.invocationCallOrder[0]).toBeLessThan(lookup.mock.invocationCallOrder[0]);
  });

  it.each([null, { response: { status: 500 } }])(
    "keeps a lost POST unresolved after lookup result %s and never resends",
    async (lookupFailure) => {
      const timeout = new Error("timeout");
      const send = vi.fn(async () => { throw timeout; });
      const lookup = vi.fn(async () => {
        if (lookupFailure) throw lookupFailure;
        return null;
      });
      const error = await sendIdentifiedMessage({ idempotencyKey: "attempt-1" }, send, lookup)
        .catch((failure: unknown) => failure);
      expect(error).toBeInstanceOf(UnconfirmedMessageSendError);
      expect(error).toMatchObject({ idempotencyKey: "attempt-1", cause: timeout });
      expect(isDefinitiveSendFailure(error)).toBe(false);
      expect(send).toHaveBeenCalledTimes(1);
      expect(lookup).toHaveBeenCalledExactlyOnceWith("attempt-1");
    },
  );

  it.each([400, 401, 403, 413, 415, 422])(
    "allows draft recovery after a definitive HTTP %s rejection without a lookup",
    async (status) => {
      const rejected = new Error("rejected", { cause: { response: { status } } });
      const send = vi.fn(async () => { throw rejected; });
      const lookup = vi.fn(async () => null);
      await expect(sendIdentifiedMessage({ idempotencyKey: "attempt-1" }, send, lookup))
        .rejects.toBe(rejected);
      expect(isDefinitiveSendFailure(rejected)).toBe(true);
      expect(send).toHaveBeenCalledTimes(1);
      expect(lookup).not.toHaveBeenCalled();
    },
  );

  it.each([404, 408, 409, 429, 500, 502, 503, 504])(
    "treats HTTP %s as uncertain and only looks up the attempt",
    async (status) => {
      const send = vi.fn(async () => { throw new Error("rejected", { cause: { response: { status } } }); });
      const lookup = vi.fn(async () => null);
      await expect(sendIdentifiedMessage({ idempotencyKey: "attempt-1" }, send, lookup))
        .rejects.toBeInstanceOf(UnconfirmedMessageSendError);
      expect(send).toHaveBeenCalledTimes(1);
      expect(lookup).toHaveBeenCalledExactlyOnceWith("attempt-1");
    },
  );

  it("allows recovery of failures before dispatch without consulting a nonexistent attempt", async () => {
    const error = new DefinitiveMessageSendError("upload failed", new Error("network"));
    const send = vi.fn(async () => { throw error; });
    const lookup = vi.fn(async () => null);
    await expect(sendIdentifiedMessage({ idempotencyKey: "attempt-1" }, send, lookup))
      .rejects.toBe(error);
    expect(isDefinitiveSendFailure(error)).toBe(true);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("discards a lookup that resolves after the session is aborted", async () => {
    const controller = new AbortController();
    const send = vi.fn(async () => { throw new Error("timeout"); });
    const lookup = vi.fn(async () => {
      controller.abort();
      return message();
    });
    await expect(sendIdentifiedMessage({ idempotencyKey: "attempt-1" }, send, lookup, controller.signal))
      .rejects.toMatchObject({ name: "AbortError" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not look up a request from an aborted session", async () => {
    const controller = new AbortController();
    const send = vi.fn(async () => {
      controller.abort();
      throw new Error("canceled");
    });
    const lookup = vi.fn(async () => message());
    await expect(sendIdentifiedMessage({ idempotencyKey: "attempt-1" }, send, lookup, controller.signal))
      .rejects.toMatchObject({ name: "AbortError" });
    expect(lookup).not.toHaveBeenCalled();
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



  it("accepts durable UNKNOWN/PENDING and rejects empty successful responses", () => {
    expect(assertPersistedMessage(message("UNKNOWN"))).toMatchObject({ id: 42, status: "UNKNOWN" });
    expect(assertPersistedMessage(message())).toMatchObject({ id: 42 });
    expect(() => assertPersistedMessage(undefined as unknown as WppMessage)).toThrow(
      "não confirmou",
    );
    expect(() => assertPersistedMessage({ status: "SENT" } as WppMessage)).toThrow("não confirmou");
    expect(() => assertPersistedMessage(message("invalid-status"))).toThrow("não confirmou");
  });


});
