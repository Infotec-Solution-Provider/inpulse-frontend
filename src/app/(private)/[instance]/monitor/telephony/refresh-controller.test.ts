import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import { TelephonyRefreshController } from "./refresh-controller";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => vi.useRealTimers());
const tick = () => vi.advanceTimersByTimeAsync(0);

describe("telephony refresh coordination", () => {
  it("preserves a manual request when an automatic batch is hidden and paused", async () => {
    let visible = true;
    let automatic = true;
    const complete: (() => void)[] = [];
    const committed: string[] = [];
    const execute = vi.fn((kind, ticket) =>
      new Promise<void>((resolve) => complete.push(resolve)).then(() => {
        if (controller.gate.isCurrent(ticket)) committed.push(kind);
      }),
    );
    const controller = new TelephonyRefreshController(
      (kind) => visible && (kind !== "auto" || automatic),
      execute,
    );
    controller.request("auto");
    await tick();
    controller.request("manual");
    visible = false;
    controller.suspend();
    automatic = false;
    controller.pauseAutomatic();
    expect(execute).toHaveBeenCalledTimes(1);
    visible = true;
    controller.resume("auto");
    await tick();
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[1][0]).toBe("manual");
    complete[0]();
    await tick();
    expect(committed).toEqual([]);
    expect(controller.busy).toBe(true);
    complete[1]();
    await tick();
    expect(committed).toEqual(["manual"]);
    expect(controller.busy).toBe(false);
    controller.dispose();
  });

  it("coalesces socket bursts and lets explicit refresh bypass the automatic throttle", async () => {
    const execute = vi.fn(async () => undefined);
    const controller = new TelephonyRefreshController(() => true, execute);
    controller.request("auto");
    await tick();
    for (let index = 0; index < 30; index++) controller.request("auto");
    await vi.advanceTimersByTimeAsync(4_999);
    expect(execute).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(execute).toHaveBeenCalledTimes(2);
    controller.request("auto");
    controller.request("manual");
    await tick();
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenLastCalledWith("manual", expect.any(Object));
    controller.dispose();
  });

  it("retains Retry-After through a query reset and never retries before its deadline", async () => {
    const execute = vi.fn(async () => undefined);
    const controller = new TelephonyRefreshController(() => true, execute);
    controller.gate.recordFailure(
      new AxiosError("limited", undefined, undefined, undefined, {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "retry-after": "7" },
        data: { code: "READ_REQUEST_LIMIT" },
        config: {} as never,
      }),
    );
    controller.request("manual");
    controller.reset();
    controller.request("query");
    await vi.advanceTimersByTimeAsync(6_999);
    expect(execute).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(execute).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it("does not dispatch hidden initial requests or queued work after unmount", async () => {
    let visible = false;
    const execute = vi.fn(async () => undefined);
    const controller = new TelephonyRefreshController(() => visible, execute);
    controller.request("query");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(execute).not.toHaveBeenCalled();
    visible = true;
    controller.resume("auto");
    controller.dispose();
    await tick();
    expect(execute).not.toHaveBeenCalled();
  });
});
