import { describe, expect, it } from "vitest";
import { createTelephonyFilters } from "../filter-state";
import { applyLookupSelection, selectedLookupIds } from "./lookup-fields";

describe("telephony lookup selections", () => {
  it("retains only cities and neighborhoods in the confirmed states", () => {
    const filters = {
      ...createTelephonyFilters("schedules"),
      states: ["SC", "RS"],
      cities: [JSON.stringify(["SC", "Bom Jesus"]), JSON.stringify(["RS", "Bom Jesus"])],
      neighborhoods: [
        JSON.stringify(["SC", "Bom Jesus", "Centro"]),
        JSON.stringify(["RS", "Bom Jesus", "Centro"]),
      ],
    };
    const next = applyLookupSelection(filters, "states", [{ id: "SC", label: "Santa Catarina" }]);
    expect(next.cities).toEqual([JSON.stringify(["SC", "Bom Jesus"])]);
    expect(next.neighborhoods).toEqual([JSON.stringify(["SC", "Bom Jesus", "Centro"])]);
    expect(filters.states).toEqual(["SC", "RS"]);
  });

  it("clears dependent geography without dropping unrelated draft filters", () => {
    const filters = {
      ...createTelephonyFilters("schedules"),
      searchText: "Cliente em edição",
      campaignIds: [9],
      states: ["SC"],
      cities: [JSON.stringify(["SC", "Blumenau"])],
      neighborhoods: [JSON.stringify(["SC", "Blumenau", "Centro"])],
    };
    expect(applyLookupSelection(filters, "states", [])).toMatchObject({
      searchText: "Cliente em edição",
      campaignIds: [9],
      states: [],
      cities: [],
      neighborhoods: [],
    });
  });

  it("distinguishes identically named cities when retaining neighborhoods", () => {
    const filters = {
      ...createTelephonyFilters("schedules"),
      states: ["SC", "RS"],
      neighborhoods: [
        JSON.stringify(["SC", "Bom Jesus", "Centro"]),
        JSON.stringify(["RS", "Bom Jesus", "Centro"]),
      ],
    };
    const next = applyLookupSelection(filters, "cities", [
      { id: JSON.stringify(["RS", "Bom Jesus"]), label: "Bom Jesus / RS" },
    ]);
    expect(next.neighborhoods).toEqual([JSON.stringify(["RS", "Bom Jesus", "Centro"])]);
  });

  it("keeps product codes as strings and clears single selections to null", () => {
    let filters = applyLookupSelection(createTelephonyFilters("calls"), "products", [
      { id: "00123", label: "Produto" },
    ]);
    expect(selectedLookupIds(filters, "products")).toEqual(["00123"]);
    filters = applyLookupSelection(filters, "customers", [{ id: "52", label: "Cliente" }]);
    expect(filters.customerId).toBe(52);
    expect(applyLookupSelection(filters, "customers", []).customerId).toBeNull();
  });
});
