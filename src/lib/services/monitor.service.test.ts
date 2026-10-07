import { describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import { MonitorService } from "./monitor.service";
import { createInitialFilters } from "@/app/(private)/[instance]/monitor/filters-state";

vi.mock("react-toastify", () => ({ toast: { warning: vi.fn() } }));
vi.mock("@/lib/auth-session", () => ({ authSession: { install: vi.fn() } }));

describe("typed monitor API", () => {
  it("sends pagination and cancellation signal with an explicit data envelope", async () => {
    const client = new MonitorService("http://example.invalid");
    const controller = new AbortController();
    client.ax.defaults.adapter = async (config) => {
      expect(config.url).toBe("/api/whatsapp/monitor/search");
      expect(config.signal).toBe(controller.signal);
      expect(JSON.parse(config.data)).toMatchObject({
        page: 2,
        pageSize: 20,
        filters: { sortBy: "urgency" },
      });
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { data: { items: [], totalCount: 21, page: 2, pageSize: 20 } },
      };
    };
    expect(
      await client.search(
        { page: 2, pageSize: 20, filters: createInitialFilters() },
        controller.signal,
      ),
    ).toMatchObject({ totalCount: 21, page: 2 });
  });

  it("keeps facets independent of the selected operational chip", async () => {
    const client = new MonitorService("http://example.invalid");
    client.ax.defaults.adapter = async (config) => {
      expect(config.url).toBe("/api/whatsapp/monitor/summary");
      expect(JSON.parse(config.data).filters.operationalStatus).toBe("all");
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: {
          data: {
            inProgress: 2,
            waitingAgent: 1,
            waitingCustomer: 1,
            unread: 1,
            overdue: 0,
            scheduled: 0,
            slaMinutes: null,
          },
        },
      };
    };
    expect(
      await client.summary(
        { ...createInitialFilters(), operationalStatus: "unread" },
        new AbortController().signal,
      ),
    ).toMatchObject({ inProgress: 2, slaMinutes: null });
  });

  it("reports malformed payloads and never silently substitutes an empty successful list", async () => {
    const client = new MonitorService("http://example.invalid");
    client.ax.defaults.adapter = async (config) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: {},
    });
    await expect(
      client.search(
        { page: 1, pageSize: 20, filters: createInitialFilters() },
        new AbortController().signal,
      ),
    ).rejects.toThrow("Resposta inválida");
  });

  it("propagates a read limit for the coordinator without automatic transport retries", async () => {
    const client = new MonitorService("http://example.invalid");
    const adapter = vi.fn(async () => {
      throw new AxiosError("limited", undefined, undefined, undefined, {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "retry-after": "7" },
        data: { code: "READ_REQUEST_LIMIT" },
        config: {} as never,
      });
    });
    client.ax.defaults.adapter = adapter;
    await expect(
      client.search(
        { page: 1, pageSize: 20, filters: createInitialFilters() },
        new AbortController().signal,
      ),
    ).rejects.toThrow("7 segundos");
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
