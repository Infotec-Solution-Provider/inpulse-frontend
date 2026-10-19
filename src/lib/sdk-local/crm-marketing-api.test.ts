import axios, { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import CrmMarketingClient from "./crm-marketing.client";
import CrmCampaignGenerationClient from "./crm-campaign-generation.client";
afterEach(() => {
  delete axios.defaults.headers.common.Authorization;
  vi.restoreAllMocks();
});
describe("pinned CRM marketing SDK", () => {
  it("pins the form token and tenant even if global and client defaults later change", async () => {
    const client = new CrmMarketingClient("http://crm.test", "token-a", "tenant-a"),
      adapter = vi.fn(async (config) => ({
        status: 201,
        statusText: "Created",
        headers: {},
        config,
        data: { data: { CODIGO: 1, NOME: "A" } },
      }));
    client.ax.defaults.adapter = adapter;
    axios.defaults.headers.common.Authorization = "Bearer token-b";
    client.ax.defaults.headers.common.Authorization = "Bearer token-b";
    await client.create("campaigns", { CODIGO: 1, NOME: "A" });
    const config = adapter.mock.calls[0]![0] as any;
    expect(config.headers.get("Authorization")).toBe("Bearer token-a");
    expect(config.headers.get("x-crm-instance")).toBe("tenant-a");
    expect(config.skipAuthInjection).toBe(true);
    expect(config.skipAuthRefresh).toBe(true);
  });
  it("does not refresh or retry unauthorized mutations", async () => {
    const client = new CrmMarketingClient("http://crm.test", "old", "tenant-a"),
      adapter = vi.fn(async (config) => {
        throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
          status: 401,
          statusText: "Unauthorized",
          headers: {},
          config,
          data: {},
        });
      });
    client.ax.defaults.adapter = adapter;
    await expect(client.create("results", { CODIGO: 1, NOME: "A" })).rejects.toBeInstanceOf(
      AxiosError,
    );
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it("keeps generation pinned and preserves its guarded contract", async () => {
    const client = new CrmCampaignGenerationClient("http://customers.test", "token-a", "tenant-a"),
      adapter = vi.fn(async (config) => ({
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { data: { insertedCount: 3 } },
      }));
    client.ax.defaults.adapter = adapter;
    const payload = {
      operatorId: 7,
      scheduledAt: "2026-10-19 09:00:00",
      expectedCount: 3,
      expected: { SQL_CAMPANHA: "managed", GERADO_LISTA: "NAO" as const },
    };
    expect(await client.generate(5, payload)).toEqual({ insertedCount: 3 });
    const config = adapter.mock.calls[0]![0] as any;
    expect(config.url).toBe("/api/crm/campaigns/5/generate");
    expect(JSON.parse(config.data)).toEqual(payload);
    expect(config.headers.get("x-crm-instance")).toBe("tenant-a");
    expect(config.skipAuthInjection).toBe(true);
  });
});
