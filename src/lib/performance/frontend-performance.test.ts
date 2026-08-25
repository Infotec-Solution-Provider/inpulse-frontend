import { describe, expect, it } from "vitest";
import {
  normalizeTelemetryRoute,
  sanitizeTelemetryError,
  shouldCollectDetailedMetrics,
  telemetryErrorFingerprint,
} from "./frontend-performance";

const device = {
  browser: "Chrome 140",
  hardwareConcurrency: 8,
  deviceMemoryGb: 8,
  effectiveType: "4g",
  viewportWidth: 1366,
  viewportHeight: 768,
};

describe("frontend performance telemetry privacy", () => {
  it("normalizes tenant, identifiers and query strings", () => {
    expect(normalizeTelemetryRoute("/acme/contacts/123?phone=555199999999")).toBe(
      "/:instance/contacts/:id",
    );
    expect(normalizeTelemetryRoute("https://example.test/api/chats/42?token=secret")).toBe(
      "/api/chats/:id",
    );
  });

  it("redacts sensitive values from errors", () => {
    expect(
      sanitizeTelemetryError(
        new Error(
          "Request for user@example.com and +55 (51) 99999-9999 failed at https://host/path?q=1",
        ),
      ),
    ).toBe("Request for [email] and [number] failed at [url]");
  });

  it("creates stable fingerprints without retaining source values", () => {
    expect(telemetryErrorFingerprint("TypeError", "failed", "at app.js:1")).toBe(
      telemetryErrorFingerprint("TypeError", "failed", "at app.js:1"),
    );
  });
});

describe("detailed telemetry sampling", () => {
  it("always includes low-end devices", () => {
    expect(shouldCollectDetailedMetrics({ ...device, hardwareConcurrency: 4 }, 0.99)).toBe(true);
    expect(shouldCollectDetailedMetrics({ ...device, deviceMemoryGb: 4 }, 0.99)).toBe(true);
  });

  it("samples ten percent of standard devices", () => {
    expect(shouldCollectDetailedMetrics(device, 0.09)).toBe(true);
    expect(shouldCollectDetailedMetrics(device, 0.1)).toBe(false);
  });

  it("samples twenty-five percent when hardware is unknown", () => {
    const unknown = { ...device, hardwareConcurrency: null, deviceMemoryGb: null };
    expect(shouldCollectDetailedMetrics(unknown, 0.24)).toBe(true);
    expect(shouldCollectDetailedMetrics(unknown, 0.25)).toBe(false);
  });
});
