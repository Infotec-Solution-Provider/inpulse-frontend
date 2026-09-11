import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingChatSend } from "./pending-chat-sends";

const storage = new Map<string, string>();
const attempt = (id: string, messageId?: number): PendingChatSend => ({
  id,
  scope: '["tenant-a",7,"wpp",1]',
  clientId: 23,
  messageId,
  status: "sending",
  snapshot: {
    text: "Captured message",
    sendAsAudio: false,
    sendAsDocument: false,
    isEmojiMenuOpen: false,
  },
});

beforeEach(() => {
  vi.resetModules();
  storage.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("pending send persistence", () => {
  it.each([
    { messageId: undefined, status: "unconfirmed" },
    { messageId: 41, status: "sending" },
  ])(
    "restores interrupted attempts as $status according to their receipt",
    async ({ messageId, status }) => {
      const store = await import("./pending-chat-sends");
      store.updatePendingChatSends("tenant-a/7", () => [attempt("original-key", messageId)]);
      await Promise.resolve();
      vi.resetModules();
      const restoredStore = await import("./pending-chat-sends");

      expect(restoredStore.getPendingChatSends("tenant-a/7")).toMatchObject([
        {
          id: "original-key",
          status,
          clientId: 23,
          snapshot: { text: "Captured message" },
        },
      ]);
      expect(restoredStore.getPendingChatSends("tenant-a/7")[0].messageId).toBe(messageId);
    },
  );

  it("keeps captured files in memory without trying to serialize file contents", async () => {
    const store = await import("./pending-chat-sends");
    const file = new File(["file bytes"], "report.pdf", { type: "application/pdf" });
    const outgoing = attempt("with-file");
    outgoing.snapshot.file = file;
    outgoing.fileName = file.name;
    store.updatePendingChatSends("tenant-a/7", () => [outgoing]);
    await Promise.resolve();

    expect(store.getPendingChatSends("tenant-a/7")[0].snapshot.file).toBe(file);
    const serialized = [...storage.values()][0];
    expect(JSON.parse(serialized)[0].snapshot.file).toBeUndefined();
    expect(JSON.parse(serialized)[0].fileName).toBe("report.pdf");
  });

  it("settles one session without exposing or removing another user's attempts", async () => {
    const store = await import("./pending-chat-sends");
    store.updatePendingChatSends("tenant-a/7", () => [attempt("a")]);
    store.updatePendingChatSends("tenant-b/8", () => [attempt("b")]);
    store.updatePendingChatSends("tenant-a/7", () => []);
    await Promise.resolve();
    vi.resetModules();
    const restoredStore = await import("./pending-chat-sends");

    expect(restoredStore.getPendingChatSends("tenant-a/7")).toEqual([]);
    expect(restoredStore.getPendingChatSends("tenant-b/8")).toMatchObject([{ id: "b" }]);
    expect(restoredStore.getPendingChatSends("tenant-b/7")).toEqual([]);
  });

  it("retains the attempt and notifies the UI when browser storage is unavailable", async () => {
    const fail = () => {
      throw new Error("storage disabled");
    };
    vi.stubGlobal("sessionStorage", { getItem: fail, setItem: fail, removeItem: fail });
    const store = await import("./pending-chat-sends");
    const notified = vi.fn();
    const unsubscribe = store.subscribePendingChatSends(notified);
    store.updatePendingChatSends("tenant-a/7", () => [attempt("memory-only")]);
    await Promise.resolve();

    expect(store.getPendingChatSends("tenant-a/7")).toMatchObject([{ id: "memory-only" }]);
    expect(notified).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
