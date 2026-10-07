import { describe, expect, it, vi } from "vitest";
import { TelephonyMonitorService } from "./telephony-monitor.service";
import { createTelephonyFilters } from "@/app/(private)/[instance]/monitor/telephony/filter-state";

vi.mock("react-toastify", () => ({ toast: { warning: vi.fn() } }));
vi.mock("@/lib/auth-session", () => ({ authSession: { install: vi.fn() } }));

describe("telephony monitor HTTP", () => {
  it("uses the customers read endpoint, typed envelope and cancellation with civil ranges converted", async () => {
    const client = new TelephonyMonitorService("http://example.invalid");
    const signal = new AbortController().signal;
    client.ax.defaults.adapter = async (config) => {
      expect(config.url).toBe("/api/customers/monitor/telephony/search");
      expect(config.signal).toBe(signal);
      expect(JSON.parse(config.data)).toMatchObject({
        page: 2,
        pageSize: 20,
        filters: {
          mode: "unscheduled",
          neverWorked: true,
          referencePeriod: { from: expect.any(String), to: expect.any(String) },
        },
      });
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: {
          data: {
            items: [],
            totalCount: 21,
            page: 2,
            pageSize: 20,
            summary: { customerCount: 21, overdueCount: null },
          },
        },
      };
    };
    expect(
      await client.search(
        {
          page: 2,
          pageSize: 20,
          filters: { ...createTelephonyFilters("unscheduled"), neverWorked: true },
        },
        signal,
      ),
    ).toMatchObject({ totalCount: 21, summary: { overdueCount: null } });
  });

  it("passes lookup pagination and geography parents without coercing composite IDs", async () => {
    const client = new TelephonyMonitorService("http://example.invalid");
    const id = '["RS","Santa Maria","Centro"]';
    client.ax.defaults.adapter = async (config) => {
      expect(config.url).toBe("/api/customers/monitor/telephony/options");
      expect(JSON.parse(config.data)).toMatchObject({
        kind: "neighborhoods",
        page: 3,
        states: ["RS"],
        cities: ['["RS","Santa Maria"]'],
      });
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: {
          data: {
            items: [{ id, label: "Centro", description: "Santa Maria / RS" }],
            totalCount: 41,
            page: 3,
            pageSize: 20,
          },
        },
      };
    };
    expect(
      (
        await client.options(
          {
            kind: "neighborhoods",
            search: "Centro",
            page: 3,
            pageSize: 20,
            states: ["RS"],
            cities: ['["RS","Santa Maria"]'],
          },
          new AbortController().signal,
        )
      ).items[0].id,
    ).toBe(id);
  });

  it("rejects malformed summaries and lookup IDs instead of presenting empty success", async () => {
    const client = new TelephonyMonitorService("http://example.invalid");
    client.ax.defaults.adapter = async (config) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: { data: { items: [], totalCount: 0 } },
    });
    await expect(
      client.search(
        { page: 1, pageSize: 20, filters: createTelephonyFilters("calls") },
        new AbortController().signal,
      ),
    ).rejects.toThrow("Resposta inválida");
    client.ax.defaults.adapter = async (config) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: { data: { items: [{ id: 123, label: "Customer" }], totalCount: 1 } },
    });
    await expect(
      client.options(
        { kind: "customers", search: "", page: 1, pageSize: 20 },
        new AbortController().signal,
      ),
    ).rejects.toThrow("Resposta inválida");
  });
});
