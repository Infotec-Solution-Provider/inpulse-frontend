import { describe, expect, it } from "vitest";
import type { WppMessage, WppChatWithDetails } from "@/lib/sdk-local";
import { mergeChangedMessages, mergeChangedChats, mergeChangedCache, type SessionChanges } from "./session-change-state";
import type { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";

const message = (id: number, chatId = 1, status = "RECEIVED", timestamp = "1000") =>
  ({ id, chatId, contactId: 10, status, timestamp, body: "original", from: "customer" }) as WppMessage;
const chat = (id = 1) => ({ id, contactId: 10, lastMessage: message(1), chatType: "wpp", isUnread: true }) as DetailedChat;
const empty = (): SessionChanges => ({ chats: [], messages: [], removedChatIds: [], removedMessageIds: [] });
describe("applying recovered state", () => {
  it("does not rebuild histories or chat lists for empty deltas", () => {
    const history = [message(1)];
    const chats = [chat()];
    const cache = { 10: history };
    expect(mergeChangedMessages(history, [])).toBe(history);
    expect(mergeChangedChats(chats, empty())).toBe(chats);
    expect(mergeChangedCache(cache, empty())).toBe(cache);
    expect(mergeChangedCache(cache, { ...empty(), messages: [{ ...message(2), contactId: 20 }] })[10]).toBe(history);
  });
  it("deduplicates socket and pull deliveries and applies edits/status to old IDs", () => {
    const current = [message(10), message(11)];
    const changed = { ...message(10, 1, "READ"), body: "edited" };
    const merged = mergeChangedMessages(current, [changed, message(11), message(2, 1, "RECEIVED", "500")]);
    expect(merged.map((item) => item.id)).toEqual([2, 10, 11]);
    expect(merged[1]).toMatchObject({ status: "READ", body: "edited" });
    expect(mergeChangedMessages(merged, [changed])).toEqual(merged);
  });
  it("updates previews/unread without replacing loaded histories", () => {
    const changes = { ...empty(), chats: [{ ...chat(), isUnread: false, lastMessage: message(11) } as WppChatWithDetails], messages: [message(11)] };
    expect(mergeChangedChats([chat()], changes)[0]).toMatchObject({ isUnread: false, lastMessage: { id: 11 } });
    expect(mergeChangedCache({ 10: [message(1)] }, changes)[10]?.map((m) => m.id)).toEqual([1, 11]);
  });
  it("removes revoked chats, physical deletions and cached data without clearing other conversations", () => {
    const changes = { ...empty(), removedChatIds: [1], removedMessageIds: [3] };
    expect(mergeChangedChats([chat(), chat(2)], changes).map((c) => c.id)).toEqual([2]);
    expect(mergeChangedCache({ 10: [message(1), message(2, 2), message(3, 2)] }, changes)[10]?.map((m) => m.id)).toEqual([2]);
  });
  it("moves an existing message to the new contact cache instead of duplicating its ID", () => {
    const moved = { ...message(1, 2), contactId: 20 };
    const cache = mergeChangedCache({ 10: [message(1)] }, { ...empty(), messages: [moved] });
    expect(cache[10]).toEqual([]);
    expect(cache[20]).toEqual([moved]);
  });
});
