import { afterEach, describe, expect, it, vi } from "vitest";
import { bootstrapAdminSession, canOpenAdminConsole } from "./access";
afterEach(() => vi.unstubAllGlobals());
describe("administration discovery and bootstrap", () => {
  it("allows every infotec administrator without login or numeric ID exceptions", () => {
    expect(canOpenAdminConsole("infotec", "ADMIN")).toBe(true);
    expect(canOpenAdminConsole("other", "ADMIN")).toBe(false);
    expect(canOpenAdminConsole("infotec", "USER")).toBe(false);
    expect(canOpenAdminConsole("infotec", undefined)).toBe(false);
  });
  it("bootstraps once via independent prefix and never puts bearer in the URL", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await bootstrapAdminSession("Bearer actor-token");
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "/infotec/admin/api/session",
      expect.objectContaining({
        method: "POST",
        body: "{}",
        headers: { Authorization: "Bearer actor-token", "Content-Type": "application/json" },
      }),
    );
  });
  it("does not replay a failed bootstrap", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('{"message":"Acesso negado"}', { status: 403 }));
    vi.stubGlobal("fetch", fetch);
    await expect(bootstrapAdminSession("token")).rejects.toThrow("Acesso negado");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
