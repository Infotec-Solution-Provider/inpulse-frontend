import { describe, expect, it, vi } from "vitest";
import CrmMarketingClient from "./crm-marketing.client";
describe("visual ordering SDK", () => {
  it("reads a full scoped list through the canonical endpoint", async () => {
    const client = new CrmMarketingClient("http://fixture", "pinned-token", "tenant-a");
    const snapshot = { kind: "cities", scope: "SP", items: [], revision: "snapshot" };
    const get = vi.spyOn(client.ax, "get").mockResolvedValue({ data: snapshot });
    expect(await client.catalogOrdering("cities", "SP")).toEqual(snapshot);
    expect(get).toHaveBeenCalledExactlyOnceWith("/api/crm/catalog-ordering/cities", {
      params: { scope: "SP" },
    });
  });
  it("saves all identities and pins the tenant and token with authentication retries disabled", async () => {
    const client = new CrmMarketingClient("http://fixture", "pinned-token", "tenant-a");
    const put = vi.spyOn(client.ax, "put").mockResolvedValue({ data: { revision: "after" } });
    const payload = { scope: "all", ids: [3, 1, 2], revision: "before" };
    await client.saveCatalogOrdering("segments", payload);
    expect(put).toHaveBeenCalledExactlyOnceWith(
      "/api/crm/catalog-ordering/segments",
      payload,
      expect.objectContaining({
        headers: { Authorization: "Bearer pinned-token", "x-crm-instance": "tenant-a" },
        skipAuthRefresh: true,
        skipAuthInjection: true,
      }),
    );
  });
  it("preserves unknown write errors without retrying or changing payload", async () => {
    const client = new CrmMarketingClient("http://fixture");
    const error = { response: { status: 503, data: { outcome: "UNKNOWN" } } };
    const put = vi.spyOn(client.ax, "put").mockRejectedValue(error);
    await expect(
      client.saveCatalogOrdering("states", { scope: "all", ids: ["SP"], revision: "before" }),
    ).rejects.toBe(error);
    expect(put).toHaveBeenCalledTimes(1);
  });
});
