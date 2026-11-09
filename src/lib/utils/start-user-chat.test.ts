import { describe, expect, it } from "vitest";
import { startUserChat } from "./start-user-chat";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("manual chat start intent", () => {
  it("preserves the successful response and pending selection for the socket event", async () => {
    const pendingContact = { current: null as number | null };
    const latestRequest = { current: 0 };
    const result = { chatId: 40 };
    await expect(startUserChat(pendingContact, latestRequest, 8, async () => result)).resolves.toBe(result);
    expect(pendingContact.current).toBe(8);
  });

  it("clears a rejected request and preserves its error for the caller's single notification", async () => {
    const pendingContact = { current: null as number | null };
    const latestRequest = { current: 0 };
    const denied = new Error("Este contato está fidelizado a outro operador.");
    await expect(startUserChat(pendingContact, latestRequest, 8, async () => { throw denied; })).rejects.toBe(denied);
    expect(pendingContact.current).toBeNull();
  });

  it.each([8, 9])("a late rejection does not erase a newer request for contact %i", async (newerContact) => {
    const pendingContact = { current: null as number | null };
    const latestRequest = { current: 0 };
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    const olderResult = startUserChat(pendingContact, latestRequest, 8, () => first.promise);
    const olderError = expect(olderResult).rejects.toThrow("denied");
    const newerResult = startUserChat(pendingContact, latestRequest, newerContact, () => second.promise);
    first.reject(new Error("denied"));
    await olderError;
    expect(pendingContact.current).toBe(newerContact);
    second.resolve({ chatId: 41 });
    await newerResult;
    expect(pendingContact.current).toBe(newerContact);
  });
});
