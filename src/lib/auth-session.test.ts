import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authSession } from "./auth-session";

function tokenExpiringAt(timestamp: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(timestamp / 1000) })).toString("base64url");
  return `header.${payload}.signature`;
}

afterEach(() => {
  authSession.clearConfiguration();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AuthSessionCoordinator", () => {
  it("renews a nearly expired token without blocking requests with a still valid token", async () => {
    const currentToken = tokenExpiringAt(Date.now() + 45_000);
    const nextToken = tokenExpiringAt(Date.now() + 900_000);
    let resolveRefresh!: (token: string) => void;
    const refresh = vi.fn(() => new Promise<string>((resolve) => { resolveRefresh = resolve; }));
    authSession.configure({ instance: "tenant-a", refresh, onInvalid: vi.fn() });
    authSession.setAccessToken(currentToken);

    expect(await authSession.tokenForRequest()).toBe(currentToken);
    expect(await authSession.tokenForRequest()).toBe(currentToken);
    expect(refresh).toHaveBeenCalledTimes(1);

    const pendingRefresh = authSession.forceRefresh();
    resolveRefresh(nextToken);
    await pendingRefresh;
    expect(await authSession.tokenForRequest()).toBe(nextToken);
  });

  it("waits for renewal before returning an expired token to a request", async () => {
    const nextToken = tokenExpiringAt(Date.now() + 900_000);
    let resolveRefresh!: (token: string) => void;
    const refresh = vi.fn(() => new Promise<string>((resolve) => { resolveRefresh = resolve; }));
    authSession.configure({ instance: "tenant-a", refresh, onInvalid: vi.fn() });
    authSession.setAccessToken(tokenExpiringAt(Date.now() - 1_000));

    const resolved = vi.fn();
    const requestToken = authSession.tokenForRequest().then(resolved);
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    resolveRefresh(nextToken);
    await requestToken;
    expect(resolved).toHaveBeenCalledWith(nextToken);
  });

  it("keeps a valid session when early renewal fails temporarily", async () => {
    const currentToken = tokenExpiringAt(Date.now() + 45_000);
    const onInvalid = vi.fn();
    const refresh = vi.fn().mockRejectedValue(new Error("network unavailable"));
    authSession.configure({ instance: "tenant-a", refresh, onInvalid });
    authSession.setAccessToken(currentToken);

    expect(await authSession.tokenForRequest()).toBe(currentToken);
    expect(authSession.getAccessToken()).toBe(currentToken);
    expect(onInvalid).not.toHaveBeenCalled();
  });

  it.each([401, 403])("invalidates a session after a definitive refresh failure (%s)", async (status) => {
    const error = new AxiosError("session revoked", undefined, undefined, undefined, {
      status, statusText: "Unauthorized", data: {}, headers: {}, config: { headers: new AxiosHeaders() },
    });
    const onInvalid = vi.fn(() => authSession.clearConfiguration());
    authSession.configure({ instance: "tenant-a", refresh: vi.fn().mockRejectedValue(error), onInvalid });
    authSession.setAccessToken(tokenExpiringAt(Date.now() + 45_000));

    await expect(authSession.forceRefresh()).rejects.toBe(error);
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(authSession.getAccessToken()).toBeNull();
  });

  it("reads the expiry from a JWT payload using the URL-safe alphabet", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T12:00:00Z"));
    const payload = Buffer.from(JSON.stringify({ marker: "a\u083f", exp: Date.now() / 1000 + 30 })).toString("base64url");
    expect(payload).toMatch(/[-_]/);
    authSession.setAccessToken(`header.${payload}.signature`);

    expect(authSession.expiresWithin(60_000)).toBe(true);
    expect(authSession.expiresWithin(0)).toBe(false);
  });

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
