import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionChangePoller } from "./session-change-poller";

describe("incremental recovery", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  function fixture() {
    let visible = true;
    let generation = 0;
    const snapshot = vi.fn(async (_signal: AbortSignal) => ({ syncCursor: "start", value: 1 }));
    const changes = vi.fn(async (_cursor: string, _signal: AbortSignal) => ({
      changes: [2], nextCursor: "next", hasMore: false, resetRequired: false,
    }));
    const applySnapshot = vi.fn();
    const applyChanges = vi.fn();
    const onError = vi.fn();
    const poller = new SessionChangePoller({ snapshot, changes, applySnapshot, applyChanges,
      canRun: () => visible, generation: () => generation, onError, random: () => 0 });
    return { poller, snapshot, changes, applySnapshot, applyChanges, onError,
      hide: () => { visible = false; }, show: () => { visible = true; }, socket: () => { generation++; } };
  }
  async function bootstrap(f: ReturnType<typeof fixture>) {
    f.poller.wake();
    await vi.advanceTimersByTimeAsync(1);
  }
  it("snapshots once, replays the interval, then requests only the returned cursor", async () => {
    const f = fixture();
    await bootstrap(f);
    expect(f.snapshot).toHaveBeenCalledTimes(1);
    expect(f.changes.mock.calls[0]?.[0]).toBe("start");
    await vi.advanceTimersByTimeAsync(119000);
    expect(f.changes).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1001);
    expect(f.changes.mock.calls[1]?.[0]).toBe("next");
    expect(f.snapshot).toHaveBeenCalledTimes(1);
    f.poller.stop();
  });
  it("does not overlap requests when focus and reconnection wake it together", async () => {
    const f = fixture();
    let finish!: (value: { syncCursor: string; value: number }) => void;
    f.snapshot.mockImplementationOnce(() => new Promise((done) => { finish = done; }));
    f.poller.wake(); await vi.advanceTimersByTimeAsync(1);
    f.poller.wake(); f.poller.wake();
    expect(f.snapshot).toHaveBeenCalledTimes(1);
    finish({ syncCursor: "start", value: 1 });
    await vi.advanceTimersByTimeAsync(2);
    expect(f.snapshot).toHaveBeenCalledTimes(1);
    expect(f.changes).toHaveBeenCalledTimes(1);
    f.poller.stop();
  });
  it("pauses hidden/offline work and recovers immediately on return", async () => {
    const f = fixture(); await bootstrap(f);
    f.hide(); await vi.advanceTimersByTimeAsync(240000);
    expect(f.changes).toHaveBeenCalledTimes(1);
    f.show(); f.poller.wake(); await vi.advanceTimersByTimeAsync(1);
    expect(f.changes).toHaveBeenCalledTimes(2);
    f.poller.stop();
  });
  it("discards stale HTTP results when a socket event arrived during the request", async () => {
    const f = fixture(); await bootstrap(f);
    let finish!: (value: Awaited<ReturnType<typeof f.changes>>) => void;
    f.changes.mockImplementationOnce(() => new Promise((done) => { finish = done; }));
    f.poller.wake(); await vi.advanceTimersByTimeAsync(1);
    f.socket(); finish({ changes: [0], nextCursor: "wrong", hasMore: false, resetRequired: false });
    await vi.advanceTimersByTimeAsync(1001);
    expect(f.applyChanges).not.toHaveBeenCalledWith([0]);
    expect(f.changes.mock.calls.at(-1)?.[0]).toBe("next");
    f.poller.stop();
  });
  it("keeps the old cursor on application failure and honors Retry-After", async () => {
    const f = fixture(); await bootstrap(f);
    f.applyChanges.mockImplementationOnce(() => { throw { response: { headers: { "retry-after": "90" } } }; });
    f.poller.wake(); await vi.advanceTimersByTimeAsync(1);
    const calls = f.changes.mock.calls.length;
    await vi.advanceTimersByTimeAsync(89998);
    expect(f.changes).toHaveBeenCalledTimes(calls);
    await vi.advanceTimersByTimeAsync(2);
    expect(f.changes.mock.calls.at(-1)?.[0]).toBe("next");
    expect(f.onError).toHaveBeenCalledTimes(1);
    f.poller.stop();
  });
  it("uses the cursor returned by each backlog page and yields between pages", async () => {
    const f = fixture(); await bootstrap(f);
    f.changes.mockResolvedValueOnce({ changes: [3], nextCursor: "page2", hasMore: true, resetRequired: false });
    f.poller.wake(); await vi.advanceTimersByTimeAsync(251);
    expect(f.changes.mock.calls.at(-1)?.[0]).toBe("page2");
    f.poller.stop();
  });
  it("resnapshots expired cursors and never applies a late result after logout", async () => {
    const f = fixture(); await bootstrap(f);
    f.changes.mockResolvedValueOnce({ changes: null as unknown as number[], nextCursor: null as unknown as string, hasMore: false, resetRequired: true });
    f.poller.wake(); await vi.advanceTimersByTimeAsync(3);
    expect(f.snapshot).toHaveBeenCalledTimes(2);
    let finish!: (value: Awaited<ReturnType<typeof f.changes>>) => void;
    f.changes.mockImplementationOnce(() => new Promise((done) => { finish = done; }));
    f.poller.wake(); await vi.advanceTimersByTimeAsync(1);
    const before = f.applyChanges.mock.calls.length;
    f.poller.stop();
    finish({ changes: [999], nextCursor: "late", hasMore: false, resetRequired: false });
    await vi.advanceTimersByTimeAsync(60000);
    expect(f.applyChanges).toHaveBeenCalledTimes(before);
  });
});
