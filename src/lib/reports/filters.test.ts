import { describe, expect, it } from "vitest";
import {
  civilDate,
  csvContent,
  defaultReportPeriod,
  previousReportPeriod,
  reportPeriodShortcut,
  validateReportPeriod,
} from "./filters";

describe("report civil dates", () => {
  it("validates real dates, required boundaries and ordering before requesting data", () => {
    expect(validateReportPeriod({ startDate: "2026-02-29", endDate: "2026-03-01" })).toBeTruthy();
    expect(validateReportPeriod({ startDate: "", endDate: "2026-03-01" })).toBeTruthy();
    expect(validateReportPeriod({ startDate: "2026-03-02", endDate: "2026-03-01" })).toBeTruthy();
    expect(validateReportPeriod({ startDate: "2024-02-29", endDate: "2024-02-29" })).toBeNull();
  });
  it("uses local civil dates for today and calendar arithmetic for shortcuts", () => {
    const now = new Date(2026, 10, 17, 23, 45);
    expect(civilDate(now)).toBe("2026-11-17");
    expect(defaultReportPeriod(now)).toEqual({ startDate: "2026-11-01", endDate: "2026-11-17" });
    expect(reportPeriodShortcut("last7", now)).toEqual({
      startDate: "2026-11-11",
      endDate: "2026-11-17",
    });
    expect(reportPeriodShortcut("previousMonth", new Date(2026, 0, 31))).toEqual({
      startDate: "2025-12-01",
      endDate: "2025-12-31",
    });
    expect(reportPeriodShortcut("yesterday", new Date(2026, 0, 1))).toEqual({
      startDate: "2025-12-31",
      endDate: "2025-12-31",
    });
  });
  it("compares an inclusive interval to the preceding interval of equal duration across year/leap boundaries", () => {
    expect(previousReportPeriod({ startDate: "2026-01-01", endDate: "2026-01-01" })).toEqual({
      startDate: "2025-12-31",
      endDate: "2025-12-31",
    });
    expect(previousReportPeriod({ startDate: "2024-03-01", endDate: "2024-03-02" })).toEqual({
      startDate: "2024-02-28",
      endDate: "2024-02-29",
    });
  });
});

it("exports accented text, quoted separators and numerical values without spreadsheet formulas", () => {
  const csv = csvContent(
    ["Operador", "Total"],
    [
      ['João; "Teste"', 7],
      ["=SOMA(1;1)", -2],
    ],
  );
  expect(csv).toContain('"João; ""Teste""";"7"');
  expect(csv).toContain('"\'=SOMA(1;1)";"-2"');
});
