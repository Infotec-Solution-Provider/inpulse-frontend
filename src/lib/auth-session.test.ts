import { afterEach, describe, expect, it, vi } from "vitest";
import { authSession } from "./auth-session";

function tokenExpiringAt(timestamp: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(timestamp / 1000) })).toString("base64url");
  return `header.${payload}.signature`;
}

afterEach(() => {
  authSession.clearConfiguration();
  vi.restoreAllMocks();
});

describe("AuthSessionCoordinator", () => {
  it("shares one refresh across concurrent callers", async () => {
    const refresh = vi.fn(async () => tokenExpiringAt(Date.now() + 900_000));
    authSession.configure({ instance: "tenant-a", refresh, onInvalid: vi.fn() });

    const tokens = await Promise.all([
      authSession.forceRefresh(),
      authSession.forceRefresh(),
      authSession.forceRefresh(),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(new Set(tokens).size).toBe(1);
  });

  it("discards a refresh response that arrives after the session was cleared", async () => {
    const newToken = tokenExpiringAt(Date.now() + 900_000);
    let resolveRefresh!: (token: string) => void;
    const refresh = vi.fn(() => new Promise<string>((resolve) => {
      resolveRefresh = resolve;
    }));
    authSession.configure({ instance: "tenant-a", refresh, onInvalid: vi.fn() });

    const pendingRefresh = authSession.forceRefresh();
    authSession.clearConfiguration();
    resolveRefresh(newToken);

    await expect(pendingRefresh).rejects.toThrow("authentication session changed");
    expect(authSession.getAccessToken()).toBeNull();
  });

  it("refreshes and retries fetch once after a 401", async () => {
    const oldToken = tokenExpiringAt(Date.now() + 900_000);
    const newToken = tokenExpiringAt(Date.now() + 1_800_000);
    const refresh = vi.fn(async () => newToken);
    authSession.configure({ instance: "tenant-a", refresh, onInvalid: vi.fn() });
    authSession.setAccessToken(oldToken);

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const response = await authSession.fetch("https://example.test/data");
    expect(response.status).toBe(200);
    expect(refresh).toHaveBeenCalledTimes(1);
    const retryHeaders = new Headers(fetchMock.mock.calls[1]![1]?.headers);
    expect(retryHeaders.get("Authorization")).toBe(`Bearer ${newToken}`);
  });
});
