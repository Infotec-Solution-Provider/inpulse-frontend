import { describe, expect, it } from "vitest";
import type { Dispatch, SetStateAction } from "react";
import type { InternalMessage, WppMessage, WppMessageReactionEventData } from "@/lib/sdk-local";
import MessageReactionHandler from "./message-reaction";
import InternalMessageReactionHandler from "./internal-message-reaction";

function state<T>(initial: T) {
  let current = initial;
  const set: Dispatch<SetStateAction<T>> = (update) => {
    current = typeof update === "function" ? (update as (previous: T) => T)(current) : update;
  };
  return { set, get: () => current };
}
const event: WppMessageReactionEventData = {
  messageId: 17,
  messageType: "wpp",
  clientId: 3,
  reactions: [{ actorId: "a", emoji: "👍", fromMe: false, reactedAt: "2026-09-08T12:00:00.000Z" }],
  reactionsUpdatedAt: "2026-09-08T12:00:00.000Z",
};

describe("reaction event domain isolation", () => {
  it("applies only to the matching table when WhatsApp and internal IDs collide", () => {
    const wpp = state({ 5: [{ id: 17, clientId: 3 } as WppMessage] });
    const internal = state({ 8: [{ id: 17, clientId: 3 } as InternalMessage] });
    const currentWpp = state<WppMessage[]>([]);
    const currentInternal = state<InternalMessage[]>([]);
    MessageReactionHandler(wpp.set, currentWpp.set)(event);
    InternalMessageReactionHandler(internal.set, currentInternal.set)(event);
    expect(wpp.get()[5][0].reactions).toHaveLength(1);
    expect(internal.get()[8][0].reactions).toBeUndefined();
    const internalEvent = { ...event, messageType: "internal" as const, reactions: [] };
    MessageReactionHandler(wpp.set, currentWpp.set)(internalEvent);
    InternalMessageReactionHandler(internal.set, currentInternal.set)(internalEvent);
    expect(wpp.get()[5][0].reactions).toHaveLength(1);
    expect(internal.get()[8][0].reactions).toEqual([]);
  });

  it("ignores ambiguous legacy events instead of guessing a message domain", () => {
    const original = { 5: [{ id: 17 } as WppMessage] };
    const cache = state(original);
    MessageReactionHandler(
      cache.set,
      state<WppMessage[]>([]).set,
    )({ messageId: 17, reaction: "👍" });
    expect(cache.get()).toBe(original);
  });

  it("reads the current chat at event time and does not update another domain's open conversation", () => {
    const cache = state({ 5: [{ id: 17, clientId: 3 } as WppMessage] });
    const original = [{ id: 17, clientId: 3 } as WppMessage];
    const current = state(original);
    const chatRef = { current: { chatType: "wpp" } };
    const handler = MessageReactionHandler(cache.set, current.set, chatRef);
    chatRef.current = { chatType: "internal" };
    handler(event);
    expect(cache.get()[5][0].reactions).toHaveLength(1);
    expect(current.get()).toBe(original);
  });

  it("updates internal monitor caches and supports confirmed removal", () => {
    const cache = state({ 8: [{ id: 17 } as InternalMessage] });
    const monitor = state({ 8: [{ id: 17 } as InternalMessage] });
    const current = state([{ id: 17 } as InternalMessage]);
    const handler = InternalMessageReactionHandler(
      cache.set,
      current.set,
      { current: { chatType: "internal" } },
      monitor.set,
    );
    handler({ ...event, messageType: "internal" });
    handler({
      ...event,
      messageType: "internal",
      reactions: [],
      reactionsUpdatedAt: "2026-09-08T12:00:01.000Z",
    });
    expect(cache.get()[8][0].reactions).toEqual([]);
    expect(monitor.get()[8][0].reactions).toEqual([]);
    expect(current.get()[0].reaction).toBe("");
  });
});
