import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { civilScheduleValue, scheduleChanges, scheduleOutcomeUnknown } from "./schedule-edit";
import type { TelephonyScheduleDetail } from "./types";

const detail: TelephonyScheduleDetail = {
  id: 7,
  customer: { id: 70, name: "Cliente" },
  campaign: null,
  scheduledAt: "2026-10-20T00:15:42",
  operatorId: 4,
  operatorName: "Operador atual",
  version: "version-1",
  editable: true,
  blockedReason: null,
  capabilities: { priority: false, validity: false },
};

describe("draft of an individual CRM schedule", () => {
  it("preserves the civil day, midnight and existing seconds without timezone conversion", () => {
    expect(scheduleChanges(detail, "2026-10-21T00:15", 4)).toEqual({
      scheduledAt: "2026-10-21T00:15:00",
    });
    expect(scheduleChanges(detail, detail.scheduledAt!, 8)).toEqual({ operatorId: 8 });
    expect(scheduleChanges(detail, detail.scheduledAt!, 4)).toEqual({});
    expect(
      scheduleChanges({ ...detail, scheduledAt: "2026-10-21T00:15:00" }, "2026-10-21T00:15", 4),
    ).toEqual({});
  });

  it("leaves legacy absent values untouched and does not invent defaults", () => {
    expect(scheduleChanges({ ...detail, scheduledAt: null }, "", 8)).toEqual({ operatorId: 8 });
    expect(scheduleChanges({ ...detail, operatorId: null }, "2026-10-21T00:15", null)).toEqual({
      scheduledAt: "2026-10-21T00:15:00",
    });
    expect(() => scheduleChanges(detail, "", 4)).toThrow("não pode ser removida");
    expect(() => scheduleChanges(detail, detail.scheduledAt!, null)).toThrow(
      "Selecione um operador",
    );
  });

  it("rejects impossible dates, timezone strings and invalid destinations", () => {
    for (const value of [
      "2026-02-29T12:00",
      "2024-02-30T12:00",
      "2026-13-01T12:00",
      "2026-10-20T24:00",
      "2026-10-20T12:00Z",
      "2026-10-20T12:00:00-03:00",
    ])
      expect(civilScheduleValue(value)).toBeNull();
    expect(civilScheduleValue("2024-02-29T23:59:59")).toBe("2024-02-29T23:59:59");
    for (const operatorId of [0, -1, 1.2, NaN])
      expect(() => scheduleChanges(detail, detail.scheduledAt!, operatorId)).toThrow(
        "Selecione um operador",
      );
  });

  it("keeps lost responses and server errors uncertain, including wrapped Axios failures", () => {
    expect(scheduleOutcomeUnknown(new Error("Network Error"))).toBe(true);
    for (const status of [400, 401, 403, 409, 422, 429, 503]) {
      const cause = new AxiosError("failed", undefined, undefined, undefined, { status } as never);
      expect(scheduleOutcomeUnknown(new Error("failed", { cause }))).toBe(status === 503);
    }
  });

  it("allows manual correction only for explicit server responses confirming no write", () => {
    for (const [code, unknown] of [
      ["SCHEDULE_EDIT_UNAVAILABLE", false],
      ["SCHEDULE_EDIT_NOT_COMMITTED", false],
      ["SCHEDULE_EDIT_UNKNOWN", true],
      ["UNKNOWN", true],
      ["UNRECOGNIZED_FAILURE", true],
      [undefined, true],
    ] as const) {
      const cause = new AxiosError("failed", undefined, undefined, undefined, {
        status: 503,
        data: { code },
      } as never);
      expect(scheduleOutcomeUnknown(cause)).toBe(unknown);
      expect(scheduleOutcomeUnknown(new Error("failed", { cause }))).toBe(unknown);
    }
  });
});
