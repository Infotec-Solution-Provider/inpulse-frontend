import { HybridCacheEntry, HybridCacheResource } from "./hybrid-cache.types";
import isHybridCacheEnabled from "./hybrid-cache-flag";

const DATABASE_NAME = "inpulse-hybrid-cache";
const DATABASE_VERSION = 1;
const STORE_NAME = "entries";
const CACHE_TTL_MS = 5 * 60 * 1000;
const ALLOWED_RESOURCES = new Set<HybridCacheResource>([
  "users",
  "contacts",
  "sectors",
  "channels",
  "parameters",
  "ready-messages",
  "internal-groups",
  "contact-page",
  "customer-page",
]);
const SENSITIVE_KEYS = new Set([
  "token",
  "password",
  "senha",
  "asterisk_senha",
  "senhaemailoperador",
  "messages",
  "quotedmessages",
  "notifications",
  "attachment",
  "attachments",
  "filedata",
]);

function containsSensitiveData(value: unknown, visited = new WeakSet<object>()): boolean {
  if (!value || typeof value !== "object") return false;
  if (visited.has(value)) return false;
  visited.add(value);

  for (const [key, nestedValue] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) return true;
    if (containsSensitiveData(nestedValue, visited)) return true;
  }
  return false;
}

export class HybridCache {
  private databasePromise: Promise<IDBDatabase> | null = null;

  public async get<T>(scope: string, resource: HybridCacheResource, queryKey = "default") {
    if (!ALLOWED_RESOURCES.has(resource)) return null;
    try {
      const database = await this.openDatabase();
      const entry = await this.request<HybridCacheEntry<T> | undefined>(
        database
          .transaction(STORE_NAME, "readonly")
          .objectStore(STORE_NAME)
          .get(this.buildId(scope, resource, queryKey)),
      );

      if (
        !entry ||
        entry.scope !== scope ||
        entry.resource !== resource ||
        entry.queryKey !== queryKey ||
        typeof entry.expiresAt !== "number" ||
        !("value" in entry) ||
        entry.value == null
      ) {
        await this.invalidate(scope, resource, queryKey);
        return null;
      }
      if (entry.expiresAt <= Date.now()) {
        await this.invalidate(scope, resource, queryKey);
        return null;
      }

      return entry.value;
    } catch {
      return null;
    }
  }

  public async set<T>(
    scope: string,
    resource: HybridCacheResource,
    value: T,
    queryKey = "default",
  ) {
    if (!ALLOWED_RESOURCES.has(resource) || value == null || containsSensitiveData(value)) return;
    try {
      const database = await this.openDatabase();
      const entry: HybridCacheEntry<T> = {
        id: this.buildId(scope, resource, queryKey),
        scope,
        resource,
        queryKey,
        expiresAt: Date.now() + CACHE_TTL_MS,
        value,
      };
      await this.transaction(database, "readwrite", (store) => store.put(entry));
    } catch {
      // Cache is an optional acceleration layer. API data remains authoritative.
    }
  }

  public async invalidate(scope: string, resource: HybridCacheResource, queryKey = "default") {
    try {
      const database = await this.openDatabase();
      await this.transaction(database, "readwrite", (store) =>
        store.delete(this.buildId(scope, resource, queryKey)),
      );
    } catch {
      // Ignore unavailable storage and quota errors.
    }
  }

  public async invalidateResource(scope: string, resource: HybridCacheResource) {
    if (!ALLOWED_RESOURCES.has(resource)) return;
    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const request = transaction
        .objectStore(STORE_NAME)
        .index("scope")
        .openCursor(IDBKeyRange.only(scope));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const entry = cursor.value as HybridCacheEntry<unknown>;
        if (entry.resource === resource) cursor.delete();
        cursor.continue();
      };
      await this.waitForTransaction(transaction);
    } catch {
      // Invalidating the optional cache must never block a mutation.
    }
  }

  public async clearScope(scope: string) {
    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const index = transaction.objectStore(STORE_NAME).index("scope");
      const cursorRequest = index.openKeyCursor(IDBKeyRange.only(scope));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        transaction.objectStore(STORE_NAME).delete(cursor.primaryKey);
        cursor.continue();
      };
      await this.waitForTransaction(transaction);
    } catch {
      // Cache cleanup must never block sign-out.
    }
  }

  public async clearInstance(instance: string) {
    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).openCursor();
      const prefix = `v1:${instance}:`;
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const entry = cursor.value as HybridCacheEntry<unknown>;
        if (entry.scope.startsWith(prefix)) cursor.delete();
        cursor.continue();
      };
      await this.waitForTransaction(transaction);
    } catch {
      // Best-effort tenant cleanup for expired or rejected sessions.
    }
  }

  public async pruneExpired() {
    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).openCursor();
      const now = Date.now();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const entry = cursor.value as HybridCacheEntry<unknown>;
        if (entry.expiresAt <= now) cursor.delete();
        cursor.continue();
      };
      await this.waitForTransaction(transaction);
    } catch {
      // Best-effort maintenance only.
    }
  }

  private buildId(scope: string, resource: HybridCacheResource, queryKey: string) {
    return `${scope}:${resource}:${queryKey}`;
  }

  private openDatabase() {
    if (!isHybridCacheEnabled()) return Promise.reject(new Error("Hybrid cache disabled"));
    if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
    if (this.databasePromise) return this.databasePromise;

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        const store = database.objectStoreNames.contains(STORE_NAME)
          ? request.transaction!.objectStore(STORE_NAME)
          : database.createObjectStore(STORE_NAME, { keyPath: "id" });
        if (!store.indexNames.contains("scope")) store.createIndex("scope", "scope");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("IndexedDB blocked"));
    });

    return this.databasePromise;
  }

  private request<T>(request: IDBRequest<T>) {
    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async transaction(
    database: IDBDatabase,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest,
  ) {
    const transaction = database.transaction(STORE_NAME, mode);
    operation(transaction.objectStore(STORE_NAME));
    await this.waitForTransaction(transaction);
  }

  private waitForTransaction(transaction: IDBTransaction) {
    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
}

export const hybridCache = new HybridCache();
