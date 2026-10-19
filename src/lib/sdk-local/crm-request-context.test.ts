import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authSession } from "@/lib/auth-session";
import CustomersClient from "./customers.client";
import CrmUserCatalogsClient from "./crm-user-catalogs.client";
import { crmMutationConfig, type CrmRequestContext } from "./crm-request-context";
const context = { instance: "tenant-a", token: "original-tenant-a-token" };
afterEach(() => { authSession.clearConfiguration(); vi.restoreAllMocks(); });
describe("CRM mutation identity", () => {
  it("keeps the form tenant and token when the global session changes during an interceptor await", async () => {
    const client = new CustomersClient("http://localhost:8002");
    let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    client.ax.interceptors.request.use(async config => { await barrier; return config; });
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({ config, data: { data: [] }, headers: {}, status: 200, statusText: "OK" }));
    client.ax.defaults.adapter = adapter;
    const pending = client.updateSegment(5, { changes: { ordem: 2 }, expected: { NOME: "Original", ordem: 1, COD_UNIDADE: null } }, context);
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
    const client = new CrmUserCatalogsClient("http://localhost:8001");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { throw new AxiosError("Unauthorized", AxiosError.ERR_BAD_REQUEST, config, undefined, { config, data: {}, status: 401, statusText: "Unauthorized", headers: {} }); });
    client.ax.defaults.adapter = adapter;
    await expect(client.setShift(3, 5, { HORARIO: 0 }, context)).rejects.toBeInstanceOf(Error);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("rejects an absent tenant before starting any request", () => {
    expect(() => crmMutationConfig({ instance: "", token: "token" })).toThrow("Recarregue");
    expect(() => crmMutationConfig(undefined as unknown as CrmRequestContext)).toThrow("Recarregue");
  });
});
