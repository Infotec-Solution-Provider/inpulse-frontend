import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it, vi } from "vitest";
import CustomersClient from "./customers.client";

describe("CRM catalog transport", () => {
  it("encodes literal search and textual state keys without selecting a tenant", async () => {
    const client = new CustomersClient("http://localhost:8002");
    const get = vi
      .spyOn(client.ax, "get")
      .mockResolvedValue({ data: { data: [], page: { totalRows: 0 } } });
    await client.listCrmCatalog("cities", { search: "São & 50%_", id: 0, page: 2, perPage: 20 });
    const url = new URL(get.mock.calls[0][0], "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: "São & 50%_",
      id: "0",
      page: "2",
      perPage: "20",
    });
    await client.getCrmCatalog("states", "A/");
    expect(get.mock.calls[1][0]).toBe("/api/crm-catalogs/states/A%2F");
  });
  it("sends complete delete preconditions in the body and keeps null values", async () => {
    const client = new CustomersClient("http://localhost:8002");
    const remove = vi
      .spyOn(client.ax, "delete")
      .mockResolvedValue({ data: { message: "Excluído" } });
    const expected = { NOME: null, ORDEM: 0, FUSOHORARIO: -3 };
    await client.deleteCrmCatalog("states", "SP", expected);
    expect(remove).toHaveBeenCalledExactlyOnceWith("/api/crm-catalogs/states/SP", {
      data: { expected },
    });
  });
  it.each(["create", "update", "delete"])("never retries an uncertain %s", async (operation) => {
    const client = new CustomersClient("http://localhost:8002");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("timeout", AxiosError.ECONNABORTED, config);
    });
    client.ax.defaults.adapter = adapter;
    const pending =
      operation === "create"
        ? client.createCrmCatalog("origins", { CODIGO: 3, DESCRICAO: "Origem" })
        : operation === "update"
          ? client.updateCrmCatalog("origins", 3, {
              changes: { DESCRICAO: "Outra" },
              expected: { DESCRICAO: null },
            })
          : client.deleteCrmCatalog("origins", 3, { DESCRICAO: null });
    await expect(pending).rejects.toBeInstanceOf(Error);
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
