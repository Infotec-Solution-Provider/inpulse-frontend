import axios, { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import CrmMarketingClient from "./crm-marketing.client";
import CrmCampaignGenerationClient from "./crm-campaign-generation.client";
afterEach(() => {
  delete axios.defaults.headers.common.Authorization;
  vi.restoreAllMocks();
});
describe("pinned CRM marketing SDK", () => {
  it("preserves campaign membership identity, active lookup paging and complete removal snapshot", async () => {
    const client = new CrmMarketingClient("http://crm.test", "member-token-a", "tenant-a");
    const member = {
      CODIGO: 81,
      CAMPANHA: 10,
      OPERADOR: 25,
      OPERADOR_NOME: "Ana",
      OPERADOR_ATIVO: "SIM",
      writable: true,
      occurrences: 1,
    };
    const adapter = vi.fn(async (config: any) => ({
      status: config.method === "delete" ? 204 : 200,
      statusText: "OK",
      headers: {},
      config,
      data: config.url.endsWith("/options")
        ? {
            data: [{ CODIGO: 25, NOME: "Ana", ATIVO: "SIM" }],
            page: { current: 2, hasNext: false },
          }
        : { data: config.method === "post" ? member : [member] },
    }));
    client.ax.defaults.adapter = adapter;
    client.ax.defaults.headers.common.Authorization = "Bearer changed-token-b";
    client.ax.defaults.headers.common["x-crm-instance"] = "tenant-b";
    expect((await client.campaignMembers(10)).data).toEqual([member]);
    expect((await client.campaignMemberOptions(10, "Ana", 2)).page.current).toBe(2);
    expect((await client.addCampaignMember(10, { CODIGO: 81, OPERADOR: 25 })).data).toEqual(member);
    await client.removeCampaignMember(10, 81, { CAMPANHA: 10, OPERADOR: 25 });
    expect(adapter.mock.calls[1][0].params).toEqual({ search: "Ana", page: 2, perPage: 20 });
    expect(JSON.parse(adapter.mock.calls[2][0].data)).toEqual({ CODIGO: 81, OPERADOR: 25 });
    expect(adapter.mock.calls[3][0].url).toBe("/api/marketing/crm/campaigns/10/members/81");
    expect(JSON.parse(adapter.mock.calls[3][0].data)).toEqual({
      expected: { CAMPANHA: 10, OPERADOR: 25 },
    });
    for (const [request] of adapter.mock.calls) {
      expect(request.headers.get("Authorization")).toBe("Bearer member-token-a");
      expect(request.headers.get("x-crm-instance")).toBe("tenant-a");
      expect(request.skipAuthInjection).toBe(true);
      expect(request.skipAuthRefresh).toBe(true);
    }
  });
  it("does not repeat an uncertain membership deletion", async () => {
    const client = new CrmMarketingClient("http://crm.test", "token-a", "tenant-a");
    const adapter = vi.fn(async (config: any) => {
      throw new AxiosError("Unknown", "ERR_BAD_RESPONSE", config, undefined, {
        status: 503,
        statusText: "Unknown",
        config,
        headers: {},
        data: { outcome: "UNKNOWN" },
      });
    });
    client.ax.defaults.adapter = adapter;
    await expect(
      client.removeCampaignMember(10, 81, { CAMPANHA: 10, OPERADOR: null }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(adapter).toHaveBeenCalledTimes(1);
  });
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
      expected: {
        SQL_CAMPANHA: "managed",
        GERADO_LISTA: "NAO" as const,
        alreadyLinkedCount: 2,
        eligibleCount: 3,
      },
    };
    expect(await client.generate(5, payload)).toEqual({ insertedCount: 3 });
    const config = adapter.mock.calls[0]![0] as any;
    expect(config.url).toBe("/api/crm/campaigns/5/generate");
    expect(JSON.parse(config.data)).toEqual(payload);
    expect(config.headers.get("x-crm-instance")).toBe("tenant-a");
    expect(config.skipAuthInjection).toBe(true);
  });
});
