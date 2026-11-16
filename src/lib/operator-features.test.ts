import { describe, expect, it } from "vitest";
import {
  isManagedOperatorTenant,
  isOperatorFeatureDenied,
  operatorFeatureParameters,
  readOperatorFeatures,
} from "./operator-features";
const capability = {
  managed: true,
  instance: "odim",
  operatorId: 534,
  revision: "a".repeat(64),
  features: { operator: true, telephony: true, crm: true, whatsapp: true },
};
describe("server-owned operator feature capabilities", () => {
  it.each(["odim", "ODIM", " ódim ", "o\u200bdim"])(
    "normalizes the protected tenant spelling %s",
    (instance) => expect(isManagedOperatorTenant(instance)).toBe(true),
  );
  it("requires the signed principal and complete booleans/revision", () => {
    expect(readOperatorFeatures(capability, 534).features.crm).toBe(true);
    for (const value of [
      { ...capability, operatorId: 533 },
      { ...capability, instance: "other" },
      { ...capability, managed: false },
      { ...capability, revision: null },
      { ...capability, features: { operator: true } },
      { ...capability, features: { ...capability.features, crm: "true" } },
    ])
      expect(() => readOperatorFeatures(value, 534)).toThrow();
  });
  it("denies Odim while missing or loading regardless of user-level flags", () => {
    const result = operatorFeatureParameters(
      {
        feature_telephony_dialer_enabled: "true",
        customer_detail_edit_enabled: "true",
        feature_crm_customers_enabled: "true",
        unrelated: "keep",
      },
      true,
      null,
    );
    expect(result).toEqual({
      feature_telephony_dialer_enabled: "false",
      customer_detail_edit_enabled: "false",
      feature_crm_customers_enabled: "false",
      unrelated: "keep",
    });
  });
  it("uses only the server's actual feature booleans and preserves other tenants", () => {
    const input = { feature_telephony_dialer_enabled: "false" };
    expect(operatorFeatureParameters(input, false, null)).toBe(input);
    expect(
      operatorFeatureParameters(input, true, readOperatorFeatures(capability, 534))
        .feature_telephony_dialer_enabled,
    ).toBe("true");
    expect(
      operatorFeatureParameters(
        {},
        true,
        readOperatorFeatures(
          {
            ...capability,
            features: { operator: true, telephony: false, crm: false, whatsapp: false },
          },
          534,
        ),
      ),
    ).toMatchObject({
      feature_telephony_dialer_enabled: "false",
      customer_detail_edit_enabled: "false",
    });
  });
  it("recognizes only the definitive server denial, keeping transport uncertainty separate", () => {
    expect(isOperatorFeatureDenied({ status: 403, code: "OPERATOR_FEATURE_PILOT_REQUIRED" })).toBe(
      true,
    );
    expect(isOperatorFeatureDenied({ status: 503, code: "OPERATOR_FEATURE_PILOT_REQUIRED" })).toBe(
      false,
    );
    expect(isOperatorFeatureDenied({ status: 403, code: "OTHER" })).toBe(false);
  });
});
