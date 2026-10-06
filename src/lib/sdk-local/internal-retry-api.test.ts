import { describe, expect, it, vi } from "vitest";
import InternalChatClient from "./internal.client";

describe("internal WhatsApp retry API contract", () => {
  it("posts to the retry endpoint without confirmation by default", async () => {
    const client = new InternalChatClient("http://localhost:8005");
    const post = vi
      .spyOn(client.ax, "post")
      .mockResolvedValue({ data: { message: "Reenvio agendado", data: { id: 17, status: "PENDING" } } });
    expect(await client.retryWhatsappDelivery(17)).toEqual({ id: 17, status: "PENDING" });
    expect(post).toHaveBeenCalledWith("/api/internal/messages/17/whatsapp-retry", {
      confirmUncertain: false,
    });
  });

  it("forwards an explicit uncertain-delivery confirmation", async () => {
    const client = new InternalChatClient("http://localhost:8005");
    const post = vi
      .spyOn(client.ax, "post")
      .mockResolvedValue({ data: { data: { id: 18, status: "PENDING" } } });
    await client.retryWhatsappDelivery(18, true);
    expect(post).toHaveBeenCalledWith("/api/internal/messages/18/whatsapp-retry", {
      confirmUncertain: true,
    });
  });
});
