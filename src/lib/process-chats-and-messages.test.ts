import { expect, it } from "vitest";
import processChatsAndMessages from "./process-chats-and-messages";
import type { WppChatWithDetails, WppMessage } from "./sdk-local";

it("keeps summary preview, unread and pins without downloading conversation history", () => {
  const latest = { id: 20, contactId: 1, timestamp: "200", from: "me:1", status: "READ" } as WppMessage;
  const chats = [
    { id: 1, contactId: 1, lastMessage: latest, isUnread: true, isPinned: true },
    { id: 2, contactId: 2, lastMessage: null, isUnread: false },
  ] as WppChatWithDetails[];
  const result = processChatsAndMessages(chats, []);
  expect(result.chatsMessages).toEqual({});
  expect(result.detailedChats[0]).toMatchObject({ id: 1, lastMessage: latest, isUnread: true, isPinned: true });
  expect(result.detailedChats[1]).toMatchObject({ id: 2, lastMessage: null, isUnread: false });
});

it("still supports the legacy history response", () => {
  const latest = { id: 20, contactId: 1, timestamp: "200", from: "customer", status: "RECEIVED" } as WppMessage;
  const result = processChatsAndMessages([{ id: 1, contactId: 1 } as WppChatWithDetails], [latest]);
  expect(result.detailedChats[0]).toMatchObject({ lastMessage: latest, isUnread: true });
  expect(result.chatsMessages[1]).toEqual([latest]);
});
