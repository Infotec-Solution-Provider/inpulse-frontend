import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authSession } from "../auth-session";
import CrmPurchasesClient from "./crm-purchases.client";
afterEach(() => { authSession.clearConfiguration(); vi.restoreAllMocks(); });
describe("versioned purchase transport", () => {
  it.each(["schema","list","get","lookup","create","update","remove"])("pins immutable tenant and credential on %s", async method => {
    const context = { instance: "fixture_a", token: "token_a" }, client = new CrmPurchasesClient("http://fixture.invalid", context);
    context.instance = "fixture_b"; context.token = "token_b"; authSession.setAccessToken("global_b");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { expect(config.headers.get("Authorization")).toBe("Bearer token_a"); expect(config.headers.get("x-crm-instance")).toBe("fixture_a"); expect(config).toMatchObject({ skipAuthInjection: true, skipAuthRefresh: true }); return { config, status: 200, statusText: "OK", headers: {}, data: { data: { record: { CODIGO: 7 }, version: "v" } } }; }); client.ax.defaults.adapter = adapter;
    const actions: Record<string, () => Promise<unknown>> = { schema: () => client.schema(), list: () => client.list({ page: 2 }), get: () => client.get(7), lookup: () => client.lookup("customers", { search: "café", page: 1 }), create: () => client.create({ CLIENTE: 3, VALOR: "12.50" }), update: () => client.update(7, { changes: { VALOR: "1.25", DATA: null }, version: "v" }), remove: () => client.remove(7, { version: "v" }) };
    await actions[method]!(); expect(adapter).toHaveBeenCalledTimes(1);
    if (method === "update") expect(JSON.parse(adapter.mock.calls[0]![0].data)).toEqual({ changes: { VALOR: "1.25", DATA: null }, version: "v" });
    if (method === "remove") expect(JSON.parse(adapter.mock.calls[0]![0].data)).toEqual({ version: "v" });
  });
  it.each(["create","update","remove"])("does not replay uncertain %s", async method => {
    const client = new CrmPurchasesClient("http://fixture.invalid", { instance: "a", token: "token" }), adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { throw new AxiosError("timeout", AxiosError.ECONNABORTED, config); }); client.ax.defaults.adapter = adapter;
    const actions: Record<string, () => Promise<unknown>> = { create: () => client.create({ CLIENTE: 3, VALOR: "12.50" }), update: () => client.update(7, { changes: { FORMA_PGTO: null }, version: "v" }), remove: () => client.remove(7, { version: "v" }) }; await expect(actions[method]!()).rejects.toBeInstanceOf(Error); expect(adapter).toHaveBeenCalledTimes(1);
  });
  it("never refreshes and replays a purchase after a 401", async () => {
    const client = new CrmPurchasesClient("http://fixture.invalid", { instance: "a", token: "token" }), refresh = vi.spyOn(authSession, "forceRefresh"), adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, { config, status: 401, statusText: "Unauthorized", headers: {}, data: { message: "Sessão inválida" } }); }); client.ax.defaults.adapter = adapter;
    await expect(client.update(7, { changes: { VALOR: "1.25" }, version: "v" })).rejects.toBeInstanceOf(Error); expect(adapter).toHaveBeenCalledTimes(1); expect(refresh).not.toHaveBeenCalled();
  });
});
