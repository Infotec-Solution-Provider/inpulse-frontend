import { describe, expect, it, vi } from "vitest";
import type { Dispatch, SetStateAction } from "react";
import type { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import type { SocketClient, WhatsappClient, WppMessage } from "@/lib/sdk-local";
import ChatStartedHandler from "./chat-started";
import ReceiveMessageHandler from "./message";
import ReadChatHandler from "./read-chat";
import { mergeChangedChats } from "../utils/session-change-state";

function state<T>(initial: T) {
  let value = initial;
  const set: Dispatch<SetStateAction<T>> = (next) => {
    value = typeof next === "function" ? (next as (previous: T) => T)(value) : next;
  };
  return { set, get: () => value };
}
const message = (from = "system:1") => ({ id: 5, contactId: 10, chatId: 1, from, to: "me:7", timestamp: "1000", status: "READ", type: "text", body: "" }) as WppMessage;
const chat = () => ({ id: 1, contactId: 10, isUnread: true, chatType: "wpp", lastMessage: message() }) as DetailedChat;

describe("unread on chat arrival and incremental recovery", () => {
  it("reproduces the old loss when polling a transfer whose messages were already read", () => {
    const delta = { chats: [{ ...chat(), isUnread: false }], messages: [], removedChatIds: [], removedMessageIds: [] };
    expect(mergeChangedChats([chat()], delta)[0].isUnread).toBe(false);
    // Persisting the recipient preference makes the authoritative summary survive replay.
    delta.chats[0].isUnread = true;
    const merged = mergeChangedChats([chat()], delta);
    expect(merged[0].isUnread).toBe(true);
    expect(mergeChangedChats(merged, delta)[0].isUnread).toBe(true);
    delta.chats[0].isUnread = false;
    expect(mergeChangedChats(merged, delta)[0].isUnread).toBe(false);
  });

  it.each([{ messages: [] }, { messages: [message("me:previous-operator")] }])("marks a new/transfer arrival unread regardless of history $messages", async ({ messages }) => {
    const chats = state<DetailedChat[]>([]);
    const api = { getChatById: vi.fn().mockResolvedValue({ ...chat(), isUnread: undefined, messages }) } as unknown as WhatsappClient;
    const handler = ChatStartedHandler(api, { joinRoom: vi.fn() } as unknown as SocketClient,
      vi.fn(), chats.set, vi.fn(), vi.fn(), { current: null });
    await handler({ chatId: 1 });
    expect(chats.get()[0]).toMatchObject({ id: 1, isUnread: true, lastMessage: messages[0] ?? null });
    await handler({ chatId: 1 });
    expect(chats.get()).toHaveLength(1);
    expect(chats.get()[0].isUnread).toBe(true);
  });

  it("retains unread through outgoing messages, and clears it when read by its recipient", () => {
    const chats = state([chat()]);
    const cache = state<Record<number, WppMessage[]>>({});
    const activeMessages = state<WppMessage[]>([]);
    const current = { current: null };
    const receive = ReceiveMessageHandler({} as WhatsappClient, cache.set, activeMessages.set, chats.set, current, chats.get());
    receive({ message: message("me:previous-operator") });
    expect(chats.get()[0].isUnread).toBe(true);
    const read = ReadChatHandler(current, chats.set, cache.set, activeMessages.set, 7);
    read({ contactId: 10, userId: 3 });
    expect(chats.get()[0].isUnread).toBe(true);
    read({ contactId: 10, userId: 7 });
    expect(chats.get()[0].isUnread).toBe(false);
  });

  it("continues clearing unread on receipt in the open conversation", () => {
    const chats = state([chat()]);
    const mark = vi.fn().mockResolvedValue(undefined);
    ReceiveMessageHandler({ markContactMessagesAsRead: mark } as unknown as WhatsappClient,
      vi.fn(), vi.fn(), chats.set, { current: chat() }, chats.get())({ message: { ...message("customer"), status: "RECEIVED" } });
    expect(chats.get()[0].isUnread).toBe(false);
    expect(mark).toHaveBeenCalledWith(10);
  });

  it("keeps a manually started chat read for its initiator", async () => {
    const chats = state<DetailedChat[]>([]);
    const api = { getChatById: vi.fn().mockResolvedValue({ ...chat(), messages: [message("system:1")] }) } as unknown as WhatsappClient;
    const intent = { current: 10 as number | null };
    const select = vi.fn();
    await ChatStartedHandler(api, { joinRoom: vi.fn() } as unknown as SocketClient,
      vi.fn(), chats.set, select, vi.fn(), intent)({ chatId: 1 });
    expect(chats.get()[0].isUnread).toBe(false);
    expect(select).toHaveBeenCalledWith(chats.get()[0]);
    expect(intent.current).toBeNull();
  });
});
