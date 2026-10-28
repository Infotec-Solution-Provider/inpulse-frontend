import { afterEach, describe, expect, it, vi } from "vitest";
import { frontendRouting } from "../../frontend-routing.config";
import { frontendVersionHref } from "./frontend-versions";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("voluntary frontend transition", () => {
  it("leaves the current root application as the default with the feature disabled", () => {
    expect(frontendRouting({})).toEqual({ basePath: "", env: {
      NEXT_PUBLIC_FRONTEND_BASE_PATH: "", NEXT_PUBLIC_NEW_FRONTEND_ENABLED: "false",
    }, versionRewrites: [] });
  });
  it("proxies only the new application namespace and its assets", () => {
    expect(frontendRouting({ NEW_FRONTEND_ORIGIN: "http://127.0.0.1:3031" }).versionRewrites)
      .toEqual([{ source: "/nova/:path*", destination: "http://127.0.0.1:3031/nova/:path*" }]);
    expect(frontendRouting({ FRONTEND_BASE_PATH: "/nova" }).versionRewrites).toEqual([]);
  });
  it.each(["https://external.example", "http://localhost:3031", "http://127.0.0.1:99999", "http://127.0.0.1:3031/path"])(
    "rejects an unintended proxy destination: %s", (origin) => {
      expect(() => frontendRouting({ NEW_FRONTEND_ORIGIN: origin })).toThrow();
    },
  );
  it("rejects a proxy loop and an unsupported installation path", () => {
    expect(() => frontendRouting({ FRONTEND_BASE_PATH: "/nova", NEW_FRONTEND_ORIGIN: "http://127.0.0.1:3031" })).toThrow();
    expect(() => frontendRouting({ FRONTEND_BASE_PATH: "/another" })).toThrow();
  });
  it("returns to the tenant home because new-only routes may be absent in the old UI", () => {
    expect(frontendVersionHref("exatron", "new")).toBe("/nova/exatron");
    expect(frontendVersionHref("exatron", "legacy")).toBe("/exatron");
    expect(frontendVersionHref("//outside.example?token=secret", "legacy")).toBe("/%2F%2Foutside.example%3Ftoken%3Dsecret");
  });
  it("keeps manifest assets and guarded SPA navigation in their application", async () => {
    vi.stubEnv("NEXT_PUBLIC_FRONTEND_BASE_PATH", "/nova");
    const { frontendAssetPath, frontendNavigationPath } = await import("./frontend-versions");
    expect(frontendAssetPath("/manifest.webmanifest")).toBe("/nova/manifest.webmanifest");
    expect(frontendNavigationPath("/nova/exatron/customers?view=all#record")).toBe("/exatron/customers?view=all#record");
    expect(frontendNavigationPath("/novamente/customers")).toBe("/novamente/customers");
  });
});
