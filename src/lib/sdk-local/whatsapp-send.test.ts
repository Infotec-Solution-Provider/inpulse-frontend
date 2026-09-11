import { describe, expect, it, vi } from "vitest";
import WhatsappClient from "./whatsapp.client";
import { sendDirectMessage, sendIdentifiedMessage, UnconfirmedMessageSendError } from "../utils/reliable-message-send";

// form-data's browser entry resolves to the native FormData used by the application.
vi.mock("form-data", () => ({ default: globalThis.FormData }));

describe("message attempt HTTP contract", () => {
  it.each(["6", "11"])("sends channel %s once without a lookup or queue key", async (clientId) => {
    const client = new WhatsappClient("http://localhost:8005");
    const post = vi.spyOn(client.ax, "post").mockResolvedValue({ data: { data: { id: 41, status: "SENT" } } });
    const get = vi.spyOn(client.ax, "get");
    await sendDirectMessage({ idempotencyKey: "local-click", text: "hello", contactId: 8, fileId: 22 },
      (data) => client.sendMessage(clientId, "5511999999999", data));
    expect(post).toHaveBeenCalledTimes(1);
    const [url, form, config] = post.mock.calls[0];
    expect(url).toBe(`/api/whatsapp/${clientId}/messages`);
    expect((form as FormData).has("idempotencyKey")).toBe(false);
    expect((form as FormData).get("fileId")).toBe("22");
    expect(config?.headers?.["Idempotency-Key"]).toBeUndefined();
    expect(get).not.toHaveBeenCalled();
  });
  it("keeps direct sending compatible with backends without message attempts", async () => {
    const client = new WhatsappClient("http://localhost:8005");
    const post = vi.spyOn(client.ax, "post").mockResolvedValue({ data: { data: { id: 41, status: "SENT" } } });
    const get = vi.spyOn(client.ax, "get");
    await client.sendMessage("6", "5511999999999", { text: "hello", contactId: 8 });
    const [, form, config] = post.mock.calls[0];
    expect((form as FormData).has("idempotencyKey")).toBe(false);
    expect(config?.headers?.["Idempotency-Key"]).toBeUndefined();
    expect(get).not.toHaveBeenCalled();
  });

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

  it("dispatches an identified message without a preliminary GET", async () => {
    const client = new WhatsappClient("http://localhost:8005");
    const post = vi.spyOn(client.ax, "post").mockResolvedValue({ data: { data: { id: 41, status: "PENDING" } } });
    const get = vi.spyOn(client.ax, "get");
    await sendIdentifiedMessage(
      { idempotencyKey: "attempt-1", text: "hello", contactId: 8 },
      (data) => client.sendMessage("6", "5511999999999", data),
      (key) => client.getMessageAttempt("6", key),
    );
    expect(post).toHaveBeenCalledTimes(1);
    expect((post.mock.calls[0][1] as FormData).get("idempotencyKey")).toBe("attempt-1");
    expect(post.mock.calls[0][2]?.headers?.["Idempotency-Key"]).toBe("attempt-1");
    expect(get).not.toHaveBeenCalled();
  });

  it("looks up an encoded attempt key with the session abort signal", async () => {
    const client = new WhatsappClient("http://localhost:8005");
    const get = vi.spyOn(client.ax, "get").mockResolvedValue({ data: { data: { id: 41, status: "PENDING" } } });
    const controller = new AbortController();
    expect(await client.getMessageAttempt("6", "attempt/a b", controller.signal))
      .toEqual({ id: 41, status: "PENDING" });
    expect(get).toHaveBeenCalledExactlyOnceWith(
      "/api/whatsapp/6/message-attempts/attempt%2Fa%20b", { signal: controller.signal },
    );
  });

  it.each([false, true])("returns null for an attempt 404 (wrapped=%s)", async (wrapped) => {
    const client = new WhatsappClient("http://localhost:8005");
    const error = { response: { status: 404 } };
    vi.spyOn(client.ax, "get").mockRejectedValue(wrapped ? new Error("not found", { cause: error }) : error);
    await expect(client.getMessageAttempt("6", "attempt-1")).resolves.toBeNull();
  });

  it.each([401, 403, 500])("does not conceal HTTP %s lookup failures", async (status) => {
    const client = new WhatsappClient("http://localhost:8005");
    const error = new Error("lookup failed", { cause: { response: { status } } });
    vi.spyOn(client.ax, "get").mockRejectedValue(error);
    await expect(client.getMessageAttempt("6", "attempt-1")).rejects.toBe(error);
  });

  it("does not issue a second POST after a timeout followed by a missing attempt", async () => {
    const client = new WhatsappClient("http://localhost:8005");
    const post = vi.spyOn(client.ax, "post").mockRejectedValue(new Error("timeout"));
    const get = vi.spyOn(client.ax, "get").mockRejectedValue(new Error("not found", { cause: { response: { status: 404 } } }));
    await expect(sendIdentifiedMessage(
      { idempotencyKey: "attempt-1", text: "hello", contactId: 8 },
      (data) => client.sendMessage("6", "5511999999999", data),
      (key) => client.getMessageAttempt("6", key),
    )).rejects.toBeInstanceOf(UnconfirmedMessageSendError);
    expect(post).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledExactlyOnceWith("/api/whatsapp/6/message-attempts/attempt-1", { signal: undefined });
  });


});
