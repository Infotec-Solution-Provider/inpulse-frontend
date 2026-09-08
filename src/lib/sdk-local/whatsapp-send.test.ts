import { describe, expect, it, vi } from "vitest";
import WhatsappClient from "./whatsapp.client";

// form-data's browser entry resolves to the native FormData used by the application.
vi.mock("form-data", () => ({ default: globalThis.FormData }));

describe("message attempt HTTP contract", () => {
  it("sends one key in the header and multipart data with the original file options", async () => {
    const client = new WhatsappClient("http://localhost:8005");
    const post = vi
      .spyOn(client.ax, "post")
      .mockResolvedValue({ data: { data: { id: 41, status: "PENDING" } } });
    const controller = new AbortController();
    const result = await client.sendMessage(
      "3",
      "5511999999999",
      {
        idempotencyKey: "attempt-1",
        text: "caption",
        contactId: 8,
        chatId: 4,
        fileId: 22,
        sendAsAudio: true,
        sendAsDocument: false,
        quotedId: 17,
      },
      controller.signal,
    );
    const [url, form, config] = post.mock.calls[0];
    expect(url).toBe("/api/whatsapp/3/messages");
    expect((form as FormData).get("idempotencyKey")).toBe("attempt-1");
    expect((form as FormData).get("fileId")).toBe("22");
    expect((form as FormData).get("sendAsAudio")).toBe("true");
    expect((form as FormData).has("sendAsDocument")).toBe(false);
    expect(config?.headers?.["Idempotency-Key"]).toBe("attempt-1");
    expect(config?.signal).toBe(controller.signal);
    expect(result).toEqual({ id: 41, status: "PENDING" });
  });

  it("queries an attempt without sending anything again", async () => {
    const client = new WhatsappClient("http://localhost:8005");
    const get = vi
      .spyOn(client.ax, "get")
      .mockResolvedValue({ data: { data: { id: 41, status: "UNKNOWN" } } });
    const post = vi.spyOn(client.ax, "post");
    expect(await client.getMessageAttempt("3", "attempt-1")).toEqual({ id: 41, status: "UNKNOWN" });
    expect(get.mock.calls[0][0]).toBe("/api/whatsapp/3/message-attempts/attempt-1");
    expect(post).not.toHaveBeenCalled();
  });
});
