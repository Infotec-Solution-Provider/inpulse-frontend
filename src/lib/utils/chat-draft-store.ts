import type { SendMessageDataState } from "@/app/(private)/[instance]/(main)/(chat)/chat-reducer";

const draftCache = new Map<string, SendMessageDataState>();
const writes = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<(draft: SendMessageDataState) => void>>();
let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("inpulse-chat-drafts", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("drafts");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

export function getCachedChatDraft(scope: string): SendMessageDataState | undefined {
  return draftCache.get(scope);
}

export function subscribeChatDraft(scope: string, listener: (draft: SendMessageDataState) => void) {
  const subscribers = listeners.get(scope) ?? new Set();
  subscribers.add(listener);
  listeners.set(scope, subscribers);
  return () => {
    subscribers.delete(listener);
    if (!subscribers.size) listeners.delete(scope);
  };
}

export async function loadChatDraft(scope: string): Promise<SendMessageDataState | undefined> {
  const cached = draftCache.get(scope);
  if (cached) return cached;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction("drafts").objectStore("drafts").get(scope);
    request.onsuccess = () => resolve(draftCache.get(scope) ?? request.result);
    request.onerror = () => reject(request.error);
  });
}

/** IndexedDB preserves File bytes as well as text and the attempt key across reconnects/reloads. */
export function saveChatDraft(scope: string, draft: SendMessageDataState): Promise<void> {
  draftCache.set(scope, draft);
  listeners.get(scope)?.forEach((listener) => listener(draft));
  const previous = writes.get(scope) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("drafts", "readwrite");
        const store = transaction.objectStore("drafts");
        if (!draft.text && !draft.file && !draft.fileId && !draft.attemptKey) store.delete(scope);
        else store.put(draft, scope);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    });
  writes.set(scope, next);
  void next
    .finally(() => {
      if (writes.get(scope) === next) writes.delete(scope);
    })
    .catch(() => undefined);
  return next;
}
