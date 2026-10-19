import { crmMutationConfig } from "./crm-request-context";
const context = { instance: "local-test", token: "fixture-original-token" };
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { describe, expect, it, vi } from "vitest";
import CustomersClient from "./customers.client";
import { Segment, UpdateSegmentRequest } from "./types/customers.types";

const segment: Segment = { CODIGO: 37, NOME: "Indústria & comércio", ordem: null, COD_UNIDADE: 4 };

function response<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> {
  return { config, data, headers: {}, status: 200, statusText: "OK" };
}

describe("customer segment API contract", () => {
  it("explicitly clears the customer association without changing the original zero snapshot", async () => {
    const client = new CustomersClient("http://localhost:8002");
    const patch = vi.spyOn(client.ax, "patch").mockResolvedValue({ data: { data: { CODIGO: 12, SEGMENTO: null, segment: null } } });
    await client.setCustomerSegment(12, { SEGMENTO: null, expected: { SEGMENTO: 0 } }, context);
    expect(patch).toHaveBeenCalledExactlyOnceWith("/api/customers/12/segment", { SEGMENTO: null, expected: { SEGMENTO: 0 } }, crmMutationConfig(context));
  });
  it("deletes with a complete original snapshot", async () => {
    const client = new CustomersClient("http://localhost:8002");
    const remove = vi.spyOn(client.ax, "delete").mockResolvedValue({ data: { message: "OK" } });
    const expected = { NOME: segment.NOME, ordem: null, COD_UNIDADE: 4 };
    await client.deleteSegment(37, expected, context);
    expect(remove).toHaveBeenCalledExactlyOnceWith("/api/segments/37", { ...crmMutationConfig(context), data: { expected } });
  });
  it("encodes the supported filters and preserves zero, accents and pagination", async () => {
    const client = new CustomersClient("http://localhost:8002");
    const envelope = { message: "Segmentos encontrados.", data: [segment], page: { current: 2, totalRows: 31 } };
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, envelope));
    client.ax.defaults.adapter = adapter;

    expect(await client.listSegments({
      page: 2, perPage: 25, CODIGO: 37, NOME: "Indústria & comércio 50%", COD_UNIDADE: 0,
      unidadeStatus: "with", sortBy: "ordem", sortDirection: "desc",
    })).toEqual(envelope);

    const url = new URL(adapter.mock.calls[0][0].url!, "http://localhost:8002");
    expect(url.pathname).toBe("/api/segments");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: "2", perPage: "25", CODIGO: "37", NOME: "Indústria & comércio 50%", COD_UNIDADE: "0",
      unidadeStatus: "with", sortBy: "ordem", sortDirection: "desc",
    });
  });

  it("omits absent filters instead of serializing undefined", async () => {
    const client = new CustomersClient("http://localhost:8002");
    const get = vi.spyOn(client.ax, "get").mockResolvedValue({ data: { data: [] } });
    await client.listSegments();
    await client.listSegments({ NOME: undefined });
    expect(get.mock.calls.map(([url]) => url)).toEqual(["/api/segments", "/api/segments"]);
  });

  it("keeps the existing lookup endpoint and unwrapped array compatible", async () => {
    const client = new CustomersClient("http://localhost:8002");
    const options = [{ CODIGO: 37, NOME: "Indústria" }, { CODIGO: 38, NOME: null }];
    const get = vi.spyOn(client.ax, "get").mockResolvedValue({ data: { message: "OK", data: options } });
    expect(await client.getSegments()).toEqual(options);
    expect(get).toHaveBeenCalledExactlyOnceWith("/api/customers/segments", undefined);
  });

  it("reads a segment and retains the response envelope", async () => {
    const client = new CustomersClient("http://localhost:8002");
    const envelope = { message: "Segmento encontrado.", data: segment };
    const get = vi.spyOn(client.ax, "get").mockResolvedValue({ data: envelope });
    expect(await client.getSegment(37)).toEqual(envelope);
    expect(get).toHaveBeenCalledExactlyOnceWith("/api/segments/37", undefined);
  });

  it("creates a segment without sending an invented ID or unit", async () => {
    const client = new CustomersClient("http://localhost:8002");
    const envelope = { message: "Segmento criado.", data: segment };
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, envelope));
    client.ax.defaults.adapter = adapter;
    expect(await client.createSegment({ NOME: "Indústria & comércio", ordem: null }, context)).toEqual(envelope);
    expect(adapter.mock.calls[0][0].method).toBe("post");
    expect(adapter.mock.calls[0][0].url).toBe("/api/segments");
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({ NOME: "Indústria & comércio", ordem: null });
  });

  it("sends the original values for conflict detection without dropping null or zero", async () => {
    const client = new CustomersClient("http://localhost:8002");
    const data: UpdateSegmentRequest = {
      changes: { NOME: "Varejo", ordem: 0 },
      expected: { NOME: null, ordem: null, COD_UNIDADE: 0 },
    };
    const envelope = { message: "Segmento atualizado.", data: { ...segment, NOME: "Varejo", ordem: 0 } };
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, envelope));
    client.ax.defaults.adapter = adapter;
    expect(await client.updateSegment(37, data, context)).toEqual(envelope);
    expect(adapter.mock.calls[0][0].method).toBe("patch");
    expect(adapter.mock.calls[0][0].url).toBe("/api/segments/37");
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual(data);
  });

  it("assigns a customer segment through the guarded route and preserves the expected empty link", async () => {
    const client = new CustomersClient("http://localhost:8002");
    const data = { SEGMENTO: 37, expected: { SEGMENTO: null } };
    const envelope = { message: "Cliente atualizado.", data: { CODIGO: 12, SEGMENTO: 37, segment: { CODIGO: 37, NOME: segment.NOME } } };
    const patch = vi.spyOn(client.ax, "patch").mockResolvedValue({ data: envelope });
    expect(await client.setCustomerSegment(12, data, context)).toEqual(envelope);
    expect(patch).toHaveBeenCalledExactlyOnceWith("/api/customers/12/segment", data, crmMutationConfig(context));
  });

  it.each([
    { status: 409, code: "SEGMENT_CONFLICT", message: "O segmento foi alterado por outro usuário." },
    { status: 503, code: "UNKNOWN", message: "Não foi possível confirmar a atualização." },
  ])("preserves the HTTP $status status and $code evidence for the caller", async ({ status, code, message }) => {
    const client = new CustomersClient("http://localhost:8002");
    let original: AxiosError | undefined;
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      original = new AxiosError("Request failed", AxiosError.ERR_BAD_RESPONSE, config, undefined, {
        config, data: { message, code }, status, statusText: "Error", headers: {},
      });
      throw original;
    });
    client.ax.defaults.adapter = adapter;
    const failure = await client.updateSegment(37, {
      changes: { NOME: "Varejo" }, expected: { NOME: segment.NOME, ordem: null, COD_UNIDADE: 4 },
    }, context).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe(message);
    expect((failure as Error).cause).toBe(original);
    expect(((failure as Error).cause as AxiosError).response).toMatchObject({ status, data: { code } });
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it.each(["create", "update", "assign"])("does not retry an uncertain %s mutation after a timeout", async (operation) => {
    const client = new CustomersClient("http://localhost:8002");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("timeout", AxiosError.ECONNABORTED, config);
    });
    client.ax.defaults.adapter = adapter;
    const pending = operation === "create"
      ? client.createSegment({ NOME: "Varejo" }, context)
      : operation === "update"
        ? client.updateSegment(37, { changes: { ordem: null }, expected: { NOME: segment.NOME, ordem: 0, COD_UNIDADE: 4 } }, context)
        : client.setCustomerSegment(12, { SEGMENTO: 37, expected: { SEGMENTO: 0 } }, context);
    const failure = await pending.catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(((failure as Error).cause as AxiosError).code).toBe(AxiosError.ECONNABORTED);
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
