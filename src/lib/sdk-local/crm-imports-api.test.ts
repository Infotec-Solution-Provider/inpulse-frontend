import { describe, expect, it } from "vitest";
import { AxiosError, type AxiosAdapter } from "axios";
import CrmImportsClient from "./crm-imports.client";
describe("import requests preserve tenant/session", () => {
  it("pins credentials and does not silently refresh reads or writes", async () => {
    const client = new CrmImportsClient("http://fixture.invalid", {
      instance: "tenant-a",
      token: "token-a",
    });
    const seen: { path?: string; method?: string }[] = [];
    client.ax.defaults.adapter = (async (config) => {
      expect(config.headers.get("Authorization")).toBe("Bearer token-a");
      expect(config.headers.get("x-crm-instance")).toBe("tenant-a");
      expect(config).toMatchObject({ skipAuthInjection: true, skipAuthRefresh: true });
      seen.push({ path: config.url, method: config.method });
      return {
        data: { data: { id: "job-a" } },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }) as AxiosAdapter;
    await client.capabilities();
    await client.preview({
      text: "a\nb",
      delimiter: ";",
      mapping: ["RAZAO"],
      mode: "create",
      identity: "document",
      originId: 1,
    });
    await client.result("job-a");
    await client.execute("job-a", [2]);
    await client.report("job-a");
    await client.discard("job-a");
    expect(seen).toHaveLength(6);
  });
  it("never retries a lost write response", async () => {
    const client = new CrmImportsClient("http://fixture.invalid", {
      instance: "tenant-a",
      token: "token-a",
    });
    let count = 0;
    client.ax.defaults.adapter = (async (config) => {
      count++;
      throw new AxiosError("lost", "ECONNRESET", config);
    }) as AxiosAdapter;
    await expect(client.execute("job-a", [2])).rejects.toThrow("lost");
    expect(count).toBe(1);
  });
});
