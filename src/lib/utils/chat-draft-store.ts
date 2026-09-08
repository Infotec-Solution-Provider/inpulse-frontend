import type { SendMessageDataState } from "@/app/(private)/[instance]/(main)/(chat)/chat-reducer";

const draftCache = new Map<string, SendMessageDataState>();
const writes = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<(draft: SendMessageDataState) => void>>();
let database: Promise<IDBDatabase> | undefined;
const DRAFT_STORAGE_TIMEOUT_MS = 2_000;

function openDatabase(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      let settled = false;
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      };
      const timer = setTimeout(
        () => fail(new Error("Tempo excedido ao abrir o armazenamento de rascunhos.")),
        DRAFT_STORAGE_TIMEOUT_MS,
      );
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open("inpulse-chat-drafts", 1);
      } catch (error) {
        fail(error);
        return;
      }
      request.onupgradeneeded = () => request.result.createObjectStore("drafts");
      request.onsuccess = () => {
        if (settled) { request.result.close(); return; }
        settled = true;
        clearTimeout(timer);
        const db = request.result;
        db.onversionchange = () => { db.close(); database = undefined; };
        resolve(db);
      };
      request.onerror = () => fail(request.error);
      request.onblocked = () => fail(new Error("Armazenamento de rascunhos bloqueado."));
    }).catch((error) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

function draftTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Pick<IDBRequest<T>, "result">,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", mode);
    const timer = setTimeout(() => {
      reject(new Error("Tempo excedido ao acessar o rascunho."));
      try { transaction.abort(); } catch { /* Already completed. */ }
    }, DRAFT_STORAGE_TIMEOUT_MS);
    transaction.onerror = transaction.onabort = () => {
      clearTimeout(timer);
      reject(transaction.error ?? new Error("Falha ao acessar o rascunho."));
    };
    try {
      const request = operation(transaction.objectStore("drafts"));
      transaction.oncomplete = () => { clearTimeout(timer); resolve(request.result); };
    } catch (error) {
      clearTimeout(timer);
      reject(error);
      try { transaction.abort(); } catch { /* Already completed. */ }
    }
  });
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
  const stored = await draftTransaction(db, "readonly", (store) => store.get(scope));
  return draftCache.get(scope) ?? stored;
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
      await draftTransaction(db, "readwrite", (store): Pick<IDBRequest<unknown>, "result"> => {
        if (!draft.text && !draft.file && !draft.fileId && !draft.attemptKey) return store.delete(scope);
        return store.put(draft, scope);
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
