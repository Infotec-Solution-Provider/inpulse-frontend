import { describe, expect, it } from "vitest";
import processChatsAndMessages from "./process-chats-and-messages";
import processInternalChatsAndMessages from "./process-internal-chats-and-messages";

describe("chat summary processing", () => {
  it("uses backend summaries without scanning all messages per chat", () => {
    const summary = {
      id: 99,
      contactId: 1,
      timestamp: "99",
      from: "contact:1",
      to: "me:1",
      type: "chat",
      body: "summary",
      status: "READ",
    };
    const { detailedChats, chatsMessages } = processChatsAndMessages(
      [{ id: 1, contactId: 1, lastMessage: summary, isUnread: true } as never],
      [],
    );
    expect(detailedChats[0]?.lastMessage).toBe(summary);
    expect(detailedChats[0]?.isUnread).toBe(true);
    expect(chatsMessages).toEqual({});
  });

  it("derives unread and last-message values in a single message pass", () => {
    const messages = [
      { id: 1, contactId: 10, timestamp: "1", from: "me:1", status: "READ" },
      { id: 2, contactId: 10, timestamp: "2", from: "contact:10", status: "SENT" },
    ] as never[];
    const { detailedChats } = processChatsAndMessages(
      [{ id: 10, contactId: 10 } as never],
      messages,
    );
    expect(detailedChats[0]?.lastMessage?.id).toBe(2);
    expect(detailedChats[0]?.isUnread).toBe(true);
  });
});

describe("internal chat summary processing", () => {
  const user = { CODIGO: 1, NOME: "User" } as never;
  const participant = { internalChatId: 1, userId: 1, joinedAt: "2026-01-01" };

  it("uses backend summary fields and maps participants by id", () => {
    const lastMessage = { id: 5, internalChatId: 1, timestamp: "5" };
    const { detailedChats } = processInternalChatsAndMessages(
      1,
      [user],
      [{ id: 1, participants: [participant], isUnread: true, lastMessage } as never],
      [],
    );
    expect(detailedChats[0]?.lastMessage).toBe(lastMessage);
    expect(detailedChats[0]?.isUnread).toBe(true);
    expect(detailedChats[0]?.users).toEqual([user]);
  });
});
