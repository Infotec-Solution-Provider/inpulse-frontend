import { describe, expect, it } from "vitest";
import { DEFAULT_WAIT_THRESHOLDS, monitorWaitSeverity, monitorWaitThresholds } from "./wait-thresholds";

const now = Date.parse("2026-11-12T17:00:00Z");
const operational = (minutes: number) => ({ status: "waiting_agent" as const, waitingSince: new Date(now - minutes * 60_000).toISOString() });

describe("monitor wait markers", () => {
  it("uses 30 and 1440 minute defaults without requiring parameters", () => {
    expect(monitorWaitThresholds({})).toEqual(DEFAULT_WAIT_THRESHOLDS);
  });
  it.each([[29.999, "normal"], [30, "warning"], [1439.999, "warning"], [1440, "critical"], [2880, "critical"]])(
    "uses inclusive warning/critical boundaries after %s minutes", (minutes, severity) => {
      expect(monitorWaitSeverity(operational(Number(minutes)), DEFAULT_WAIT_THRESHOLDS, now)).toBe(severity);
    },
  );
  it("applies configured minute thresholds", () => {
    const thresholds = monitorWaitThresholds({ "monitor:wait_warning_minutes": "5", "monitor:wait_critical_minutes": "60" });
    expect(monitorWaitSeverity(operational(4), thresholds, now)).toBe("normal");
    expect(monitorWaitSeverity(operational(5), thresholds, now)).toBe("warning");
    expect(monitorWaitSeverity(operational(60), thresholds, now)).toBe("critical");
  });
  it.each(["0", "-1", "NaN", "Infinity", "1.5", "", "525601", "30 minutes"])(
    "falls back safely when a configured value is invalid: %s", (value) => {
      expect(monitorWaitThresholds({ "monitor:wait_warning_minutes": value })).toEqual(DEFAULT_WAIT_THRESHOLDS);
      expect(monitorWaitThresholds({ "monitor:wait_critical_minutes": value })).toEqual(DEFAULT_WAIT_THRESHOLDS);
    },
  );
  it("rejects reversed/equal ranges and accepts a missing endpoint only when consistent", () => {
    expect(monitorWaitThresholds({ "monitor:wait_warning_minutes": "60", "monitor:wait_critical_minutes": "60" })).toEqual(DEFAULT_WAIT_THRESHOLDS);
    expect(monitorWaitThresholds({ "monitor:wait_warning_minutes": "2000" })).toEqual(DEFAULT_WAIT_THRESHOLDS);
    expect(monitorWaitThresholds({ "monitor:wait_critical_minutes": "60" })).toEqual({ warningMinutes: 30, criticalMinutes: 60 });
  });
  it("colors only a customer waiting for an agent, with a valid time", () => {
    for (const status of ["waiting_customer", "in_progress", "finished", "scheduled"] as const) {
      expect(monitorWaitSeverity({ ...operational(3000), status }, DEFAULT_WAIT_THRESHOLDS, now)).toBeNull();
    }
    expect(monitorWaitSeverity({ status: "waiting_agent", waitingSince: "invalid" }, DEFAULT_WAIT_THRESHOLDS, now)).toBeNull();
    expect(monitorWaitSeverity(undefined, DEFAULT_WAIT_THRESHOLDS, now)).toBeNull();
    expect(monitorWaitSeverity(operational(-5), DEFAULT_WAIT_THRESHOLDS, now)).toBe("normal");
  });
});
