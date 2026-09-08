import { describe, expect, it, vi } from "vitest";
import WhatsappClient from "./whatsapp.client";
import InternalChatClient from "./internal.client";

describe("reaction API contract", () => {
  it("preserves the target channel and complex emoji while propagating cancellation", async () => {
    const client = new WhatsappClient("http://localhost:8005");
    const snapshot = {
      messageId: 17,
      messageType: "wpp",
      clientId: 3,
      reactions: [],
      reactionsUpdatedAt: "2026-09-08T12:00:00Z",
    };
    const post = vi.spyOn(client.ax, "post").mockResolvedValue({ data: { data: snapshot } });
    const signal = new AbortController().signal;
    expect(await client.setMessageReaction(3, 17, "👩🏽‍💻", signal)).toEqual(snapshot);
    expect(post).toHaveBeenCalledWith(
      "/api/whatsapp/3/messages/17/reaction",
      { emoji: "👩🏽‍💻" },
      { signal },
    );
  });

  it("sends an explicit empty emoji for removal in both domains", async () => {
    const wpp = new WhatsappClient("http://localhost:8005");
    const internal = new InternalChatClient("http://localhost:8005");
    const postWpp = vi.spyOn(wpp.ax, "post").mockResolvedValue({ data: { data: {} } });
    const postInternal = vi.spyOn(internal.ax, "post").mockResolvedValue({ data: { data: {} } });
    await wpp.setMessageReaction(3, 17, "");
    await internal.setMessageReaction(17, "");
    expect(postWpp.mock.calls[0].slice(0, 2)).toEqual([
      "/api/whatsapp/3/messages/17/reaction",
      { emoji: "" },
    ]);
    expect(postInternal.mock.calls[0].slice(0, 2)).toEqual([
      "/api/internal/messages/17/reaction",
      { emoji: "" },
    ]);
  });

  it("propagates provider failures without reporting confirmation or retrying", async () => {
    const client = new WhatsappClient("http://localhost:8005");
    const post = vi
      .spyOn(client.ax, "post")
      .mockRejectedValue(new Error("Este provedor não suporta reações."));
    await expect(client.setMessageReaction(3, 17, "👍")).rejects.toThrow("não suporta");
    expect(post).toHaveBeenCalledTimes(1);
  });
});
