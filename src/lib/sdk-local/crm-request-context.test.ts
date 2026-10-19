import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authSession } from "@/lib/auth-session";
import CustomersClient from "./customers.client";
import customersService from "@/lib/services/customers.service";
import { crmMutationConfig, type CrmRequestContext } from "./crm-request-context";
const context = { instance: "tenant-a", token: "original-tenant-a-token" };
afterEach(() => {
  authSession.clearConfiguration();
  vi.restoreAllMocks();
});
describe("CRM mutation identity", () => {
  it("pins telephony finalization and its readonly receipt to the original form context", async () => {
    const client = customersService;
    authSession.configure({ instance: "tenant-b", refresh: vi.fn(), onInvalid: vi.fn() });
    authSession.setAccessToken("different-session");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
      config,
      data: { data: { status: "applied" } },
      headers: {},
      status: 200,
      statusText: "OK",
    }));
    client.ax.defaults.adapter = adapter;
    const operationId = "e05cc9ea-5f51-4c7b-a18e-7e74d1607e47";
    await client.finishTelephonySchedule(
      5,
      { resultId: 1, operationId, finishedAt: "2026-10-19T12:00:00.000Z" },
      context,
    );
    const receipt = await client.getTelephonyFinishStatus(5, operationId, context);
    expect(receipt.data.status).toBe("applied");
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toMatchObject({ operationId, resultId: 1 });
    expect(adapter.mock.calls[1][0].url).toBe(
      `/api/customers/schedules/telephony/5/finish/${operationId}`,
    );
    for (const [request] of adapter.mock.calls) {
      expect(request.headers.get("Authorization")).toBe("Bearer original-tenant-a-token");
      expect(request.headers.get("x-crm-instance")).toBe("tenant-a");
      expect(request).toMatchObject({ skipAuthInjection: true, skipAuthRefresh: true });
    }
  });
  it("does not refresh or repeat a rejected telephony finalization", async () => {
    const refresh = vi.fn();
    authSession.configure({ instance: "tenant-b", refresh, onInvalid: vi.fn() });
    const client = new CustomersClient("http://localhost:8002");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("Unauthorized", AxiosError.ERR_BAD_REQUEST, config, undefined, {
        config,
        data: {},
        status: 401,
        statusText: "Unauthorized",
        headers: {},
      });
    });
    client.ax.defaults.adapter = adapter;
    await expect(
      client.finishTelephonySchedule(
        5,
        { resultId: 1, operationId: "e05cc9ea-5f51-4c7b-a18e-7e74d1607e47" },
        context,
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("keeps the form tenant and token when the global session changes during an interceptor await", async () => {
    const client = new CustomersClient("http://localhost:8002");
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    client.ax.interceptors.request.use(async (config) => {
      await barrier;
      return config;
    });
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
      config,
      data: { data: [] },
      headers: {},
      status: 200,
      statusText: "OK",
    }));
    client.ax.defaults.adapter = adapter;
    const pending = client.updateSegment(
      5,
      { changes: { ordem: 2 }, expected: { NOME: "Original", ordem: 1, COD_UNIDADE: null } },
      context,
    );
    await Promise.resolve();
    authSession.configure({ instance: "tenant-b", refresh: vi.fn(), onInvalid: vi.fn() });
    authSession.setAccessToken("new-global-tenant-b-token");
    client.setAuth("new-global-tenant-b-token");
    release();
    await pending;
    const request = adapter.mock.calls[0][0];
    expect(request.headers.get("Authorization")).toBe("Bearer original-tenant-a-token");
    expect(request.headers.get("x-crm-instance")).toBe("tenant-a");
    expect(request).toMatchObject({ skipAuthInjection: true, skipAuthRefresh: true });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it("never refreshes or repeats a CRM mutation after 401", async () => {
    const refresh = vi.fn();
    authSession.configure({ instance: "tenant-b", refresh, onInvalid: vi.fn() });
    authSession.setAccessToken("other-token");
    const client = new CustomersClient("http://localhost:8002");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("Unauthorized", AxiosError.ERR_BAD_REQUEST, config, undefined, {
        config,
        data: {},
        status: 401,
        statusText: "Unauthorized",
        headers: {},
      });
    });
    client.ax.defaults.adapter = adapter;
    await expect(
      client.setCustomerSegment(3, { SEGMENTO: 5, expected: { SEGMENTO: 0 } }, context),
    ).rejects.toBeInstanceOf(Error);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("rejects an absent tenant before starting any request", () => {
    expect(() => crmMutationConfig({ instance: "", token: "token" })).toThrow("Recarregue");
    expect(() => crmMutationConfig(undefined as unknown as CrmRequestContext)).toThrow(
      "Recarregue",
    );
  });
});
