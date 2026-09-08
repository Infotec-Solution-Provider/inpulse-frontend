import type { MessageMentionEntity, User, WppContact } from "@/lib/sdk-local";

export interface MentionDirectory {
  manual: Map<string, string>;
  contacts: Map<string, string>;
  users: Map<string, string>;
  aliases: Map<string, Set<string>>;
  bareTokens: Map<string, Set<string>>;
}

/** Identity namespaces are never inferred from the length of a number. */
export function canonicalMentionIdentity(
  value: string,
  type?: MessageMentionEntity["type"],
): string | null {
  const raw = value.trim().replace(/^me:/, "");
  const user = /^(?:user:|~)(\d+)$/.exec(raw);
  if (user) return !type || type === "user" ? `user:${user[1]}` : null;
  const jid = /^(\d+)(?::\d+)?@(lid|c\.us|s\.whatsapp\.net)$/.exec(raw);
  if (jid) {
    const jidType = jid[2] === "lid" ? "lid" : "phone";
    return type && type !== jidType
      ? null
      : `${jid[1]}@${jidType === "lid" ? "lid" : "s.whatsapp.net"}`;
  }
  if (type && /^\d+$/.test(raw)) {
    return type === "user" ? `user:${raw}` : `${raw}@${type === "lid" ? "lid" : "s.whatsapp.net"}`;
  }
  return null;
}

function phoneIdentity(value?: string | null): string | null {
  if (!value) return null;
  const jid = canonicalMentionIdentity(value, "phone");
  if (jid) return jid;
  return /^[+\d\s().-]+$/.test(value) && /\d/.test(value)
    ? `${value.replace(/\D/g, "")}@s.whatsapp.net`
    : null;
}

function displayName(value?: string | null): string | null {
  const name = value?.trim();
  return name &&
    !canonicalMentionIdentity(name.replace(/^@/, "")) &&
    !/^@?~?[+\d\s().-]+$/.test(name) &&
    !/^(?:undefined|null|unknown|sem\s*nome|desconhecido)$/i.test(name)
    ? name
    : null;
}

export function createMentionDirectory(
  users: User[] = [],
  contacts: WppContact[] = [],
  manualNames: Map<string, string> = new Map(),
): MentionDirectory {
  const directory: MentionDirectory = {
    manual: new Map(),
    contacts: new Map(),
    users: new Map(),
    aliases: new Map(),
    bareTokens: new Map(),
  };
  const index = (id: string) => {
    if (id.startsWith("user:")) return;
    const token = `@${id.split("@")[0]}`;
    const identities = directory.bareTokens.get(token) ?? new Set<string>();
    identities.add(id);
    directory.bareTokens.set(token, identities);
  };
  const put = (map: Map<string, string>, id: string | null, name?: string | null) => {
    if (!id) return;
    index(id);
    const validName = displayName(name);
    if (validName) map.set(id, validName);
  };
  for (const [raw, name] of manualNames) put(directory.manual, canonicalMentionIdentity(raw), name);
  for (const contact of contacts) {
    const phone = phoneIdentity(contact.phone);
    const jid = contact.whatsappId ? canonicalMentionIdentity(contact.whatsappId) : null;
    put(directory.contacts, phone, contact.name);
    put(directory.contacts, jid, contact.name);
    if (phone && jid && phone !== jid) {
      for (const [id, alias] of [
        [phone, jid],
        [jid, phone],
      ]) {
        const aliases = directory.aliases.get(id) ?? new Set<string>();
        aliases.add(alias);
        directory.aliases.set(id, aliases);
      }
    }
  }
  for (const user of users) {
    put(directory.users, canonicalMentionIdentity(String(user.CODIGO), "user"), user.NOME);
    put(directory.users, phoneIdentity(user.WHATSAPP), user.NOME);
  }
  return directory;
}

export const EMPTY_MENTION_DIRECTORY = createMentionDirectory();

export type MentionSegment =
  | { kind: "text"; text: string }
  | {
      kind: "mention";
      text: string;
      rawToken: string;
      identity: string;
      resolved: boolean;
    };

function findName(
  id: string,
  entity: MessageMentionEntity | undefined,
  directory: MentionDirectory,
): string | null {
  const ids = [id, ...(directory.aliases.get(id) ?? [])];
  const confirmedPhone = phoneIdentity(entity?.phone);
  if (confirmedPhone && entity?.type !== "user") ids.push(confirmedPhone);
  const confirmedLid = entity?.lid ? canonicalMentionIdentity(entity.lid, "lid") : null;
  if (confirmedLid && entity?.type !== "user") ids.push(confirmedLid);
  for (const map of [directory.manual, directory.contacts, directory.users]) {
    for (const identity of ids) {
      const name = map.get(identity);
      if (name) return name;
    }
  }
  return displayName(entity?.displayName);
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function equivalentCandidates(
  candidates: Map<string, MessageMentionEntity>,
  directory: MentionDirectory,
): [string, MessageMentionEntity] | null {
  const entries = [...candidates];
  const identities = entries.map(
    ([id, entity]) =>
      new Set(
        [
          id,
          ...(directory.aliases.get(id) ?? []),
          ...(entity.type !== "user" && entity.phone ? [phoneIdentity(entity.phone)] : []),
          ...(entity.type !== "user" && entity.lid
            ? [canonicalMentionIdentity(entity.lid, "lid")]
            : []),
        ].filter((identity): identity is string => !!identity),
      ),
  );
  if (
    !entries.length ||
    ![...identities[0]].some((identity) => identities.every((ids) => ids.has(identity)))
  )
    return null;
  const names = entries.map(([id, entity]) => findName(id, entity, directory));
  const distinctNames = new Set(names.filter(Boolean).map((name) => name!.toLocaleLowerCase()));
  if (distinctNames.size > 1) return null;
  return entries[names.findIndex(Boolean)] ?? entries[0];
}

/** Only the presentation changes. The original body/token remains available for editing/copying. */
export function resolveMessageMentions(
  text: string,
  entities: MessageMentionEntity[] | undefined,
  directory: MentionDirectory = EMPTY_MENTION_DIRECTORY,
): MentionSegment[] {
  if (!text) return [];
  const byToken = new Map<string, Map<string, MessageMentionEntity>>();
  for (const entity of entities ?? []) {
    const id = canonicalMentionIdentity(entity.id, entity.type);
    if (!id) continue;
    for (const token of entity.tokens ?? []) {
      if (!/^@\S+$/.test(token)) continue;
      if (entity.type === "user" && token !== `@~${id.slice(5)}`) continue;
      const candidates = byToken.get(token) ?? new Map<string, MessageMentionEntity>();
      candidates.set(id, entity);
      byToken.set(token, candidates);
    }
  }
  const explicitTokens = [...byToken.keys()].sort((a, b) => b.length - a.length).map(escapeRegex);
  // [] is authoritative: literal @numbers in a modern message are not mentions.
  const legacy =
    entities === undefined
      ? ["@~\\d+", "@\\+?\\d+(?::\\d+)?@(?:s\\.whatsapp\\.net|c\\.us|lid)", "@\\+?\\d+"]
      : [];
  if (!explicitTokens.length && !legacy.length) return [{ kind: "text", text }];
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_@])(?:${[...explicitTokens, ...legacy].join("|")})(?![\\p{L}\\p{N}_@])`,
    "gu",
  );
  const segments: MentionSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    if (match.index > cursor)
      segments.push({ kind: "text", text: text.slice(cursor, match.index) });
    const explicit = byToken.get(token);
    let id: string | null = null;
    let entity: MessageMentionEntity | undefined;
    if (explicit?.size === 1) [id, entity] = [...explicit][0];
    else if (explicit && explicit.size > 1) {
      const equivalent = equivalentCandidates(explicit, directory);
      if (equivalent) [id, entity] = equivalent;
    } else if (!explicit) {
      id = canonicalMentionIdentity(token.slice(1));
      if (!id) {
        const candidates = [...(directory.bareTokens.get(token.replace(/^@\+/, "@")) ?? [])];
        if (
          candidates.length === 1 ||
          (candidates.length > 1 &&
            candidates.every(
              (candidate) =>
                candidate === candidates[0] || directory.aliases.get(candidates[0])?.has(candidate),
            ))
        )
          id = candidates[0];
      }
    }
    const name = id ? findName(id, entity, directory) : null;
    segments.push({
      kind: "mention",
      text: `@${name || "Participante não identificado"}`,
      rawToken: token,
      identity: id || (explicit ? [...explicit.keys()].join(" / ") : token),
      resolved: !!name,
    });
    cursor = match.index + token.length;
  }
  if (cursor < text.length) segments.push({ kind: "text", text: text.slice(cursor) });
  return segments;
}

export function mentionDisplayText(
  text: string,
  entities?: MessageMentionEntity[],
  directory = EMPTY_MENTION_DIRECTORY,
): string {
  return resolveMessageMentions(text, entities, directory)
    .map((segment) => segment.text)
    .join("");
}

/** Compatibility for external callers; screens share a memoized directory instead. */
export function replaceMentions(
  text: string,
  users: User[] = [],
  contacts: WppContact[] = [],
): string {
  return mentionDisplayText(text, undefined, createMentionDirectory(users, contacts));
}

type MentionMessage = {
  id: number;
  instance: string;
  body: string;
  mentionEntities?: MessageMentionEntity[];
};

export function preserveMessageMentionMetadata<T extends MentionMessage>(
  previous: T | undefined,
  incoming: T,
): T {
  if (
    previous?.id === incoming.id &&
    previous.instance === incoming.instance &&
    previous.body === incoming.body &&
    incoming.mentionEntities === undefined &&
    previous.mentionEntities !== undefined
  ) {
    return { ...incoming, mentionEntities: previous.mentionEntities };
  }
  return incoming;
}

export function preserveMentionHistory<T extends MentionMessage>(
  previous: T[],
  incoming: T[],
): T[] {
  const known = new Map(previous.map((message) => [`${message.instance}:${message.id}`, message]));
  let changed = false;
  const merged = incoming.map((message) => {
    const result = preserveMessageMentionMetadata(
      known.get(`${message.instance}:${message.id}`),
      message,
    );
    if (result !== message) changed = true;
    return result;
  });
  return changed ? merged : incoming;
}

export function preserveMentionHistoryCache<T extends MentionMessage>(
  previous: Record<number, T[]>,
  incoming: Record<number, T[]>,
): Record<number, T[]> {
  let result = incoming;
  for (const [key, messages] of Object.entries(incoming)) {
    const merged = preserveMentionHistory(previous[Number(key)] ?? [], messages);
    if (merged !== messages) {
      if (result === incoming) result = { ...incoming };
      result[Number(key)] = merged;
    }
  }
  return result;
}

export function preserveChatMentionHistory<
  M extends MentionMessage,
  T extends { id: number; instance: string; lastMessage: M | null },
>(previous: T[], incoming: T[]): T[] {
  const known = new Map(previous.map((chat) => [`${chat.instance}:${chat.id}`, chat.lastMessage]));
  let changed = false;
  const merged = incoming.map((chat) => {
    if (!chat.lastMessage) return chat;
    const lastMessage = preserveMessageMentionMetadata(
      known.get(`${chat.instance}:${chat.id}`) ?? undefined,
      chat.lastMessage,
    );
    if (lastMessage === chat.lastMessage) return chat;
    changed = true;
    return { ...chat, lastMessage };
  });
  return changed ? merged : incoming;
}
