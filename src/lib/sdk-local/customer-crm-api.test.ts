import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authSession } from "../auth-session";
import CustomerCrmClient from "./customer-crm.client";
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  authSession.clearConfiguration();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("complete CRM registration transport", () => {
  it("pins operator/token/tenant independently of changing global authentication and persists the operation header", async () => {
    const client = new CustomerCrmClient("https://fixture.invalid");
    client.setRegistrationContext("odim", "token-a", 534);
    authSession.setAccessToken("token-b");
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer token-a",
        "x-crm-instance": "odim",
        "x-crm-operation-id": expect.any(String),
      });
      expect(await client.pendingRegistrationOperations()).toHaveLength(1);
      return new Response(JSON.stringify({ data: { record: { CODIGO: 3 }, version: "v" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    expect(await client.createRegistration({ RAZAO: "A" })).toMatchObject({
      record: { CODIGO: 3 },
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "https://fixture.invalid/api/customers/crm-customers",
    );
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
    const client = new CustomerCrmClient("https://fixture.invalid");
    client.setRegistrationContext("odim", "token", 534);
    vi.mocked(fetch).mockRejectedValue(new TypeError("timeout"));
    const actions: Record<string, () => Promise<unknown>> = {
      "customer.create": () => client.createRegistration({ RAZAO: "A" }),
      "customer.update": () =>
        client.updateRegistration(3, { changes: { EMAIL: null }, version: "v" }),
      "contact.create": () => client.createRegistrationContact(3, { NOME: "B" }),
      "contact.update": () =>
        client.updateRegistrationContact(3, 4, { changes: { CARGO: null }, version: "v" }),
      "contact.delete": () => client.deleteRegistrationContact(3, 4, "v"),
      "brand.create": () => client.createRegistrationBrand(3, 2),
      "brand.delete": () => client.deleteRegistrationBrand(3, 2, "v"),
    };
    await expect(actions[kind]()).rejects.toBeInstanceOf(Error);
    expect(fetch).toHaveBeenCalledOnce();
    expect(await client.pendingRegistrationOperations()).toHaveLength(1);
  });
  it("does not refresh or replay a 401 mutation", async () => {
    const client = new CustomerCrmClient("https://fixture.invalid");
    client.setRegistrationContext("odim", "token", 534);
    const refresh = vi.spyOn(authSession, "forceRefresh");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "Expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(client.createRegistration({ RAZAO: "A" })).rejects.toBeInstanceOf(Error);
    expect(fetch).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });
});
