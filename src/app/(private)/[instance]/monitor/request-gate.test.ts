import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { MonitorRequestGate } from "./request-gate";

const throttled = (retryAfter: string) =>
  new AxiosError("limited", undefined, undefined, undefined, {
    status: 429,
    statusText: "Too Many Requests",
    headers: { "retry-after": retryAfter },
    data: { code: "READ_REQUEST_LIMIT" },
    config: {} as never,
  });

describe("monitor request ownership", () => {
  it("ignores an old filter/tenant response even if its transport completes after cancellation", async () => {
    const gate = new MonitorRequestGate();
    const first = gate.begin(0)!;
    const rendered: string[] = [];
    let resolveOld!: () => void;
    const oldResponse = new Promise<void>((resolve) => {
      resolveOld = resolve;
    }).then(() => {
      if (gate.isCurrent(first)) rendered.push("tenant-old");
      gate.complete(first);
    });
    gate.invalidate();
    expect(first.controller.signal.aborted).toBe(true);
    const second = gate.begin(0)!;
    resolveOld();
    await oldResponse;
    expect(rendered).toEqual([]);
    expect(gate.isCurrent(second)).toBe(true);
    expect(gate.begin(0)).toBeNull();
    gate.complete(second);
    expect(gate.begin(0)).not.toBeNull();
  });

  it("blocks overlap and makes unmounted tickets unable to commit", () => {
    const gate = new MonitorRequestGate();
    const ticket = gate.begin(0)!;
    expect(gate.begin(0)).toBeNull();
    gate.invalidate();
    expect(gate.isCurrent(ticket)).toBe(false);
    expect(gate.busy).toBe(false);
  });

  it("respects Retry-After across filter invalidation and simultaneous failures", () => {
    const gate = new MonitorRequestGate();
    const ticket = gate.begin(1000)!;
    gate.recordFailure(new Error("SDK wrapper", { cause: throttled("7") }), 1000);
    gate.recordFailure(throttled("2"), 1000);
    gate.complete(ticket);
    gate.invalidate();
    expect(gate.retryAfterUntil).toBe(8000);
    expect(gate.begin(7999)).toBeNull();
    expect(gate.begin(8000)).not.toBeNull();
  });

  it("accepts HTTP-date Retry-After and uses a bounded fallback for malformed headers", () => {
    const gate = new MonitorRequestGate();
    const now = Date.parse("2026-09-25T12:00:00Z");
    expect(gate.recordFailure(throttled("Fri, 25 Sep 2026 12:00:12 GMT"), now)).toBe(now + 12_000);
    const fallback = new MonitorRequestGate();
    expect(fallback.recordFailure(throttled("invalid"), now)).toBe(now + 2000);
    expect(fallback.recordFailure(new Error("network"), now)).toBe(now + 2000);
  });
});
