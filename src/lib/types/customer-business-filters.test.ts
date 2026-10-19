import { describe, expect, it } from "vitest";
import { countCustomerBusinessFilters, createEmptyCustomerBusinessFilters, serializeCustomerBusinessFilters } from "./customer-business-filters";
describe("advanced customer filter serialization", () => {
  it("preserves old filters and includes all new catalogs without serializing empty values", () => {
    const filters = { ...createEmptyCustomerBusinessFilters(), groupIds: [2,3], originIds: [4], mediaIds: [5], unitIds: [6], brandIds: [7], positionIds: [8], states: ["SP","RS"], phone: " 11999991234 ", email: " @test.local ", segmentIds: [9], campaignIds: [10] };
    expect(serializeCustomerBusinessFilters(filters)).toEqual({ groupIds:"2,3", originIds:"4", mediaIds:"5", unitIds:"6", brandIds:"7", positionIds:"8", states:"SP,RS",phone:"11999991234",email:"@test.local",segmentIds:"9",campaignIds:"10" });
    expect(countCustomerBusinessFilters(filters)).toBe(11);
    expect(serializeCustomerBusinessFilters(createEmptyCustomerBusinessFilters())).toEqual({});
  });
  it("never sends contradictory purchase dates with the no purchases option", () => {
    const filters = { ...createEmptyCustomerBusinessFilters(), purchaseStatus:"without_purchases" as const, purchaseFrom:"2026-10-01",purchaseTo:"2026-10-19" };
    expect(serializeCustomerBusinessFilters(filters)).toEqual({ purchaseStatus:"without_purchases" });
  });
});
