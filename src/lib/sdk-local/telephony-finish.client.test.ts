import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, it, expect, vi } from "vitest";
import { authSession } from "@/lib/auth-session";
import TelephonyFinishClient from "./telephony-finish.client";
afterEach(() => {
  authSession.clearConfiguration();
  vi.restoreAllMocks();
});
describe("advanced telephony finalization transport", () => {
  it("keeps options, command and receipt in the original tenant/actor context", async () => {
    const context = { instance: "tenant-a", token: "form-token" };
    const client = new TelephonyFinishClient("http://localhost:8002", context);
    context.instance = "tenant-b";
    context.token = "changed";
    authSession.configure({ instance: "tenant-b", refresh: vi.fn(), onInvalid: vi.fn() });
    authSession.setAccessToken("another-session");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
      config,
      data: { data: { enabled: true, status: "applied" } },
      headers: {},
      status: 200,
      statusText: "OK",
    }));
    client.ax.defaults.adapter = adapter;
    await client.options(41);
    await client.finish(41, { operationId: "op", resultId: 9, observation: "Registro" });
    await client.status(41, "op");
    expect(adapter).toHaveBeenCalledTimes(3);
    for (const [request] of adapter.mock.calls) {
      expect(request.headers.get("Authorization")).toBe("Bearer form-token");
      expect(request.headers.get("x-crm-instance")).toBe("tenant-a");
      expect(request).toMatchObject({ skipAuthInjection: true, skipAuthRefresh: true });
    }
    expect(adapter.mock.calls.map(([r]) => r.url)).toEqual([
      "/api/customers/schedules/telephony/41/finish-options",
      "/api/customers/schedules/telephony/41/finish-v2",
      "/api/customers/schedules/telephony/41/finish-v2/op",
    ]);
  });
  it("does not refresh or repeat a finalization after authentication rejection", async () => {
    const refresh = vi.fn();
    authSession.configure({ instance: "tenant-b", refresh, onInvalid: vi.fn() });
    const client = new TelephonyFinishClient("http://localhost:8002", {
      instance: "tenant-a",
      token: "form-token",
    });
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("Rejected", AxiosError.ERR_BAD_REQUEST, config, undefined, {
        config,
        data: { outcome: "NOT_COMMITTED" },
        status: 401,
        statusText: "Unauthorized",
        headers: {},
      });
    });
    client.ax.defaults.adapter = adapter;
    await expect(client.finish(41, {})).rejects.toThrow();
    expect(adapter).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });
});
