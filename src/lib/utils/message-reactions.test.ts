import { describe, expect, it, vi } from "vitest";
import type {
  InternalMessage,
  MessageReaction,
  MessageReactionSnapshot,
  WppMessage,
} from "@/lib/sdk-local";
import {
  applyMessageReaction,
  applyReactionToMessages,
  assertReactionConfirmation,
  canReactToInternalMessage,
  canReactToWhatsappMessage,
  groupMessageReactions,
  preserveReactionHistory,
  preserveReactionHistoryCache,
  ReactionRequestCoordinator,
} from "./message-reactions";

const older = "2026-09-08T12:00:00.000Z";
const newer = "2026-09-08T12:00:01.000Z";
const ours: MessageReaction = {
  actorId: "account@lid",
  emoji: "👍",
  fromMe: true,
  reactedAt: older,
};
const contact: MessageReaction = {
  actorId: "contact@lid",
  emoji: "❤️",
  fromMe: false,
  reactedAt: older,
};
const message = (): WppMessage =>
  ({
    id: 17,
    clientId: 3,
    from: "contact@lid",
    wwebjsId: "remote-message",
    status: "RECEIVED",
    reactions: [ours, contact],
    reactionsUpdatedAt: older,
  }) as WppMessage;
const snapshot = (reactions: MessageReaction[], revision = newer): MessageReactionSnapshot => ({
  messageId: 17,
  messageType: "wpp",
  clientId: 3,
  reactions,
  reactionsUpdatedAt: revision,
});

describe("confirmed reaction snapshots", () => {
  it("changes one actor without replacing the other participants' reactions", () => {
    const updated = applyMessageReaction(
      message(),
      snapshot([{ ...ours, emoji: "😂", reactedAt: newer }, contact]),
    );
    expect(updated.reactions).toEqual([{ ...ours, emoji: "😂", reactedAt: newer }, contact]);
  });

  it("clears reactions and the legacy display when the confirmed snapshot is empty", () => {
    const updated = applyMessageReaction({ ...message(), reaction: "👍❤️" }, snapshot([]));
    expect(updated).toMatchObject({ reactions: [], reaction: "", reactionsUpdatedAt: newer });
  });

  it("does not resurrect a removed reaction with an older or same-revision HTTP response", () => {
    const removed = applyMessageReaction(message(), snapshot([]));
    expect(applyMessageReaction(removed, snapshot([ours], older), "http")).toBe(removed);
    expect(applyMessageReaction(removed, snapshot([ours]), "http")).toBe(removed);
    expect(applyMessageReaction(removed, snapshot([ours]))).toBe(removed);
  });

  it("lets same-revision socket removal win and preserves the other actor", () => {
    const updated = applyMessageReaction(message(), snapshot([contact], older));
    expect(updated.reactions).toEqual([contact]);
    expect(applyMessageReaction(updated, snapshot([ours, contact], older)).reactions).toEqual([
      contact,
    ]);
  });

  it("rejects a reaction for another channel even when numeric message IDs coincide", () => {
    const original = message();
    expect(applyMessageReaction(original, { ...snapshot([]), clientId: 99 })).toBe(original);
    expect(applyMessageReaction(original, { ...snapshot([]), messageId: 99 })).toBe(original);
  });

  it("does not let an unversioned legacy string erase known actor identities", () => {
    const original = message();
    expect(applyMessageReaction(original, { messageId: 17, reaction: "😂" })).toBe(original);
  });

  it("deduplicates each actor and marks the shared account from fromMe only", () => {
    const groups = groupMessageReactions([
      ours,
      { ...contact, emoji: "👍" },
      { ...ours, reactedAt: newer },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ emoji: "👍", count: 2, fromMe: true });
    expect(groupMessageReactions([{ ...ours, fromMe: false }])[0].fromMe).toBe(false);
  });

  it("preserves array identity if the event targets a different message", () => {
    const previous = [message()];
    expect(applyReactionToMessages(previous, { ...snapshot([]), messageId: 99 })).toBe(previous);
  });

  it("accepts only confirmations for the requested domain, message and channel", () => {
    const target = { messageType: "wpp" as const, messageId: 17, clientId: 3 };
    expect(assertReactionConfirmation(snapshot([]), target)).toEqual(snapshot([]));
    expect(() =>
      assertReactionConfirmation({ ...snapshot([]), messageType: "internal" }, target),
    ).toThrow("não confirmou");
    expect(() => assertReactionConfirmation({ ...snapshot([]), messageId: 18 }, target)).toThrow(
      "não confirmou",
    );
    expect(() => assertReactionConfirmation({ ...snapshot([]), clientId: 9 }, target)).toThrow(
      "não confirmou",
    );
  });
});

describe("reaction request concurrency", () => {
  it("shares repeated clicks, awaits confirmation, and blocks a different reaction while pending", async () => {
    const coordinator = new ReactionRequestCoordinator();
    let confirm!: (result: MessageReactionSnapshot) => void;
    const request = vi.fn(
      () =>
        new Promise<MessageReactionSnapshot>((resolve) => {
          confirm = resolve;
        }),
    );
    const target = { messageId: 17, messageType: "wpp" as const, clientId: 3 };
    const first = coordinator.run("tenant/user", target, "👍", request);
    const second = coordinator.run("tenant/user", target, "👍", request);
    expect(first).toBe(second);
    await expect(coordinator.run("tenant/user", target, "❤️", request)).rejects.toThrow("Aguarde");
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);
    confirm(snapshot([ours]));
    expect(await first).toMatchObject({ reactions: [ours] });
    expect(
      await coordinator.run("tenant/user", target, "", async () => snapshot([])),
    ).toMatchObject({ reactions: [] });
  });

  it("does not retry a provider failure or share operations across users/domains", async () => {
    const coordinator = new ReactionRequestCoordinator();
    const request = vi.fn(async () => {
      throw new Error("provider unavailable");
    });
    const target = { messageId: 17, messageType: "wpp" as const, clientId: 3 };
    const results = await Promise.allSettled([
      coordinator.run("tenant/user-1", target, "👍", request),
      coordinator.run("tenant/user-2", target, "👍", request),
      coordinator.run("tenant/user-1", { ...target, messageType: "internal" }, "👍", request),
    ]);
    expect(results.every((result) => result.status === "rejected")).toBe(true);
    expect(request).toHaveBeenCalledTimes(3);
  });
});

describe("reaction capabilities", () => {
  it("permits identified REMOTE/WWEBJS messages only after delivery and blocks other providers", () => {
    expect(canReactToWhatsappMessage(message(), "REMOTE")).toBe(true);
    expect(canReactToWhatsappMessage(message(), "WWEBJS")).toBe(true);
    expect(canReactToWhatsappMessage(message(), "WABA")).toBe(false);
    expect(canReactToWhatsappMessage(message(), "GUPSHUP")).toBe(false);
    for (const status of ["PENDING", "UNKNOWN", "ERROR", "REVOKED"] as const) {
      expect(canReactToWhatsappMessage({ ...message(), status }, "REMOTE")).toBe(false);
    }
  });

  it("requires a synchronized WhatsApp group and provider message identity for internal messages", () => {
    const internal = { ...message(), internalChatId: 8 } as unknown as InternalMessage;
    const chat = { wppGroupId: "group@g.us" } as never;
    expect(canReactToInternalMessage(internal, chat)).toBe(true);
    expect(canReactToInternalMessage(internal, {} as never)).toBe(false);
    expect(canReactToInternalMessage({ ...internal, wwebjsId: null }, chat)).toBe(false);
    expect(canReactToInternalMessage(internal, chat, "WABA")).toBe(false);
    expect(canReactToInternalMessage({ ...internal, clientId: null }, chat)).toBe(false);
  });
});

describe("history reload reaction preservation", () => {
  it("keeps socket-confirmed removal while accepting new body/status from an older history snapshot", () => {
    const removed = applyMessageReaction(message(), snapshot([]));
    const reloaded = { ...message(), body: "updated body", status: "READ" as const };
    const merged = preserveReactionHistory([removed], [reloaded])[0];
    expect(merged).toMatchObject({
      reactions: [],
      reaction: "",
      reactionsUpdatedAt: newer,
      body: "updated body",
      status: "READ",
    });
  });

  it("does not resurrect an actor when cached history and removal have equal revisions", () => {
    const removed = applyMessageReaction(message(), snapshot([], older));
    expect(
      preserveReactionHistoryCache({ 5: [removed] }, { 5: [message()] })[5][0].reactions,
    ).toEqual([]);
  });

  it("keeps the newest known snapshot when monitor and active caches contain the same message", () => {
    const removed = applyMessageReaction(message(), snapshot([]));
    expect(preserveReactionHistory([removed, message()], [message()])[0].reactions).toEqual([]);
  });

  it("does not transfer reaction metadata across tenants with equal numeric IDs", () => {
    const removed = { ...applyMessageReaction(message(), snapshot([])), instance: "tenant-a" };
    const incoming = { ...message(), instance: "tenant-b" };
    expect(preserveReactionHistory([removed], [incoming])[0]).toBe(incoming);
  });
});
