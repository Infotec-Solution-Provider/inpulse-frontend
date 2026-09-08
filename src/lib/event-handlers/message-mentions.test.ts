import { describe, expect, it, vi } from "vitest";
import type { Dispatch, SetStateAction } from "react";
import type {
  InternalChatClient,
  InternalMessage,
  MessageMentionEntity,
  User,
  WhatsappClient,
  WppMessage,
} from "@/lib/sdk-local";
import type { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import type { DetailedInternalChat } from "@/app/(private)/[instance]/internal-context";
import ReceiveMessageHandler from "./message";
import InternalReceiveMessageHandler from "./internal-message";
import EditedMessageHandler from "./message-edit";
import InternalMessageEditHandler from "./internal-message-edit";
import { createMentionDirectory } from "../utils/message-mentions";

function state<T>(initial: T) {
  let current = initial;
  const set: Dispatch<SetStateAction<T>> = (update) => {
    current = typeof update === "function" ? (update as (previous: T) => T)(current) : update;
  };
  return { set, get: () => current };
}
const mentions: MessageMentionEntity[] = [
  { id: "777@lid", type: "lid", tokens: ["@777"], displayName: "Participante" },
];
const wpp = {
  id: 811,
  instance: "mentions-test",
  body: "Legenda @777",
  type: "image",
  from: "5511@c.us",
  to: "me:5512",
  contactId: 5,
  status: "READ",
  timestamp: "1788860000000",
  mentionEntities: mentions,
} as WppMessage;
const internal = {
  ...wpp,
  id: 812,
  internalChatId: 8,
  from: "777@lid",
} as unknown as InternalMessage;
const loggedUser = { CODIGO: 12, NOME: "Operadora", WHATSAPP: "55119876" } as User;

describe("mention receive and edit events", () => {
  it("keeps raw caption and mention metadata on legacy WPP replay without mutating old state", () => {
    const previous = Object.freeze({ ...wpp });
    const oldMessages = Object.freeze([previous]) as unknown as WppMessage[];
    const cache = state<Record<number, WppMessage[]>>({ 5: oldMessages });
    const current = state<WppMessage[]>([previous]);
    const chats = state<DetailedChat[]>([
      { id: 2, chatType: "wpp", contactId: 5, lastMessage: previous } as DetailedChat,
    ]);
    const notify = vi.fn();
    const handler = ReceiveMessageHandler(
      {} as WhatsappClient,
      cache.set,
      current.set,
      chats.set,
      { current: chats.get()[0] },
      chats.get(),
      notify,
    );
    handler({ message: { ...wpp, mentionEntities: undefined } });
    expect(cache.get()[5][0].mentionEntities).toEqual(mentions);
    expect(current.get()[0].mentionEntities).toEqual(mentions);
    expect(chats.get()[0].lastMessage?.mentionEntities).toEqual(mentions);
    expect(cache.get()[5][0].body).toBe(wpp.body);
    expect(oldMessages[0]).toBe(previous);
  });
  it("uses the shared live directory for WPP caption notifications", () => {
    const notify = vi.fn();
    const handler = ReceiveMessageHandler(
      {} as WhatsappClient,
      state<Record<number, WppMessage[]>>({}).set,
      state<WppMessage[]>([]).set,
      state<DetailedChat[]>([]).set,
      { current: null },
      [],
      notify,
      () => createMentionDirectory([], [], new Map([["777@lid", "Nome manual"]])),
    );
    handler({ message: wpp });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ body: "Legenda @Nome manual" }));
  });
  it("updates group messages with late metadata without a duplicate notification", () => {
    const cache = state<Record<number, InternalMessage[]>>({});
    const current = state<InternalMessage[]>([]);
    const chats = state<DetailedInternalChat[]>([
      { id: 8, chatType: "internal", lastMessage: null } as DetailedInternalChat,
    ]);
    const notify = vi.fn();
    const api = {
      markChatMessagesAsRead: vi.fn().mockResolvedValue(undefined),
    } as unknown as InternalChatClient;
    const handler = InternalReceiveMessageHandler(
      api,
      cache.set,
      current.set,
      chats.set,
      { current: chats.get()[0] },
      [loggedUser],
      [],
      loggedUser,
      new Map(),
      new Map(),
      notify,
    );
    handler({ message: { ...internal, mentionEntities: undefined } });
    handler({ message: internal });
    expect(current.get()).toHaveLength(1);
    expect(current.get()[0].mentionEntities).toEqual(mentions);
    expect(cache.get()[8][0].mentionEntities).toEqual(mentions);
    expect(chats.get()[0].lastMessage?.mentionEntities).toEqual(mentions);
    expect(notify).toHaveBeenCalledTimes(1);
  });
  it("uses typed identities for internal mention alerts and never treats LID as user code", () => {
    const notify = vi.fn();
    const handler = InternalReceiveMessageHandler(
      {} as InternalChatClient,
      state<Record<number, InternalMessage[]>>({}).set,
      state<InternalMessage[]>([]).set,
      state<DetailedInternalChat[]>([]).set,
      { current: null },
      [loggedUser],
      [],
      loggedUser,
      new Map(),
      new Map(),
      notify,
    );
    handler({
      message: {
        ...internal,
        id: 813,
        body: "@~12",
        mentionEntities: [{ ...mentions[0], tokens: ["@~12"] }],
      },
    });
    expect(notify).toHaveBeenLastCalledWith(
      expect.objectContaining({ event: "new_message", body: "@Participante" }),
    );
    handler({
      message: {
        ...internal,
        id: 814,
        body: "@~12",
        mentionEntities: [{ id: "user:12", type: "user", tokens: ["@~12"] }],
      },
    });
    expect(notify).toHaveBeenLastCalledWith(
      expect.objectContaining({ event: "mention", body: "@Operadora" }),
    );
  });
  it("clears obsolete WPP metadata after editing body and accepts replacement metadata", () => {
    const original = Object.freeze([wpp]) as unknown as WppMessage[];
    const cache = state<Record<number, WppMessage[]>>({ 5: original });
    const current = state<WppMessage[]>([wpp]);
    const handler = EditedMessageHandler(cache.set, current.set, {
      current: { chatType: "wpp", contactId: 5 } as DetailedChat,
    });
    handler({ contactId: 5, messageId: 811, newText: "Novo @888" });
    expect(current.get()[0].mentionEntities).toBeUndefined();
    expect(cache.get()[5][0].mentionEntities).toBeUndefined();
    expect(original[0].mentionEntities).toEqual(mentions);
    handler({ contactId: 5, messageId: 811, newText: "Sem menções", mentionEntities: [] });
    expect(current.get()[0].mentionEntities).toEqual([]);
  });
  it("preserves same-body metadata on internal legacy edits but clears changed bodies", () => {
    const cache = state<Record<number, InternalMessage[]>>({ 8: [internal] });
    const current = state<InternalMessage[]>([internal]);
    const handler = InternalMessageEditHandler(cache.set, current.set, {
      current: { chatType: "internal", id: 8 } as DetailedInternalChat,
    });
    handler({ chatId: 8, internalMessageId: 812, newText: internal.body });
    expect(current.get()[0].mentionEntities).toEqual(mentions);
    handler({ chatId: 8, internalMessageId: 812, newText: "Outro @999" });
    expect(current.get()[0].mentionEntities).toBeUndefined();
    expect(cache.get()[8][0].mentionEntities).toBeUndefined();
  });
});
