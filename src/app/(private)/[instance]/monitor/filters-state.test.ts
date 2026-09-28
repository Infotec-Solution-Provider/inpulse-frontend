import { describe, expect, it } from "vitest";
import {
  createInitialFilters,
  monitorStorageKey,
  restoreMonitorPreferences,
  serializeMonitorPreferences,
} from "./filters-state";

describe("monitor preferences", () => {
  it("isolates users and tenants, including identifiers with delimiters", () => {
    const keys = [
      monitorStorageKey("a", 1),
      monitorStorageKey("b", 1),
      monitorStorageKey("a", 2),
      monitorStorageKey("a:1", 2),
      monitorStorageKey("a%3A1", 2),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("restores applied preferences but never persists customer/message search content", () => {
    const filters = {
      ...createInitialFilters(),
      searchText: "sensitive customer",
      user: 17,
      showBots: true,
    };
    const encoded = serializeMonitorPreferences({
      filters,
      pageSize: 50,
      autoRefresh: false,
      viewMode: "compact",
    });
    expect(encoded).not.toContain("sensitive customer");
    expect(restoreMonitorPreferences(encoded)).toMatchObject({
      filters: { searchText: "", user: 17, showBots: true },
      pageSize: 50,
      autoRefresh: false,
      viewMode: "compact",
    });
    expect(
      restoreMonitorPreferences(JSON.stringify({ filters: { searchText: "old unsafe value" } }))
        .filters.searchText,
    ).toBe("");
  });

  it("validates corrupt or older saved state and provides fresh nested defaults", () => {
    const state = restoreMonitorPreferences(
      JSON.stringify({
        filters: {
          categories: { showCustomerChats: "false", showSchedules: false },
          user: -1,
          sortBy: "unknown",
          startedAt: { from: "not-a-date" },
          operationalStatus: "unknown",
        },
        pageSize: 10000,
        autoRefresh: "false",
        viewMode: "unknown",
      }),
    );
    expect(state).toMatchObject({
      pageSize: 100,
      autoRefresh: true,
      viewMode: "cards",
      filters: {
        categories: { showCustomerChats: true, showSchedules: false },
        user: "all",
        sortBy: "urgency",
        startedAt: { from: null, to: null },
        operationalStatus: "all",
      },
    });
    state.filters.categories.showCustomerChats = false;
    expect(restoreMonitorPreferences("invalid").filters.categories.showCustomerChats).toBe(true);
  });
});
