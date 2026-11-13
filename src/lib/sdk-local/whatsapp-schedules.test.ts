import { describe, expect, it, vi } from "vitest";
import WhatsappClient from "./whatsapp.client";

describe("schedule HTTP contract", () => {
  it("uses the personal endpoint, global query and cancellation signal", async () => {
    const client = new WhatsappClient("http://127.0.0.1");
    const controller = new AbortController();
    const payload = { data: [], pagination: { current: 2, totalRows: 14, totalPages: 2 } };
    const get = vi.spyOn(client.ax, "get").mockResolvedValue({ data: payload });
    const response = await client.getMySchedules({ search: "ação & retorno", page: "2", period: "today" }, controller.signal);
    const [url, config] = get.mock.calls[0];
    const parsed = new URL(url, "http://127.0.0.1");
    expect(parsed.pathname).toBe("/api/whatsapp/schedules/mine");
    expect(parsed.searchParams.get("search")).toBe("ação & retorno");
    expect(parsed.searchParams.get("page")).toBe("2");
    expect(config?.signal).toBe(controller.signal);
    expect(response).toBe(payload);
  });

  it("preserves the administrative unified consumer", async () => {
    const client = new WhatsappClient("http://127.0.0.1");
    const get = vi.spyOn(client.ax, "get").mockResolvedValue({ data: { data: [] } });
    await client.getUnifiedSchedules({ userId: "7", perPage: "100" });
    const parsed = new URL(get.mock.calls[0][0], "http://127.0.0.1");
    expect(parsed.pathname).toBe("/api/whatsapp/schedules/unified");
    expect(parsed.searchParams.get("perPage")).toBe("100");
    expect(parsed.searchParams.get("userId")).toBe("7");
  });
});
