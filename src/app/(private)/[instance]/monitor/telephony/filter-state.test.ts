import { describe, expect, it } from "vitest";
import {
  createTelephonyFilters,
  reconcileTelephonyGeography,
  restoreTelephonyPreferences,
  serializeTelephonyPreferences,
  telephonyStorageKey,
} from "./filter-state";
import { telephonyApiFilters } from "./api-filters";

describe("telephony filter preferences", () => {
  it("isolates each view, tenant and user without persisting selected customer or precise location", () => {
    const keys = [
      telephonyStorageKey("a", 1, "calls"),
      telephonyStorageKey("a", 2, "calls"),
      telephonyStorageKey("b", 1, "calls"),
      telephonyStorageKey("a", 1, "schedules"),
    ];
    expect(new Set(keys).size).toBe(4);
    const filters = {
      ...createTelephonyFilters("unscheduled"),
      searchText: "customer secret",
      customerId: 123,
      states: ["RS"],
      cities: ['["RS","Porto Alegre"]'],
      neighborhoods: ['["RS","Porto Alegre","Centro"]'],
      campaignIds: [7],
    };
    const encoded = serializeTelephonyPreferences({ filters, pageSize: 50, autoRefresh: false });
    expect(encoded).not.toContain("customer secret");
    expect(encoded).not.toContain("Porto Alegre");
    expect(restoreTelephonyPreferences(encoded, "unscheduled")).toMatchObject({
      filters: {
        customerId: null,
        searchText: "",
        states: ["RS"],
        cities: [],
        neighborhoods: [],
        campaignIds: [7],
      },
      pageSize: 50,
      autoRefresh: false,
    });
  });

  it("discards invalid civil dates, inverted ranges, invalid months and oversized catalog selections", () => {
    const restored = restoreTelephonyPreferences(
      JSON.stringify({
        filters: {
          mode: "calls",
          searchText: "old secret",
          scheduledAt: { from: "2026-02-30", to: "2026-13-01" },
          calledAt: { from: "2026-09-26", to: "2026-09-25" },
          referenceMonth: "0001-01",
          campaignIds: Array.from({ length: 120 }, (_, index) => index + 1),
        },
      }),
      "schedules",
    );
    expect(restored.filters).toMatchObject({
      mode: "schedules",
      searchText: "",
      scheduledAt: { from: null, to: null },
      calledAt: { from: null, to: null },
    });
    expect(restored.filters.referenceMonth).not.toBe("0001-01");
    expect(restored.filters.campaignIds).toHaveLength(100);
  });

  it("starts the calls view on the current month and falls back to it instead of no period", () => {
    const now = new Date(2024, 1, 10);
    expect(createTelephonyFilters("calls", now).calledAt).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
    expect(createTelephonyFilters("schedules", now).calledAt).toEqual({ from: null, to: null });
    const month = createTelephonyFilters("calls").calledAt;
    expect(restoreTelephonyPreferences(JSON.stringify({ filters: {} }), "calls").filters.calledAt).toEqual(
      month,
    );
    expect(
      restoreTelephonyPreferences(
        JSON.stringify({ filters: { calledAt: { from: "2200-01-01", to: null } } }),
        "calls",
      ).filters.calledAt,
    ).toEqual(month);
    expect(
      restoreTelephonyPreferences(
        JSON.stringify({ filters: { calledAt: { from: "2026-08-01", to: "2026-08-31" } } }),
        "calls",
      ).filters.calledAt,
    ).toEqual({ from: "2026-08-01", to: "2026-08-31" });
  });

  it("distinguishes same-name cities and removes invalid or incompatible descendants", () => {
    const filters = reconcileTelephonyGeography({
      ...createTelephonyFilters("calls"),
      states: ["RS"],
      cities: ['["RS","Santa Maria"]', '["SP","Santa Maria"]', '"RS"', "{}", '["RS",null]'],
      neighborhoods: [
        '["RS","Santa Maria","Centro"]',
        '["RS","Porto Alegre","Centro"]',
        '["SP","Santa Maria","Centro"]',
        '["RS","Santa Maria"]',
      ],
    });
    expect(filters.cities).toEqual(['["RS","Santa Maria"]']);
    expect(filters.neighborhoods).toEqual(['["RS","Santa Maria","Centro"]']);
  });

  it("preserves valid legacy options with incomplete geographic parents", () => {
    const filters = reconcileTelephonyGeography({
      ...createTelephonyFilters("calls"),
      cities: ['["","Cidade sem UF"]'],
      neighborhoods: ['["","Cidade sem UF","Centro"]'],
    });
    expect(filters.cities).toEqual(['["","Cidade sem UF"]']);
    expect(filters.neighborhoods).toEqual(['["","Cidade sem UF","Centro"]']);
    const restored = restoreTelephonyPreferences(
      JSON.stringify({ filters: { states: ["LEGADO", "rs"] } }),
      "calls",
    );
    expect(restored.filters.states).toEqual(["LEGADO", "rs"]);
  });
});

describe("telephony civil period contract", () => {
  it("includes the complete selected local day and leap-year reference month", () => {
    const filters = {
      ...createTelephonyFilters("schedules"),
      referenceMonth: "2024-02",
      scheduledAt: { from: "2026-09-25", to: "2026-09-25" },
    };
    const wire = telephonyApiFilters(filters);
    expect(wire.scheduledAt).toEqual({
      from: new Date(2026, 8, 25).toISOString(),
      to: new Date(2026, 8, 25, 23, 59, 59, 999).toISOString(),
    });
    expect(wire.referencePeriod).toEqual({
      from: new Date(2024, 1, 1).toISOString(),
      to: new Date(2024, 1, 29, 23, 59, 59, 999).toISOString(),
    });
    expect(filters.scheduledAt.to).toBe("2026-09-25");
  });

  it("rejects rolled dates, inverted ranges, invalid month years and >100 options before HTTP", () => {
    const initial = createTelephonyFilters("calls");
    for (const from of [
      "2026-02-30",
      "2026-13-01",
      "2026-09-25T25:00",
      "0001-01-01",
      "arbitrary",
    ]) {
      expect(() => telephonyApiFilters({ ...initial, calledAt: { from, to: null } })).toThrow(
        "período válido",
      );
    }
    expect(() =>
      telephonyApiFilters({ ...initial, lastContactAt: { from: "2026-09-26", to: "2026-09-25" } }),
    ).toThrow("anterior");
    for (const referenceMonth of ["0001-01", "1969-12", "2201-01", "2026-13"])
      expect(() => telephonyApiFilters({ ...initial, referenceMonth })).toThrow("1970");
    expect(() =>
      telephonyApiFilters({
        ...initial,
        campaignIds: Array.from({ length: 101 }, (_, index) => index + 1),
      }),
    ).toThrow("100 opções");
  });
});
