import { describe, expect, it, vi } from "vitest";
import { TelephonyMonitorService } from "./telephony-monitor.service";
import { createTelephonyFilters } from "@/app/(private)/[instance]/monitor/telephony/filter-state";
import type { TelephonyScheduleDetail } from "@/app/(private)/[instance]/monitor/telephony/types";
import { AxiosError } from "axios";

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

const schedule: TelephonyScheduleDetail = {
  id: 7,
  customer: { id: 70, name: "Cliente" },
  campaign: { id: 1, name: "Campanha" },
  scheduledAt: "2026-10-20T00:15:42",
  operatorId: 4,
  operatorName: "Operador atual",
  version: "v1",
  editable: true,
  blockedReason: null,
  capabilities: { priority: false, validity: false },
};

describe("schedule edit HTTP", () => {
  it("loads scoped detail and the separate paginated eligible-operator catalog", async () => {
    const client = new TelephonyMonitorService("http://example.invalid");
    const signal = new AbortController().signal;
    client.ax.defaults.adapter = async (config) => {
      expect(config.method).toBe("get");
      expect(config.signal).toBe(signal);
      const operators = config.url?.endsWith("/operators");
      expect(config.url).toBe(
        `/api/customers/monitor/telephony/schedules/7${operators ? "/operators" : ""}`,
      );
      if (operators) expect(config.params).toEqual({ search: "Livre", page: 2, pageSize: 20 });
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: {
          data: operators
            ? { items: [{ id: "15", label: "Livre" }], page: 2, pageSize: 20, totalCount: 25 }
            : schedule,
        },
      };
    };
    expect(await client.schedule(7, signal)).toEqual(schedule);
    expect(
      (await client.scheduleOperators(7, { search: "Livre", page: 2, pageSize: 20 }, signal))
        .items[0].id,
    ).toBe("15");
  });

  it("sends a partial civil patch once, with version/operation and automatic auth retry disabled", async () => {
    const client = new TelephonyMonitorService("http://example.invalid");
    const patch = {
      operationId: "adf2e5a1-1cd9-460b-bbba-92ea291380e8",
      version: "v1",
      changes: { scheduledAt: "2026-10-21T00:05:00" },
    };
    const signal = new AbortController().signal;
    let attempts = 0;
    client.ax.defaults.adapter = async (config) => {
      attempts++;
      expect(config.method).toBe("patch");
      expect(config.signal).toBe(signal);
      expect(config).toMatchObject({ skipAuthRefresh: true });
      expect(JSON.parse(config.data)).toEqual(patch);
      throw new AxiosError("Sessão expirada", undefined, config, undefined, {
        status: 401,
        config,
        data: { message: "Sessão expirada" },
      } as never);
    };
    await expect(client.updateSchedule(7, patch, signal)).rejects.toThrow("Sessão expirada");
    expect(attempts).toBe(1);
  });

  it("accepts applied/replayed receipts and rejects a success for a different operation", async () => {
    const client = new TelephonyMonitorService("http://example.invalid");
    const signal = new AbortController().signal;
    const patch = { operationId: "operation-a", version: "v1", changes: { operatorId: 8 } };
    client.ax.defaults.adapter = async (config) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data:
        config.method === "patch"
          ? { data: schedule, operationId: "another-operation", status: "applied" }
          : { data: { status: "applied", detail: schedule } },
    });
    await expect(client.updateSchedule(7, patch, signal)).rejects.toThrow("confirmar a gravação");
    expect(await client.scheduleReceipt(7, patch.operationId, signal)).toEqual({
      status: "applied",
      detail: schedule,
    });
  });

  it("accepts a durable applied receipt without reread detail and validates detail when present", async () => {
    const client = new TelephonyMonitorService("http://example.invalid");
    const signal = new AbortController().signal;
    for (const detail of [undefined, schedule]) {
      client.ax.defaults.adapter = async (config) => ({
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { data: { status: "applied", ...(detail === undefined ? {} : { detail }) } },
      });
      expect(await client.scheduleReceipt(7, "operation-a", signal)).toEqual({
        status: "applied",
        ...(detail === undefined ? {} : { detail }),
      });
    }
    for (const detail of [null, { ...schedule, id: 8 }, { ...schedule, version: "" }]) {
      client.ax.defaults.adapter = async (config) => ({
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { data: { status: "applied", detail } },
      });
      await expect(client.scheduleReceipt(7, "operation-a", signal)).rejects.toThrow();
    }
  });

  it("refuses malformed detail, wrong agenda IDs, timezone dates and invalid receipt states", async () => {
    const client = new TelephonyMonitorService("http://example.invalid");
    for (const data of [
      { ...schedule, id: 8 },
      { ...schedule, scheduledAt: "2026-10-20T03:15:42Z" },
      { ...schedule, capabilities: null },
    ]) {
      client.ax.defaults.adapter = async (config) => ({
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { data },
      });
      await expect(client.schedule(7, new AbortController().signal)).rejects.toThrow();
    }
    client.ax.defaults.adapter = async (config) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: { data: { status: "failed" } },
    });
    await expect(
      client.scheduleReceipt(7, "operation", new AbortController().signal),
    ).rejects.toThrow("Resposta inválida");
  });
});
