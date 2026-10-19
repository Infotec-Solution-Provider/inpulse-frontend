import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authSession } from "../auth-session";
import CustomerCrmClient from "./customer-crm.client";
afterEach(() => {
  authSession.clearConfiguration();
  vi.restoreAllMocks();
});
describe("complete CRM registration transport", () => {
  it("pins write token and expected tenant despite a changed global auth token", async () => {
    const client = new CustomerCrmClient("http://fixture.invalid");
    client.setRegistrationContext("tenant-a", "token-a");
    authSession.setAccessToken("token-b");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      expect(config.headers.get("Authorization")).toBe("Bearer token-a");
      expect(config.headers.get("x-crm-instance")).toBe("tenant-a");
      expect(config).toMatchObject({ skipAuthInjection: true, skipAuthRefresh: true });
      return {
        config,
        status: 201,
        statusText: "Created",
        headers: {},
        data: { data: { record: { CODIGO: 3 }, version: "v" } },
      };
    });
    client.ax.defaults.adapter = adapter;
    expect(await client.createRegistration({ RAZAO: "A" })).toMatchObject({
      record: { CODIGO: 3 },
    });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it.each([
    "customer.create",
    "customer.update",
    "contact.create",
    "contact.update",
    "contact.delete",
    "brand.create",
    "brand.delete",
  ])("never replays uncertain %s", async (kind) => {
    const client = new CustomerCrmClient("http://fixture.invalid");
    client.setRegistrationContext("a", "token");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("timeout", AxiosError.ECONNABORTED, config);
    });
    client.ax.defaults.adapter = adapter;
    const actions: Record<string, () => Promise<unknown>> = {
      "customer.create": () => client.createRegistration({ RAZAO: "A" }),
      "customer.update": () =>
        client.updateRegistration(3, { changes: { EMAIL: null }, version: "v" }),
      "contact.create": () => client.createRegistrationContact(3, { CODIGO: 4, NOME: "B" }),
      "contact.update": () =>
        client.updateRegistrationContact(3, 4, { changes: { CARGO: null }, version: "v" }),
      "contact.delete": () => client.deleteRegistrationContact(3, 4, "v"),
      "brand.create": () => client.createRegistrationBrand(3, 2),
      "brand.delete": () => client.deleteRegistrationBrand(3, 2, "v"),
    };
    await expect(actions[kind]!()).rejects.toBeInstanceOf(Error);
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it("does not refresh and replay a mutation rejected before authentication", async () => {
    const client = new CustomerCrmClient("http://fixture.invalid");
    client.setRegistrationContext("a", "token");
    const refresh = vi.spyOn(authSession, "forceRefresh");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
        config,
        status: 401,
        statusText: "Unauthorized",
        headers: {},
        data: { message: "Sessão inválida" },
      });
    });
    client.ax.defaults.adapter = adapter;
    await expect(client.createRegistration({ RAZAO: "A" })).rejects.toBeInstanceOf(Error);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
