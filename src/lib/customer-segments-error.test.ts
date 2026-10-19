import { crmMutationConfig } from "./sdk-local/crm-request-context";
const context = { instance: "local-test", token: "fixture-original-token" };
import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import CustomersClient from "@/lib/sdk-local/customers.client";
import { getCustomerSegmentsError } from "./customer-segments-error";

describe("segment HTTP error metadata", () => {
  it("reads domain codes through the actual SDK error interceptor", async () => {
    const client = new CustomersClient("http://localhost:8002");
    client.ax.defaults.adapter = async (config) => {
      throw new AxiosError("Conflict", "ERR_BAD_REQUEST", config, undefined, {
        config,
        data: { code: "SEGMENT_CHANGED" },
        status: 409,
        statusText: "Conflict",
        headers: {},
      });
    };
    const error = await client
      .updateSegment(1, {
        changes: { NOME: "Nome" },
        expected: { NOME: null, ordem: null, COD_UNIDADE: null },
      }, context)
      .catch((error) => error);
    expect(getCustomerSegmentsError(error)).toEqual({ status: 409, code: "SEGMENT_CHANGED" });
  });
  it("does not parse database messages and handles cyclic causes", () => {
    expect(getCustomerSegmentsError(new Error("duplicate entry SQL details"))).toEqual({});
    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;
    expect(getCustomerSegmentsError(cyclic)).toEqual({});
  });
});
