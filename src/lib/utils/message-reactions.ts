import type {
  InternalChat,
  InternalMessage,
  MessageReaction,
  MessageReactionSnapshot,
  WppMessage,
  WppMessageReactionEventData,
} from "@/lib/sdk-local";

export interface MessageReactionTarget {
  messageId: number;
  messageType: "wpp" | "internal";
  clientId?: number | null;
}

type ReactionMessage = Pick<WppMessage, "id" | "reaction" | "reactions" | "reactionsUpdatedAt"> & {
  clientId?: number | null;
  instance?: string;
};

export function normalizeReactions(reactions: MessageReaction[]): MessageReaction[] {
  const actors = new Map<string, MessageReaction>();
  for (const reaction of reactions) {
    if (
      !reaction ||
      typeof reaction.actorId !== "string" ||
      !reaction.actorId.trim() ||
      typeof reaction.emoji !== "string" ||
      !reaction.emoji ||
      typeof reaction.fromMe !== "boolean"
    )
      continue;
    const previous = actors.get(reaction.actorId);
    if (!previous || Date.parse(reaction.reactedAt) >= Date.parse(previous.reactedAt)) {
      actors.set(reaction.actorId, reaction);
    }
  }
  return [...actors.values()];
}

export function groupMessageReactions(reactions: MessageReaction[]) {
  const groups = new Map<string, MessageReaction[]>();
  for (const reaction of normalizeReactions(reactions)) {
    groups.set(reaction.emoji, [...(groups.get(reaction.emoji) ?? []), reaction]);
  }
  return [...groups].map(([emoji, actors]) => ({
    emoji,
    actors,
    count: actors.length,
    fromMe: actors.some((actor) => actor.fromMe),
  }));
}

export function reactionActorName(reaction: MessageReaction, actorNames?: Map<string, string>) {
  if (reaction.fromMe) {
    if (reaction.internalUserId) {
      return reaction.internalUserName?.trim() || `Usuário interno #${reaction.internalUserId}`;
    }
    return "Esta conta WhatsApp — usuário interno não identificado";
  }
  if (reaction.actorId === "legacy:unknown") return "Participante não identificado";
  const address = reaction.actorId.split("@")[0];
  return actorNames?.get(reaction.actorId) ?? actorNames?.get(address) ?? address;
}

function enrichReactionAuthor(current: MessageReaction, incoming: MessageReaction | undefined) {
  if (
    current.fromMe &&
    incoming?.fromMe &&
    !current.internalUserId &&
    incoming.internalUserId &&
    current.sourceEventId &&
    current.sourceEventId === incoming.sourceEventId &&
    current.emoji === incoming.emoji
  ) {
    return {
      ...current,
      internalUserId: incoming.internalUserId,
      internalUserName: incoming.internalUserName,
    };
  }
  return current;
}

export type ReactionUpdateSource = "socket" | "http";

export function applyMessageReaction<T extends ReactionMessage>(
  message: T,
  event: WppMessageReactionEventData,
  source: ReactionUpdateSource = "socket",
): T {
  if (
    message.id !== event.messageId ||
    (message.clientId && event.clientId && message.clientId !== event.clientId)
  )
    return message;
  const previousTime = Date.parse(message.reactionsUpdatedAt ?? "");
  const eventTime = Date.parse(event.reactionsUpdatedAt ?? "");
  if (Number.isFinite(previousTime) && (!Number.isFinite(eventTime) || eventTime < previousTime))
    return message;
  if (Array.isArray(event.reactions)) {
    let reactions = normalizeReactions(event.reactions);
    if (Number.isFinite(previousTime) && eventTime === previousTime && message.reactions) {
      // Equal revisions cannot prove a new actor or changed emoji is newer than a removal.
      const incoming = new Map(reactions.map((reaction) => [reaction.actorId, reaction]));
      reactions = message.reactions
        .filter((reaction) => source === "http" || incoming.has(reaction.actorId))
        .map((reaction) => enrichReactionAuthor(reaction, incoming.get(reaction.actorId)));
    }
    const reaction = reactions.map((item) => item.emoji).join("");
    if (
      message.reactionsUpdatedAt === event.reactionsUpdatedAt &&
      JSON.stringify(message.reactions) === JSON.stringify(reactions) &&
      message.reaction === reaction
    )
      return message;
    return {
      ...message,
      reactions,
      reaction,
      reactionsUpdatedAt: event.reactionsUpdatedAt ?? null,
    };
  }
  // Legacy strings have no actor identity and must never invent the account's own reaction.
  if (typeof event.reaction === "string" && !message.reactions) {
    return message.reaction === event.reaction ? message : { ...message, reaction: event.reaction };
  }
  return message;
}

export function applyReactionToMessages<T extends ReactionMessage>(
  messages: T[],
  event: WppMessageReactionEventData,
  source: ReactionUpdateSource = "socket",
): T[] {
  let changed = false;
  const result = messages.map((message) => {
    const next = applyMessageReaction(message, event, source);
    if (next !== message) changed = true;
    return next;
  });
  return changed ? result : messages;
}

export function applyReactionToCache<T extends ReactionMessage>(
  cache: Record<number, T[]>,
  event: WppMessageReactionEventData,
  source: ReactionUpdateSource = "socket",
): Record<number, T[]> {
  let result = cache;
  for (const [key, messages] of Object.entries(cache)) {
    const next = applyReactionToMessages(messages, event, source);
    if (next !== messages) {
      if (result === cache) result = { ...cache };
      result[Number(key)] = next;
    }
  }
  return result;
}

/** Keep only newer reaction fields when a whole message/history response replaces other fields. */
export function preserveReactionHistory<T extends ReactionMessage>(
  previous: T[],
  incoming: T[],
): T[] {
  const known = new Map<string, T>();
  for (const message of previous) {
    const key = JSON.stringify([message.instance, message.id]);
    known.set(key, preserveMessageReactionHistory(known.get(key), message));
  }
  let changed = false;
  const result = incoming.map((message) => {
    const existing = known.get(JSON.stringify([message.instance, message.id]));
    const merged = preserveMessageReactionHistory(existing, message);
    if (merged !== message) changed = true;
    return merged;
  });
  return changed ? result : incoming;
}

function preserveMessageReactionHistory<T extends ReactionMessage>(
  existing: T | undefined,
  message: T,
): T {
  if (
    !existing ||
    (!existing.reactions && !existing.reactionsUpdatedAt) ||
    (existing.clientId && message.clientId && existing.clientId !== message.clientId)
  )
    return message;
  const merged = applyMessageReaction(existing, {
    messageId: message.id,
    clientId: message.clientId ?? undefined,
    reactions: message.reactions,
    reaction: message.reaction,
    reactionsUpdatedAt: message.reactionsUpdatedAt,
  });
  if (
    merged.reactions === message.reactions &&
    merged.reaction === message.reaction &&
    merged.reactionsUpdatedAt === message.reactionsUpdatedAt
  )
    return message;
  return {
    ...message,
    reaction: merged.reaction,
    reactions: merged.reactions,
    reactionsUpdatedAt: merged.reactionsUpdatedAt,
  };
}

export function preserveReactionHistoryCache<T extends ReactionMessage>(
  previous: Record<number, T[]>,
  incoming: Record<number, T[]>,
): Record<number, T[]> {
  let result = incoming;
  for (const [key, messages] of Object.entries(incoming)) {
    const merged = preserveReactionHistory(previous[Number(key)] ?? [], messages);
    if (merged !== messages) {
      if (result === incoming) result = { ...incoming };
      result[Number(key)] = merged;
    }
  }
  return result;
}

export function assertReactionConfirmation(
  result: MessageReactionSnapshot,
  target: MessageReactionTarget,
) {
  if (
    !result ||
    result.messageId !== target.messageId ||
    result.messageType !== target.messageType ||
    (target.clientId && result.clientId !== target.clientId) ||
    !Array.isArray(result.reactions) ||
    !(
      Number.isFinite(Date.parse(result.reactionsUpdatedAt ?? "")) ||
      (result.reactionsUpdatedAt === null && result.reactions.length === 0)
    )
  ) {
    throw new Error("O servidor não confirmou a reação desta mensagem.");
  }
  return result;
}

export class ReactionRequestCoordinator {
  private pending = new Map<string, { emoji: string; promise: Promise<MessageReactionSnapshot> }>();
  run(
    scope: string,
    target: MessageReactionTarget,
    emoji: string,
    request: () => Promise<MessageReactionSnapshot>,
  ) {
    const key = JSON.stringify([scope, target.messageType, target.clientId, target.messageId]);
    const existing = this.pending.get(key);
    if (existing) {
      if (existing.emoji === emoji) return existing.promise;
      return Promise.reject(new Error("Aguarde a confirmação da reação anterior."));
    }
    const promise = Promise.resolve()
      .then(request)
      .then((result) => assertReactionConfirmation(result, target));
    this.pending.set(key, { emoji, promise });
    void promise.finally(() => this.pending.delete(key)).catch(() => undefined);
    return promise;
  }
}

const unavailableStatuses = new Set(["PENDING", "UNKNOWN", "ERROR", "REVOKED"]);
export function canReactToWhatsappMessage(message: WppMessage, provider?: string) {
  return (
    !!message.clientId &&
    ["REMOTE", "WWEBJS"].includes(provider ?? "") &&
    !!(message.wwebjsId || message.wwebjsIdStanza) &&
    !message.from.startsWith("system") &&
    !unavailableStatuses.has(message.status)
  );
}

export function canReactToInternalMessage(
  message: InternalMessage,
  chat?: InternalChat | null,
  provider?: string,
) {
  return (
    !!message.clientId &&
    !!chat?.wppGroupId &&
    !!(message.wwebjsId || message.wwebjsIdStanza) &&
    (!provider || ["REMOTE", "WWEBJS"].includes(provider)) &&
    !message.from.startsWith("system") &&
    !unavailableStatuses.has(message.status)
  );
}
