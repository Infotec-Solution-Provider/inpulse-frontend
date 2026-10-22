import type { WppChatWithDetails, WppMessage } from "@/lib/sdk-local";
import type { DetailedChat } from "@/app/(private)/[instance]/whatsapp-context";
import processChatsAndMessages from "../process-chats-and-messages";

export interface SessionChanges {
  chats: WppChatWithDetails[];
  messages: WppMessage[];
  removedChatIds: number[];
  removedMessageIds: number[];
}

export function mergeChangedMessages(previous: WppMessage[], incoming: WppMessage[], removed: number[] = []) {
  const deleted = new Set(removed);
  if (!incoming.length && (!deleted.size || !previous.some((message) => deleted.has(message.id)))) return previous;
  const merged = new Map(previous.filter((message) => !deleted.has(message.id)).map((message) => [message.id, message]));
  for (const message of incoming) if (!deleted.has(message.id)) merged.set(message.id, message);
  return [...merged.values()].sort((a, b) => Number(a.timestamp) - Number(b.timestamp) || a.id - b.id);
}

export function mergeChangedChats(previous: DetailedChat[], changes: SessionChanges) {
  if (!changes.chats.length && !changes.removedChatIds.length) return previous;
  const removed = new Set(changes.removedChatIds);
  const merged = new Map(previous.filter((chat) => !removed.has(chat.id)).map((chat) => [chat.id, chat]));
  for (const chat of processChatsAndMessages(changes.chats, []).detailedChats) merged.set(chat.id, chat);
  return [...merged.values()].sort((a, b) => Number(b.lastMessage?.timestamp ?? 0) - Number(a.lastMessage?.timestamp ?? 0) || b.id - a.id);
}

export function mergeChangedCache(previous: Record<number, WppMessage[]>, changes: SessionChanges) {
  if (!changes.messages.length && !changes.removedMessageIds.length && !changes.removedChatIds.length) return previous;
  const result: Record<number, WppMessage[]> = {};
  const removedChats = new Set(changes.removedChatIds);
  const incomingIds = new Set(changes.messages.map((message) => message.id));
  for (const [contact, messages] of Object.entries(previous)) {
    const filtered = messages.filter((message) => !removedChats.has(message.chatId ?? -1) && !incomingIds.has(message.id));
    result[Number(contact)] = mergeChangedMessages(filtered.length === messages.length ? messages : filtered, [], changes.removedMessageIds);
  }
  const byContact = new Map<number, WppMessage[]>();
  for (const message of changes.messages) if (message.contactId) {
    byContact.set(message.contactId, [...(byContact.get(message.contactId) ?? []), message]);
  }
  for (const [contact, messages] of byContact) result[contact] = mergeChangedMessages(result[contact] ?? [], messages, changes.removedMessageIds);
  return result;
}
