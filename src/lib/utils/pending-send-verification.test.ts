import { describe, expect, it, vi } from "vitest";
import type { WppMessage } from "@/lib/sdk-local";
import type { PendingChatSend } from "./pending-chat-sends";
import { PendingSendVerifier } from "./pending-send-verification";

function setup(overrides: Partial<PendingChatSend> = {}) {
  let now = 1_000_000;
  let attempts: PendingChatSend[] = [
    {
      id: "original-idempotency-key",
      scope: "tenant/user/chat",
      clientId: 3,
      status: "unconfirmed",
      snapshot: {
        text: "hello",
        sendAsAudio: false,
        sendAsDocument: false,
        isEmojiMenuOpen: false,
      },
      ...overrides,
    },
  ];
  const lookup = vi.fn(async (): Promise<WppMessage | null> => null);
  const updateAttempt = vi.fn((id: string, patch: Partial<PendingChatSend>) => {
    attempts = attempts.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
  });
  const settle = vi.fn((id: string, message: WppMessage) => {
    if (message.status === "PENDING")
      updateAttempt(id, { status: "sending", messageId: message.id });
    else if (message.status === "UNKNOWN" || message.status === "ERROR") {
      updateAttempt(id, { status: "unconfirmed", messageId: message.id });
    } else attempts = attempts.filter((entry) => entry.id !== id);
  });
  const onChange = vi.fn();
  const options = {
    getAttempts: () => attempts,
    updateAttempt,
    lookup,
    settle,
    onChange,
    now: () => now,
  };
  const verifier = new PendingSendVerifier(options);
  return {
    verifier,
    lookup,
    settle,
    onChange,
    updateAttempt,
    options,
    getAttempts: () => attempts,
    elapse: (milliseconds: number) => {
      now += milliseconds;
    },
    remove: () => {
      attempts = [];
    },
  };
}

const receipt = (status: WppMessage["status"]) => ({ id: 41, status }) as WppMessage;
const flush = () => Promise.resolve();

describe("pending send verification", () => {
  it("recovers an unconfirmed send without a message ID using the original key", async () => {
    const test = setup();
    test.lookup.mockResolvedValue(receipt("SENT"));
    test.verifier.tick();
    test.elapse(4_999);
    test.verifier.tick();
    expect(test.lookup).not.toHaveBeenCalled();
    test.elapse(1);
    test.verifier.tick();
    await flush();

    expect(test.lookup).toHaveBeenCalledExactlyOnceWith(3, "original-idempotency-key");
    expect(test.getAttempts()).toEqual([]);
    expect(test.onChange).toHaveBeenLastCalledWith({});
  });

  it.each(["PENDING", "UNKNOWN", "ERROR"] as const)(
    "preserves %s receipts and stops after six increasing waits; manual checks remain available",
    async (status) => {
      const test = setup();
      test.lookup.mockResolvedValue(receipt(status));
      test.verifier.tick();
      for (const delay of [5_000, 10_000, 15_000, 20_000, 30_000, 30_000]) {
        test.elapse(delay - 1);
        const calls = test.lookup.mock.calls.length;
        test.verifier.tick();
        expect(test.lookup).toHaveBeenCalledTimes(calls);
        test.elapse(1);
        test.verifier.tick();
        await flush();
      }
      expect(test.lookup).toHaveBeenCalledTimes(6);
      expect(test.getAttempts()[0]).toMatchObject({ status: "unconfirmed", verificationChecks: 6 });
      expect(test.onChange).toHaveBeenLastCalledWith({ "original-idempotency-key": "paused" });
      test.elapse(600_000);
      test.verifier.tick();
      expect(test.lookup).toHaveBeenCalledTimes(6);

      test.lookup.mockResolvedValue(receipt("SENT"));
      await test.verifier.check("original-idempotency-key");
      expect(test.lookup).toHaveBeenCalledTimes(7);
      expect(test.getAttempts()).toEqual([]);
    },
  );

  it("bounds absent receipts and lookup errors without declaring the send failed", async () => {
    const test = setup();
    test.verifier.tick();
    for (const delay of [5_000, 10_000, 15_000, 20_000, 30_000, 30_000]) {
      if (delay === 15_000) test.lookup.mockRejectedValueOnce(new Error("network unavailable"));
      test.elapse(delay);
      test.verifier.tick();
      await flush();
    }
    expect(test.lookup).toHaveBeenCalledTimes(6);
    expect(test.getAttempts()[0]).toMatchObject({ status: "unconfirmed", verificationChecks: 6 });
    expect(test.settle).not.toHaveBeenCalled();
    expect(test.onChange).toHaveBeenLastCalledWith({ "original-idempotency-key": "paused" });
  });

  it("pauses after two minutes even when a sleeping tab missed scheduled reads", () => {
    const test = setup({ status: "sending", messageId: 41 });
    test.verifier.tick();
    test.elapse(120_000);
    test.verifier.tick();
    expect(test.lookup).not.toHaveBeenCalled();
    expect(test.getAttempts()[0].status).toBe("unconfirmed");
    expect(test.onChange).toHaveBeenLastCalledWith({ "original-idempotency-key": "paused" });
  });

  it("keeps the persisted deadline and spent checks when the verifier is recreated", async () => {
    const test = setup({
      verificationStartedAt: 990_000,
      verificationChecks: 5,
      verificationLastCheckedAt: 995_000,
    });
    test.verifier.tick();
    test.verifier.stop();
    const restored = new PendingSendVerifier(test.options);
    test.elapse(25_000);
    restored.tick();
    await flush();
    expect(test.lookup).toHaveBeenCalledTimes(1);
    expect(test.getAttempts()[0].verificationChecks).toBe(6);
    test.elapse(60_000);
    restored.tick();
    expect(test.lookup).toHaveBeenCalledTimes(1);
  });

  it("normalizes malformed stored progress without disabling later verification", async () => {
    const test = setup({
      verificationStartedAt: Number.NaN,
      verificationLastCheckedAt: Number.POSITIVE_INFINITY,
      verificationChecks: -1.5,
    });
    test.verifier.tick();
    expect(test.getAttempts()[0]).toMatchObject({
      verificationStartedAt: 1_000_000,
      verificationChecks: 0,
    });
    expect(test.getAttempts()[0].verificationLastCheckedAt).toBeUndefined();
    test.elapse(5_000);
    test.verifier.tick();
    await flush();
    expect(test.lookup).toHaveBeenCalledTimes(1);
  });

  it("counts manual verification without resetting the automatic window", async () => {
    const test = setup();
    test.verifier.tick();
    const start = test.getAttempts()[0].verificationStartedAt;
    test.elapse(4_000);
    await test.verifier.check("original-idempotency-key");
    expect(test.getAttempts()[0]).toMatchObject({
      verificationStartedAt: start,
      verificationChecks: 1,
    });
    test.elapse(5_000);
    test.verifier.tick();
    expect(test.lookup).toHaveBeenCalledTimes(1);
    test.elapse(5_000);
    test.verifier.tick();
    await flush();
    expect(test.lookup).toHaveBeenCalledTimes(2);
  });

  it("prevents overlapping automatic and manual requests", async () => {
    const test = setup();
    let resolve!: (value: WppMessage | null) => void;
    test.lookup.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    test.verifier.tick();
    test.elapse(5_000);
    test.verifier.tick();
    test.elapse(30_000);
    test.verifier.tick();
    await test.verifier.check("original-idempotency-key");
    expect(test.lookup).toHaveBeenCalledTimes(1);
    expect(test.onChange).toHaveBeenLastCalledWith({ "original-idempotency-key": "checking" });
    resolve(null);
    await flush();
    expect(test.onChange).toHaveBeenLastCalledWith({ "original-idempotency-key": "automatic" });
  });

  it.each(["stop", "remove"] as const)("ignores late results after %s", async (action) => {
    const test = setup();
    let resolve!: (value: WppMessage | null) => void;
    test.lookup.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = test.verifier.check("original-idempotency-key");
    if (action === "stop") test.verifier.stop();
    else test.remove();
    test.updateAttempt.mockClear();
    resolve(receipt("SENT"));
    await pending;
    expect(test.settle).not.toHaveBeenCalled();
    expect(test.updateAttempt).not.toHaveBeenCalled();
  });

  it.each([
    { clientId: undefined },
    { status: "queued" as const },
    { status: "failed" as const, messageId: 41 },
    { status: "sending" as const },
  ])(
    "does not verify internal, queued, failed, or still dispatching sends: %o",
    async (overrides) => {
      const test = setup(overrides);
      test.verifier.tick();
      test.elapse(120_000);
      test.verifier.tick();
      await test.verifier.check("original-idempotency-key");
      expect(test.lookup).not.toHaveBeenCalled();
      expect(test.updateAttempt).not.toHaveBeenCalled();
    },
  );
});
