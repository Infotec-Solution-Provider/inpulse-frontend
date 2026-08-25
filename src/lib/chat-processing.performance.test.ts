import { describe, expect, it } from "vitest";
import processChatsAndMessages from "./process-chats-and-messages";
import processInternalChatsAndMessages from "./process-internal-chats-and-messages";

describe("large chat collections", () => {
  it("processes 2,000 WhatsApp chats and 20,000 messages within the lab budget", () => {
    const chats = Array.from({ length: 2_000 }, (_, index) => ({
      id: index + 1,
      contactId: index + 1,
    })) as never[];
    const messages = Array.from({ length: 20_000 }, (_, index) => ({
      id: index + 1,
      contactId: (index % 2_000) + 1,
      timestamp: String(index + 1),
      from: index % 3 ? "contact:test" : "me:test",
      status: index % 7 ? "READ" : "SENT",
    })) as never[];

    const startedAt = performance.now();
    const result = processChatsAndMessages(chats, messages);
    const duration = performance.now() - startedAt;

    expect(result.detailedChats).toHaveLength(2_000);
    expect(Object.values(result.chatsMessages)).toHaveLength(2_000);
    expect(duration).toBeLessThan(1_000);
  });

  it("processes 2,000 internal chats without nested user/message scans", () => {
    const users = Array.from({ length: 2_001 }, (_, index) => ({
      CODIGO: index + 1,
      NOME: `User ${index + 1}`,
    })) as never[];
    const chats = Array.from({ length: 2_000 }, (_, index) => ({
      id: index + 1,
      participants: [
        { internalChatId: index + 1, userId: 1, joinedAt: "2026-01-01" },
        { internalChatId: index + 1, userId: index + 2, joinedAt: "2026-01-01" },
      ],
    })) as never[];
    const messages = Array.from({ length: 20_000 }, (_, index) => ({
      id: index + 1,
      internalChatId: (index % 2_000) + 1,
      timestamp: String(index + 1),
      from: index % 3 ? "user:2" : "user:1",
      status: index % 7 ? "READ" : "SENT",
    })) as never[];

    const startedAt = performance.now();
    const result = processInternalChatsAndMessages(1, users, chats, messages);
    const duration = performance.now() - startedAt;

    expect(result.detailedChats).toHaveLength(2_000);
    expect(result.detailedChats[0]?.users).toHaveLength(2);
    expect(duration).toBeLessThan(1_000);
  });
});
