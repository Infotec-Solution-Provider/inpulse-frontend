import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retryLimitedRead } from "./retry-limited-read";

const limited = (seconds = 2) => new Error("Aguarde", { cause: {
  response: { status: 429, headers: {}, data: { code: "READ_REQUEST_LIMIT", retryAfterSeconds: seconds } },
} });

describe("contacts directory read recovery", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("recovers after the server wait without returning an empty directory", async () => {
    const read = vi.fn().mockRejectedValueOnce(limited()).mockResolvedValue([{ id: 1 }]);
    const result = retryLimitedRead(read, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(1999);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toEqual([{ id: 1 }]);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("honors a longer server wait", async () => {
    const read = vi.fn().mockRejectedValueOnce(limited(9)).mockResolvedValue([]);
    const result = retryLimitedRead(read, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(8999);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toEqual([]);
  });

  it("stops after three retries with increasing waits", async () => {
    const failure = limited(), read = vi.fn().mockRejectedValue(failure);
    const result = retryLimitedRead(read, new AbortController().signal);
    const rejected = expect(result).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(13999);
    expect(read).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(read).toHaveBeenCalledTimes(4);
  });

  it("cancels the waiting retry when its session ends", async () => {
    const controller = new AbortController(), read = vi.fn().mockRejectedValue(limited());
    const result = retryLimitedRead(read, controller.signal);
    const rejected = expect(result).rejects.toBeDefined();
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await rejected;
    await vi.advanceTimersByTimeAsync(30000);
    expect(read).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([401, 403, 500, 429])("does not retry other HTTP failures (%s)", async (status) => {
    const failure = { response: { status, data: { code: "OTHER" } } };
    const read = vi.fn().mockRejectedValue(failure);
    await expect(retryLimitedRead(read, new AbortController().signal)).rejects.toBe(failure);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
