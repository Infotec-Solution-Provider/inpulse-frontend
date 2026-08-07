import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HybridCache } from "./hybrid-cache";

describe("HybridCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("isolates values by session scope and clears only the selected scope", async () => {
    const cache = new HybridCache();
    await cache.set("tenant:1", "users", [{ id: 1 }]);
    await cache.set("tenant:2", "users", [{ id: 2 }]);

    expect(await cache.get("tenant:1", "users")).toEqual([{ id: 1 }]);
    expect(await cache.get("tenant:2", "users")).toEqual([{ id: 2 }]);

    await cache.clearScope("tenant:1");
    expect(await cache.get("tenant:1", "users")).toBeNull();
    expect(await cache.get("tenant:2", "users")).toEqual([{ id: 2 }]);
  });

  it("invalidates every cached page of a mutated resource", async () => {
    const cache = new HybridCache();
    await cache.set("tenant:mutation", "contact-page", [{ id: 1 }], "page:1");
    await cache.set("tenant:mutation", "contact-page", [{ id: 2 }], "page:2");
    await cache.set("tenant:mutation", "channels", [{ id: 9 }]);

    await cache.invalidateResource("tenant:mutation", "contact-page");

    expect(await cache.get("tenant:mutation", "contact-page", "page:1")).toBeNull();
    expect(await cache.get("tenant:mutation", "contact-page", "page:2")).toBeNull();
    expect(await cache.get("tenant:mutation", "channels")).toEqual([{ id: 9 }]);
  });

  it("expires records after five minutes", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-07-31T12:00:00Z").getTime());
    const cache = new HybridCache();
    await cache.set("tenant:expiry", "contacts", [{ id: 1 }]);

    now.mockReturnValue(new Date("2026-07-31T12:05:01Z").getTime());
    expect(await cache.get("tenant:expiry", "contacts")).toBeNull();
  });

  it("refuses resources outside the persistence allowlist", async () => {
    const cache = new HybridCache();
    await cache.set("tenant:safety", "messages" as never, [{ body: "secret" }]);
    expect(await cache.get("tenant:safety", "messages" as never)).toBeNull();
  });

  it("refuses sensitive fields even inside an allowlisted resource", async () => {
    const cache = new HybridCache();
    await cache.set("tenant:safety", "users", [{ CODIGO: 1, SENHA: "secret" }]);
    await cache.set("tenant:safety", "contacts", [{ id: 1, messages: [{ id: 10 }] }]);
    await cache.set("tenant:safety", "parameters", { token: "secret" });

    expect(await cache.get("tenant:safety", "users")).toBeNull();
    expect(await cache.get("tenant:safety", "contacts")).toBeNull();
    expect(await cache.get("tenant:safety", "parameters")).toBeNull();
  });

  it("ignores a corrupt payload and leaves the API as fallback", async () => {
    const cache = new HybridCache();
    await cache.set("tenant:corrupt", "contacts", undefined as never);
    expect(await cache.get("tenant:corrupt", "contacts")).toBeNull();
  });

  it("falls back without throwing when IndexedDB is unavailable", async () => {
    const original = globalThis.indexedDB;
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: undefined });
    const cache = new HybridCache();
    await expect(cache.set("tenant:none", "users", [])).resolves.toBeUndefined();
    await expect(cache.get("tenant:none", "users")).resolves.toBeNull();
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: original });
  });

  it("keeps the complete API flow available when the rollout flag is disabled", async () => {
    const previous = process.env.NEXT_PUBLIC_HYBRID_CACHE_ENABLED;
    process.env.NEXT_PUBLIC_HYBRID_CACHE_ENABLED = "false";
    const cache = new HybridCache();

    await expect(cache.set("tenant:rollback", "users", [{ id: 1 }])).resolves.toBeUndefined();
    expect(await cache.get("tenant:rollback", "users")).toBeNull();

    if (previous === undefined) delete process.env.NEXT_PUBLIC_HYBRID_CACHE_ENABLED;
    else process.env.NEXT_PUBLIC_HYBRID_CACHE_ENABLED = previous;
  });

  it("falls back without throwing when the quota rejects a write", async () => {
    const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const cache = new HybridCache();

    await expect(cache.set("tenant:quota", "contacts", [{ id: 1 }])).resolves.toBeUndefined();
    expect(await cache.get("tenant:quota", "contacts")).toBeNull();
    put.mockRestore();
  });
});
