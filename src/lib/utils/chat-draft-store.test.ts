import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetModules(); });

describe("draft storage availability", () => {
  it("releases draft loading when IndexedDB never responds and closes a late connection", async () => {
    vi.useFakeTimers();
    const request: Record<string, any> = {};
    vi.stubGlobal("indexedDB", { open: () => request });
    const store = await import("./chat-draft-store");
    const pending = expect(store.loadChatDraft("scope")).rejects.toThrow("Tempo excedido");
    await vi.advanceTimersByTimeAsync(2_000);
    await pending;
    request.result = { close: vi.fn() };
    request.onsuccess();
    expect(request.result.close).toHaveBeenCalledOnce();
  });

  it("keeps the draft in memory even when persistent storage is unavailable", async () => {
    vi.stubGlobal("indexedDB", { open: () => { throw new Error("storage unavailable"); } });
    const store = await import("./chat-draft-store");
    const draft = { text: "do not lose this", attemptKey: "attempt-1" } as Parameters<typeof store.saveChatDraft>[1];
    const save = store.saveChatDraft("scope", draft);
    expect(store.getCachedChatDraft("scope")).toBe(draft);
    await expect(save).rejects.toThrow("storage unavailable");
    expect(await store.loadChatDraft("scope")).toBe(draft);
  });

  it("aborts a stalled write so subsequent drafts can be saved", async () => {
    vi.useFakeTimers();
    const request: Record<string, any> = {};
    const transaction = { objectStore: () => ({ put: () => ({}) }), abort: vi.fn() };
    vi.stubGlobal("indexedDB", { open: () => request });
    const store = await import("./chat-draft-store");
    const draft = { text: "hello" } as Parameters<typeof store.saveChatDraft>[1];
    const pending = expect(store.saveChatDraft("scope", draft)).rejects.toThrow("Tempo excedido");
    await vi.advanceTimersByTimeAsync(0);
    request.result = { transaction: () => transaction };
    request.onsuccess();
    await vi.advanceTimersByTimeAsync(2_000);
    await pending;
    expect(transaction.abort).toHaveBeenCalledOnce();
    expect(store.getCachedChatDraft("scope")).toBe(draft);
  });
});
