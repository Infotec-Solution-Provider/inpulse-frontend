import { describe, expect, it, vi } from "vitest";
import {
  assertPersistedMessage,
  MessageSendCoordinator,
  sendDirectMessage,
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
