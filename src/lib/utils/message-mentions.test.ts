import { describe, expect, it } from "vitest";
import type { MessageMentionEntity, User, WppContact, WppMessage } from "@/lib/sdk-local";
import {
  canonicalMentionIdentity,
  createMentionDirectory,
  mentionDisplayText,
  preserveChatMentionHistory,
  preserveMentionHistory,
  preserveMentionHistoryCache,
  resolveMessageMentions,
} from "./message-mentions";
import { isInternalMentionForUser } from "./notification-preferences";

const user = { CODIGO: 12, NOME: "Operadora", WHATSAPP: "55119876" } as User;
const contact = {
  id: 1,
  name: "Cliente",
  phone: "55119876",
  whatsappId: "777@lid",
  instance: "a",
} as WppContact;
const entity = (overrides: Partial<MessageMentionEntity> = {}): MessageMentionEntity => ({
  id: "777@lid",
  type: "lid",
  tokens: ["@777"],
  ...overrides,
});
const directory = createMentionDirectory([user], [contact], new Map([["777@lid", "Nome manual"]]));
const msg = (changes: Partial<WppMessage> = {}) =>
  ({
    id: 9,
    instance: "a",
    body: "Olá @777",
    mentionEntities: [entity()],
    ...changes,
  }) as WppMessage;

describe("typed mention presentation", () => {
  it("keeps internal codes, phone JIDs and LIDs in separate namespaces", () => {
    expect(canonicalMentionIdentity("12")).toBeNull();
    expect(canonicalMentionIdentity("12@lid")).toBe("12@lid");
    expect(canonicalMentionIdentity("12:3@c.us")).toBe("12@s.whatsapp.net");
    expect(mentionDisplayText("@~12, @12, @55119876", undefined, directory)).toBe(
      "@Operadora, @Participante não identificado, @Nome manual",
    );
  });
  it("does not infer a phone from the digits or length of a LID", () => {
    const onlyPhone = createMentionDirectory([], [{ ...contact, whatsappId: undefined }]);
    expect(
      mentionDisplayText(
        "@55119876",
        [entity({ id: "55119876@lid", tokens: ["@55119876"] })],
        onlyPhone,
      ),
    ).toBe("@Participante não identificado");
  });
  it("uses a confirmed contact alias and prioritizes manual naming", () => {
    expect(mentionDisplayText("Oi @777", [entity()], directory)).toBe("Oi @Nome manual");
    expect(
      mentionDisplayText(
        "@55119876",
        [entity({ id: "55119876@s.whatsapp.net", type: "phone", tokens: ["@55119876"] })],
        directory,
      ),
    ).toBe("@Nome manual");
  });
  it("uses a confirmed entity LID alias for a phone mention, never a lookalike number", () => {
    const names = createMentionDirectory(
      [],
      [],
      new Map([
        ["777@lid", "Pessoa LID"],
        ["777@s.whatsapp.net", "Outro telefone"],
      ]),
    );
    const phoneMention = entity({ id: "55119876@s.whatsapp.net", type: "phone", lid: "777" });
    expect(mentionDisplayText("@777", [phoneMention], names)).toBe("@Pessoa LID");
    expect(mentionDisplayText("@777", [entity({ ...phoneMention, lid: undefined })], names)).toBe(
      "@Participante não identificado",
    );
  });
  it("uses provider metadata only after manual, contacts and users", () => {
    expect(mentionDisplayText("@777", [entity({ displayName: "Provider" })])).toBe("@Provider");
    expect(mentionDisplayText("@777", [entity({ displayName: "Provider" })], directory)).toBe(
      "@Nome manual",
    );
  });
  it.each(["@123", "@~123", "unknown", "undefined", "null", "sem nome", "123@lid"])(
    "does not present placeholder %s as a name",
    (displayName) => {
      expect(mentionDisplayText("@777", [entity({ displayName })])).toBe(
        "@Participante não identificado",
      );
    },
  );
  it("keeps the raw token and typed identity accessible for unknown participants", () => {
    expect(resolveMessageMentions("@777", [entity()])).toEqual([
      {
        kind: "mention",
        text: "@Participante não identificado",
        rawToken: "@777",
        identity: "777@lid",
        resolved: false,
      },
    ]);
  });
  it("respects explicit empty entities, including literal internal-looking tokens", () => {
    expect(mentionDisplayText("@777 @~12 @55119876@s.whatsapp.net", [], directory)).toBe(
      "@777 @~12 @55119876@s.whatsapp.net",
    );
  });
  it("lets the explicit WhatsApp entity beat an internal-looking token", () => {
    expect(mentionDisplayText("@~12", [entity({ tokens: ["@~12"] })], directory)).toBe(
      "@Nome manual",
    );
    expect(
      isInternalMentionForUser(
        "@~12",
        user,
        [entity({ tokens: ["@~12"] })],
        createMentionDirectory([user]),
      ),
    ).toBe(false);
  });
  it("supports canonical user metadata without treating bare numbers as user codes", () => {
    expect(
      mentionDisplayText(
        "@~12 @12",
        [entity({ id: "user:12", type: "user", tokens: ["@~12", "@12"] })],
        directory,
      ),
    ).toBe("@Operadora @12");
  });
  it("does not match email/word substrings or consume adjacent dates and numbers", () => {
    const body = "mail@777.com x@777 @777x @~12a @777, @~12. Data 12/09 @777 2026";
    expect(mentionDisplayText(body, undefined, directory)).toBe(
      "mail@777.com x@777 @777x @~12a @Nome manual, @Operadora. Data 12/09 @Nome manual 2026",
    );
  });
  it("escapes literal token punctuation and prefers the longest token", () => {
    expect(
      mentionDisplayText(
        "(@777@lid), @777! @777@other",
        [entity({ tokens: ["@777", "@777@lid"] })],
        directory,
      ),
    ).toBe("(@Nome manual), @Nome manual! @777@other");
  });
  it("does not resolve ambiguous bare legacy identities", () => {
    const conflicting = createMentionDirectory(
      [],
      [],
      new Map([
        ["777@lid", "LID"],
        ["777@s.whatsapp.net", "Telefone"],
      ]),
    );
    expect(mentionDisplayText("@777", undefined, conflicting)).toBe(
      "@Participante não identificado",
    );
    expect(mentionDisplayText("@777", [entity()], conflicting)).toBe("@LID");
  });
  it("collapses overlapping provider PN/LID tokens only with confirmed compatible aliases", () => {
    const lid = entity({ phone: "55119876", displayName: "Pessoa" });
    const phone = entity({
      id: "55119876@s.whatsapp.net",
      type: "phone",
      lid: "777",
      displayName: "Pessoa",
    });
    expect(mentionDisplayText("@777", [lid, phone])).toBe("@Pessoa");
    expect(
      mentionDisplayText("@777", [entity({ displayName: "Pessoa" }), { ...phone, lid: undefined }]),
    ).toBe("@Participante não identificado");
    expect(mentionDisplayText("@777", [lid, { ...phone, displayName: "Outra pessoa" }])).toBe(
      "@Participante não identificado",
    );
    const names = createMentionDirectory([], [contact], new Map([["777@lid", "Nome manual"]]));
    expect(mentionDisplayText("@777", [entity(), { ...phone, lid: undefined }], names)).toBe(
      "@Nome manual",
    );
  });
  it("does not mutate bodies or metadata during display, renaming or notification checks", () => {
    const message = Object.freeze(msg());
    const before = JSON.stringify(message);
    expect(mentionDisplayText(message.body, message.mentionEntities, directory)).toContain(
      "Nome manual",
    );
    expect(
      mentionDisplayText(
        message.body,
        message.mentionEntities,
        createMentionDirectory([], [], new Map([["777@lid", "Renomeado"]])),
      ),
    ).toContain("Renomeado");
    expect(isInternalMentionForUser("@12", user)).toBe(false);
    expect(isInternalMentionForUser("@~12", user)).toBe(true);
    expect(isInternalMentionForUser("@~12", user, [])).toBe(false);
    expect(isInternalMentionForUser("@55119876", user)).toBe(true);
    expect(JSON.stringify(message)).toBe(before);
  });
});

describe("mention metadata reconciliation", () => {
  it("preserves metadata when same-body legacy HTTP/socket snapshots omit the field", () => {
    const previous = msg();
    const legacy = msg({ mentionEntities: undefined, status: "READ" });
    const merged = preserveMentionHistory([previous], [legacy]);
    expect(merged[0].mentionEntities).toBe(previous.mentionEntities);
    expect(merged[0].status).toBe("READ");
    expect(legacy.mentionEntities).toBeUndefined();
  });
  it("accepts late enrichment and explicit removal; drops obsolete metadata when body changes", () => {
    const previous = msg({ mentionEntities: undefined });
    expect(preserveMentionHistory([previous], [msg()])[0].mentionEntities).toHaveLength(1);
    expect(
      preserveMentionHistory([msg()], [msg({ mentionEntities: [] })])[0].mentionEntities,
    ).toEqual([]);
    expect(
      preserveMentionHistory([msg()], [msg({ body: "novo @888", mentionEntities: undefined })])[0]
        .mentionEntities,
    ).toBeUndefined();
  });
  it("isolates identities by tenant and message ID", () => {
    expect(
      preserveMentionHistory([msg()], [msg({ instance: "b", mentionEntities: undefined })])[0]
        .mentionEntities,
    ).toBeUndefined();
    expect(
      preserveMentionHistory([msg()], [msg({ id: 10, mentionEntities: undefined })])[0]
        .mentionEntities,
    ).toBeUndefined();
  });
  it("preserves cache and preview metadata on history reload without needless allocations", () => {
    const previous = { 1: [msg()] };
    const incoming = { 1: [msg({ mentionEntities: undefined })] };
    expect(preserveMentionHistoryCache(previous, incoming)[1][0].mentionEntities).toHaveLength(1);
    expect(preserveMentionHistoryCache(previous, previous)).toBe(previous);
    const chats = [{ id: 5, instance: "a", lastMessage: msg() }];
    expect(
      preserveChatMentionHistory(chats, [{ ...chats[0], lastMessage: incoming[1][0] }])[0]
        .lastMessage?.mentionEntities,
    ).toHaveLength(1);
    expect(
      preserveChatMentionHistory(chats, [
        { ...chats[0], lastMessage: msg({ body: "outro", mentionEntities: undefined }) },
      ])[0].lastMessage?.mentionEntities,
    ).toBeUndefined();
  });
});
