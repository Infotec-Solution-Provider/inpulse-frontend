import { describe, expect, it, vi } from "vitest";
import InternalChatClient from "./internal.client";
import WhatsappClient from "./whatsapp.client";

describe("paginated chat history clients", () => {
  it("requests WhatsApp summaries and cursor pages without message content", async () => {
    const client = new WhatsappClient("http://localhost");
    const get = vi
      .spyOn(client.ax, "get")
      .mockResolvedValueOnce({ data: { chats: [], messages: [] } })
      .mockResolvedValueOnce({
        data: { data: { messages: [], quotedMessages: [], nextCursor: 100 } },
      });

    await client.getChatsBySession(false, true);
    const page = await client.getChatMessagesPage(42, 50, 150);

    expect(get.mock.calls[0]?.[0]).toBe("/api/whatsapp/session/chats?messages=false&contact=true");
    expect(get.mock.calls[1]?.[0]).toBe("/api/whatsapp/chats/42/messages?limit=50&beforeId=150");
    expect(page.nextCursor).toBe(100);
  });

  it("requests internal summaries and cursor pages without message content", async () => {
    const client = new InternalChatClient("http://localhost");
    const get = vi
      .spyOn(client.ax, "get")
      .mockResolvedValueOnce({ data: { chats: [], messages: [] } })
      .mockResolvedValueOnce({
        data: { data: { messages: [], quotedMessages: [], nextCursor: null } },
      });

    await client.getInternalChatsBySession(null, false);
    const page = await client.getChatMessagesPage(7, 25, 75);

    expect(get.mock.calls[0]?.[0]).toBe("/api/internal/session/chats?messages=false");
    expect(get.mock.calls[1]?.[0]).toBe("/api/internal/chats/7/messages?limit=25&beforeId=75");
    expect(page.nextCursor).toBeNull();
  });
});
