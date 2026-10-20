import { describe, expect, it } from "vitest";
import type { WppContactWithCustomer } from "@/lib/sdk-local";
import {
  audienceContactSelected,
  audienceSelectionCounts,
  buildAudienceDefinition,
  contactIsEligible,
  emptyAudienceFilters,
  emptyAudienceSelection,
  normalizeAudienceFilters,
  reconcileAudienceIds,
  reconcileAudiencePage,
  selectAudiencePage,
  toggleAudienceContact,
  validateAudienceFilters,
} from "./mass-audience";

const contact = (id: number, phone: string | null = "5511999999999", isBlocked = false) =>
  ({ id, phone, isBlocked }) as WppContactWithCustomer;
describe("mass audience selection", () => {
  it("starts empty and manual selection never implies every filtered contact", () => {
    const selection = toggleAudienceContact(emptyAudienceSelection(), 7, true);
    expect(buildAudienceDefinition(emptyAudienceFilters(), selection)).toEqual({
      filtersJson: { version: 2, selectionMode: "MANUAL", contactFilters: {}, customerFilters: {} },
      manualIncludeJson: { contactIds: [7] },
      manualExcludeJson: { contactIds: [] },
    });
    expect(audienceContactSelected(selection, 8)).toBe(false);
  });
  it("selects eligible page rows and preserves earlier pages", () => {
    const first = selectAudiencePage(
      emptyAudienceSelection(),
      [contact(1), contact(2, null), contact(3, "5511", true)],
      true,
    );
    const second = selectAudiencePage(first, [contact(9)], true);
    expect(Object.keys(second.included)).toEqual(["1", "9"]);
    expect(Object.keys(selectAudiencePage(second, [contact(1)], false).included)).toEqual(["9"]);
  });
  it("keeps metadata for manual selections outside the visible page", () => {
    const selection = selectAudiencePage(emptyAudienceSelection(), [contact(1), contact(9)], true);
    const updated = reconcileAudiencePage(selection, [contact(1, "5511", true)]);
    expect(
      audienceSelectionCounts(updated, { total: 50, eligible: 48, blocked: 1, skipped: 1 }),
    ).toEqual({ selected: 2, eligible: 1 });
    expect(audienceContactSelected(updated, 9)).toBe(true);
    expect(toggleAudienceContact(updated, 1, false).included).toEqual({ 9: true });
  });
  it("all filtered stores only exceptions and separates selected and eligible totals", () => {
    let selection = { ...emptyAudienceSelection(), mode: "ALL_FILTERED" as const };
    selection = toggleAudienceContact(selection, 8, true) as typeof selection;
    selection = toggleAudienceContact(selection, 2, false) as typeof selection;
    expect(
      audienceSelectionCounts(selection, { total: 1000, eligible: 990, blocked: 9, skipped: 1 }),
    ).toEqual({ selected: 998, eligible: 989 });
    expect(
      buildAudienceDefinition(emptyAudienceFilters(), selection).manualIncludeJson.contactIds,
    ).toEqual([]);
    expect(
      buildAudienceDefinition(emptyAudienceFilters(), selection).manualExcludeJson.contactIds,
    ).toEqual([2, 8]);
    expect(audienceContactSelected(selection, 950)).toBe(true);
  });
  it("unselecting and reselecting a page updates exceptions without materializing all IDs", () => {
    const all = { ...emptyAudienceSelection(), mode: "ALL_FILTERED" as const };
    const cleared = selectAudiencePage(all, [contact(1), contact(2)], false);
    expect(cleared.excluded).toEqual({ 1: true, 2: true });
    expect(selectAudiencePage(cleared, [contact(1)], true).excluded).toEqual({ 2: true });
  });
  it("revalidates exceptions outside the page without reintroducing IDs if they temporarily stop matching", () => {
    let selected = { ...emptyAudienceSelection(), mode: "ALL_FILTERED" as const };
    selected = toggleAudienceContact(selected, 90, true) as typeof selected;
    selected = toggleAudienceContact(selected, 91, true) as typeof selected;
    const refreshed = reconcileAudienceIds(selected, [90, 91], [contact(91, "5511", true)]);
    expect(
      audienceSelectionCounts(refreshed, { total: 99, eligible: 97, blocked: 1, skipped: 1 }),
    ).toEqual({ selected: 98, eligible: 97 });
    expect(
      buildAudienceDefinition(emptyAudienceFilters(), refreshed).manualExcludeJson.contactIds,
    ).toEqual([90, 91]);
    const returned = reconcileAudienceIds(refreshed, [90, 91], [contact(90), contact(91)]);
    expect(audienceContactSelected(returned, 90)).toBe(false);
    expect(
      audienceSelectionCounts(returned, { total: 100, eligible: 99, blocked: 0, skipped: 1 }),
    ).toEqual({ selected: 98, eligible: 97 });
  });
  it("removes empty criteria without discarding false or zero before validation", () => {
    expect(
      normalizeAudienceFilters({
        contactFilters: { name: undefined, hasCustomer: false, sectorIds: [] },
        customerFilters: { CIDADE: "" },
      }),
    ).toEqual({ contactFilters: { hasCustomer: false }, customerFilters: {} });
  });
  it("eligibility accepts a digit and rejects blocked, missing and punctuation-only phones", () => {
    expect(contactIsEligible(contact(1, "+5"))).toBe(true);
    expect(contactIsEligible(contact(1, null))).toBe(false);
    expect(contactIsEligible(contact(1, "+ ()"))).toBe(false);
    expect(contactIsEligible(contact(1, "5511", true))).toBe(false);
  });
  it("validates date ranges and client phone while allowing an empty AND combination", () => {
    expect(
      validateAudienceFilters({
        contactFilters: { hasCustomer: false },
        customerFilters: { CIDADE: "Canoas" },
      }),
    ).toBeNull();
    expect(validateAudienceFilters({ contactFilters: { id: 0 }, customerFilters: {} })).toMatch(
      /código/,
    );
    expect(
      validateAudienceFilters({ contactFilters: {}, customerFilters: { phone: "(12)" } }),
    ).toMatch(/três/);
    expect(
      validateAudienceFilters({
        contactFilters: {},
        customerFilters: { registeredFrom: "2026-10-19", registeredTo: "2026-10-01" },
      }),
    ).toMatch(/data/);
  });
});
