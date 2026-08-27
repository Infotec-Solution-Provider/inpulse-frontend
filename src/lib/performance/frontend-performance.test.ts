import { describe, expect, it } from "vitest";
import {
  createTelemetryErrorTags,
  isReusableTelemetrySession,
  normalizeTelemetryResourceEndpoint,
  normalizeTelemetryRoute,
  normalizeTelemetryTotalPerMinute,
  sanitizeTelemetryError,
  shouldCollectDetailedMetrics,
  summarizeTelemetryFrames,
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
    expect(normalizeTelemetryRoute("/api/customer/Maria_private?token=secret")).toBe(
      "/api/customer/:value",
    );
    expect(normalizeTelemetryRoute("/api/customer-acme/query")).toBe("/api/:value/query");
    expect(normalizeTelemetryRoute("/api/instances/acme/query", "acme")).toBe(
      "/api/instances/:instance/query",
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

  it("persists only an error type and fingerprint", () => {
    const tags = createTelemetryErrorTags(
      new Error("Falha ao processar a mensagem secreta de Maria em +55 51 99999-9999"),
    );
    expect(tags.errorName).toBe("Error");
    expect(tags.errorFingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(tags.errorCategory).toBe("runtime");
    expect(tags).not.toHaveProperty("errorMessage");
    expect(tags).not.toHaveProperty("topFrame");
    expect(JSON.stringify(tags)).not.toContain("Maria");
    expect(JSON.stringify(tags)).not.toContain("mensagem secreta");
  });

  it("adds only enumerated diagnostic context to errors", () => {
    const error = Object.assign(new Error("Network request failed for Maria"), {
      code: "ERR_NETWORK",
    });
    const tags = createTelemetryErrorTags(error, {
      source: "file_send",
      phase: "file_upload_chunk",
    });
    expect(tags).toMatchObject({
      errorName: "Error",
      errorCategory: "network",
      errorSource: "file_send",
      errorCode: "ERR_NETWORK",
      phase: "file_upload_chunk",
    });
    expect(JSON.stringify(tags)).not.toContain("Maria");
  });

  it("does not derive the fingerprint from a potentially private message", () => {
    const first = new Error("Falha com a cliente Maria");
    const second = new Error("Falha com a cliente Joana");
    first.stack = "Error\n    at shared-handler.ts:10:2";
    second.stack = first.stack;
    expect(createTelemetryErrorTags(first).errorFingerprint).toBe(
      createTelemetryErrorTags(second).errorFingerprint,
    );
  });

  it("rejects a custom error name that could contain personal data", () => {
    const error = new Error("Falha");
    error.name = "Erro da Maria 555199999999";
    expect(createTelemetryErrorTags(error).errorName).toBe("Error");
  });

  it("categorizes non-API resources without persisting filenames", () => {
    const endpoint = normalizeTelemetryResourceEndpoint(
      "https://files.example.com/public/acme/files/contrato-maria.pdf?token=secret",
      "img",
    );
    expect(endpoint).toBe("/api/browser-resource/img");
    expect(endpoint).not.toContain("maria");
    expect(endpoint).not.toContain("acme");
  });
});

describe("pseudonymous telemetry sessions", () => {
  const persistedSession = {
    sessionId: "3d594650-3436-4c41-9360-3bf64af50f1a",
    startedAt: "2026-08-27T12:00:00.000Z",
    device,
    detailed: true,
  };

  it("reuses a valid tab session for up to 24 hours", () => {
    expect(
      isReusableTelemetrySession(persistedSession, Date.parse("2026-08-28T11:59:59.000Z")),
    ).toBe(true);
  });

  it("rotates expired or malformed session identifiers", () => {
    expect(
      isReusableTelemetrySession(persistedSession, Date.parse("2026-08-28T12:00:00.000Z")),
    ).toBe(false);
    expect(isReusableTelemetrySession({ ...persistedSession, sessionId: "customer-maria" })).toBe(
      false,
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

describe("runtime metric aggregation", () => {
  it("normalizes long-task time to one minute", () => {
    expect(normalizeTelemetryTotalPerMinute(150, 30_000)).toBe(300);
  });

  it("calculates frame rate and jank ratio for the sampling window", () => {
    expect(summarizeTelemetryFrames(300, 6, 5_000)).toEqual({
      frameRate: 60,
      jankRatio: 0.02,
    });
  });
});
