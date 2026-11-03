import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, it, expect, vi } from "vitest";
import { authSession } from "../auth-session";
import CrmProposalsClient from "./crm-proposals.client";
afterEach(() => {
  authSession.clearConfiguration();
  vi.restoreAllMocks();
});
describe("proposal transport", () => {
  it.each(["list", "results", "forSchedule", "history", "change", "report"])(
    "pins the immutable credential and tenant for %s",
    async (method) => {
      const context = { instance: "a", token: "token-a" },
        client = new CrmProposalsClient("http://fixture.invalid", context);
      context.instance = "b";
      context.token = "token-b";
      authSession.setAccessToken("global-b");
      const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        expect(config.headers.get("Authorization")).toBe("Bearer token-a");
        expect(config.headers.get("x-crm-instance")).toBe("a");
        expect(config).toMatchObject({ skipAuthInjection: true, skipAuthRefresh: true });
        expect(config.url).not.toContain("token");
        return { config, status: 200, statusText: "OK", headers: {}, data: { data: [] } };
      });
      client.ax.defaults.adapter = adapter;
      const filters = { from: "2026-11-01", to: "2026-11-30" };
      const actions: Record<string, () => Promise<unknown>> = {
        list: () => client.list(filters),
        results: () => client.results(),
        forSchedule: () => client.forSchedule(41),
        history: () => client.history(11),
        change: () =>
          client.change(11, {
            operationId: "uuid",
            version: "version",
            action: "CANCEL",
            reason: "Revisão",
          }),
        report: () => client.report("http://reports.invalid", filters),
      };
      await actions[method]!();
      expect(adapter).toHaveBeenCalledTimes(1);
      if (method === "change")
        expect(JSON.parse(adapter.mock.calls[0]![0].data)).toMatchObject({
          action: "CANCEL",
          version: "version",
        });
      if (method === "report")
        expect(adapter.mock.calls[0]![0].url).toBe(
          "http://reports.invalid/api/reports/crm-proposals",
        );
    },
  );
  it.each([401, 503])("never refreshes/replays a mutation after status %s", async (status) => {
    const client = new CrmProposalsClient("http://fixture.invalid", {
        instance: "a",
        token: "token",
      }),
      refresh = vi.spyOn(authSession, "forceRefresh");
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("unknown", "ERR_BAD_RESPONSE", config, undefined, {
        config,
        status,
        statusText: "Failure",
        headers: {},
        data: { outcome: "UNKNOWN" },
      });
    });
    client.ax.defaults.adapter = adapter;
    await expect(
      client.change(11, { operationId: "uuid", version: "v", action: "DELETE", reason: "Revisão" }),
    ).rejects.toBeInstanceOf(Error);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
