import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it, vi } from "vitest";
import CrmUserCatalogsClient from "./crm-user-catalogs.client";
const context = { instance: "tenant-a", token: "token-a" };
function client() {
  const api = new CrmUserCatalogsClient("http://localhost:8001");
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
    config,
    data: { data: {} },
    status: 200,
    statusText: "OK",
    headers: {},
  }));
  api.ax.defaults.adapter = adapter;
  return { api, adapter };
}
describe("CRM user API contracts", () => {
  it("keeps an exact decimal and textual sales identity with its full precondition", async () => {
    const { api, adapter } = client();
    await api.update(
      "sales-types",
      "0001",
      { PAGAMENTO: "1.25" },
      { ID: "0001", NOME: "Nome", PAGAMENTO: "0.00" },
      context,
    );
    expect(adapter.mock.calls[0][0].url).toBe("/api/crm/sales-types/0001");
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({
      changes: { PAGAMENTO: "1.25" },
      expected: { ID: "0001", NOME: "Nome", PAGAMENTO: "0.00" },
    });
  });
  it("removes only a membership identified by group, member and original operator", async () => {
    const { api, adapter } = client();
    await api.removeMember(5, 33, { OPERADOR: null }, context);
    const request = adapter.mock.calls[0][0];
    expect(request.url).toBe("/api/crm/user-groups/5/members/33");
    expect(JSON.parse(request.data)).toEqual({ expected: { OPERADOR: null } });
    expect(request.headers.get("x-crm-instance")).toBe("tenant-a");
  });
  it("clears a user shift with the original zero without a generic user patch", async () => {
    const { api, adapter } = client();
    await api.setShift(42, null, { HORARIO: 0 }, context);
    expect(adapter.mock.calls[0][0].url).toBe("/api/crm/users/42/shift");
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({
      HORARIO: null,
      expected: { HORARIO: 0 },
    });
  });
  it("sends registration changes with an opaque version and pinned credentials", async () => {
    const { api, adapter } = client();
    await api.updateRegistration(42, { NOME: "Nome" }, "opaque-version", context);
    const request = adapter.mock.calls[0][0];
    expect(JSON.parse(request.data)).toEqual({
      changes: { NOME: "Nome" },
      version: "opaque-version",
    });
    expect(request).toMatchObject({ skipAuthInjection: true, skipAuthRefresh: true });
    expect(request.headers.get("Authorization")).toBe("Bearer token-a");
  });
  it("does not retry a registration whose result is unknown", async () => {
    const api = new CrmUserCatalogsClient("http://localhost:8001");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("timeout", AxiosError.ECONNABORTED, config);
    });
    api.ax.defaults.adapter = adapter;
    await expect(
      api.createRegistration(
        { NOME: "Nome", LOGIN: "login", SENHA: "test-only", NIVEL: "ADMIN" },
        context,
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
