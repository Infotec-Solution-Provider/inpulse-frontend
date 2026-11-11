import React, { useContext } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/app/auth-context";
import type { InternalMessage, WppMessage } from "@/lib/sdk-local";
import { WhatsappContext } from "../../whatsapp-context";
import { InternalChatContext } from "../../internal-context";
import ChatProvider, { ChatContext } from "./chat-context";

// Keep the real ChatProvider and resolver. Only its external service contexts
// are replaced; rendering these cases performs no network or send operation.
vi.mock("@/app/auth-context", async () => {
  const { createContext } = await import("react");
  return { AuthContext: createContext({}) };
});
vi.mock("../../whatsapp-context", async () => {
  const { createContext } = await import("react");
  return { WhatsappContext: createContext({}) };
});
vi.mock("../../internal-context", async () => {
  const { createContext } = await import("react");
  return { InternalChatContext: createContext({}) };
});

function message(overrides: Partial<WppMessage> = {}): WppMessage {
  return {
    id: 77, instance: "tenant-a", contactId: 101, chatId: 1,
    body: "Original document", from: "me:channel", to: "contact",
    type: "document", timestamp: "1794222000000", sentAt: new Date("2026-11-09T11:00:00Z"),
    status: "RECEIVED", quotedId: null, clientId: 6,
    wwebjsId: null, wwebjsIdStanza: null, wabaId: null,
    gupshupId: null, gupshupRequestId: null,
    isForwarded: false, isEdited: false,
    fileId: 501, fileName: "document.pdf", fileType: "application/pdf", fileSize: "42",
    userId: null, agentId: null, billingCategory: null,
    ...overrides,
  };
}

type Scenario = {
  instance?: string;
  chatType?: "wpp" | "internal";
  contactId?: number;
  chatId?: number;
  isReadOnlyMode?: boolean;
  history?: WppMessage[];
  cache?: Record<number, WppMessage[]>;
  internalCache?: Record<number, InternalMessage[]>;
  lookupContactId?: number;
  lookupId?: number;
  isInternal?: boolean;
};

function resolveFromProvider(scenario: Scenario = {}): {
  resolved: WppMessage | InternalMessage | null;
  html: string;
} {
  let resolved: WppMessage | InternalMessage | null = null;
  function QuoteProbe() {
    const { getMessageById } = useContext(ChatContext);
    resolved = getMessageById(
      scenario.lookupContactId ?? 101,
      scenario.lookupId ?? 77,
      scenario.isInternal ?? false,
    );
    return <output>{resolved?.body ?? "Citation unavailable"}</output>;
  }
  const auth = {
    instance: scenario.instance ?? "tenant-a",
    token: "test-token",
    user: { CODIGO: 1 },
  } as React.ContextType<typeof AuthContext>;
  const whatsapp = {
    currentChat: {
      id: scenario.chatId ?? 2,
      chatType: scenario.chatType ?? "wpp",
      contactId: scenario.contactId ?? 101,
    },
    currentChatMessages: scenario.history ?? [],
    messages: scenario.cache ?? {},
    isReadOnlyMode: scenario.isReadOnlyMode ?? false,
    sendMessage: vi.fn(), editMessage: vi.fn(), lookupMessageAttempt: vi.fn(),
  } as unknown as React.ContextType<typeof WhatsappContext>;
  const internal = {
    messages: scenario.internalCache ?? {},
    sendInternalMessage: vi.fn(),
  } as unknown as React.ContextType<typeof InternalChatContext>;
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={auth}>
      <WhatsappContext.Provider value={whatsapp}>
        <InternalChatContext.Provider value={internal}>
          <ChatProvider><QuoteProbe /></ChatProvider>
        </InternalChatContext.Provider>
      </WhatsappContext.Provider>
    </AuthContext.Provider>,
  );
  expect(whatsapp.sendMessage).not.toHaveBeenCalled();
  expect(internal.sendInternalMessage).not.toHaveBeenCalled();
  return { resolved, html };
}

describe("ChatProvider historical citations", () => {
  it("resolves the loaded original after opening a conversation with an empty session cache", () => {
    const original = message();
    const reply = message({ id: 78, quotedId: original.id, body: "Reply", fileId: null });
    const result = resolveFromProvider({ history: [original, reply] });
    expect(result.resolved).toBe(original);
    expect(result.html).toContain("Original document");
    expect(result.resolved?.fileId).toBe(501);
  });

  it("prefers the current edited original and its metadata over a stale cache copy", () => {
    const cached = message({ body: "Old caption" });
    const edited = message({ body: "Updated caption", isEdited: true, fileName: "updated.pdf" });
    const result = resolveFromProvider({ history: [edited], cache: { 101: [cached] } });
    expect(result.resolved).toBe(edited);
    expect(result.html).toContain("Updated caption");
    expect(result.resolved?.fileName).toBe("updated.pdf");
  });

  it("preserves the cache fallback when the current page does not include the original", () => {
    const cached = message();
    expect(resolveFromProvider({ cache: { 101: [cached] } }).resolved).toBe(cached);
  });

  it.each([
    { label: "a later attendance of the same contact", chatId: 20, isReadOnlyMode: false },
    { label: "the synthetic read-only contact view", chatId: -101, isReadOnlyMode: true },
  ])("resolves an earlier original in $label", ({ chatId, isReadOnlyMode }) => {
    const original = message({ chatId: 1 });
    expect(resolveFromProvider({ history: [original], chatId, isReadOnlyMode }).resolved).toBe(original);
  });

  it("does not use the previous contact's history while another conversation is active", () => {
    const previous = message();
    expect(resolveFromProvider({ history: [previous] }).resolved).toBe(previous);
    expect(resolveFromProvider({ history: [previous], contactId: 202 }).resolved).toBeNull();
    expect(resolveFromProvider({
      history: [previous], contactId: 202, lookupContactId: 202,
    }).resolved).toBeNull();
  });

  it("rejects another contact's original even if it is stored under the requested cache key", () => {
    const wrongContact = message({ contactId: 202 });
    const result = resolveFromProvider({ history: [wrongContact], cache: { 101: [wrongContact] } });
    expect(result.resolved).toBeNull();
    expect(result.html).toContain("Citation unavailable");
  });

  it("does not expose stale tenant history or cache after switching tenants with matching IDs", () => {
    const previous = message();
    const result = resolveFromProvider({
      instance: "tenant-b", history: [previous], cache: { 101: [previous] },
    });
    expect(result.resolved).toBeNull();
    const current = message({ instance: "tenant-b", body: "Current tenant original" });
    expect(resolveFromProvider({ instance: "tenant-b", history: [previous, current] }).resolved).toBe(current);
  });

  it("keeps internal citations in their internal conversation when numeric IDs overlap", () => {
    const whatsappOriginal = message();
    const internalOriginal = {
      ...whatsappOriginal, internalChatId: 101, body: "Internal original", from: "user:1",
    } as InternalMessage;
    const result = resolveFromProvider({
      chatType: "internal", history: [whatsappOriginal], cache: { 101: [whatsappOriginal] },
      internalCache: { 101: [internalOriginal] }, isInternal: true,
    });
    expect(result.resolved).toBe(internalOriginal);
    expect(result.html).toContain("Internal original");
    expect(resolveFromProvider({ history: [whatsappOriginal], isInternal: true }).resolved).toBeNull();
  });

  it("does not treat retained WhatsApp history as the active history of an internal chat", () => {
    expect(resolveFromProvider({ chatType: "internal", history: [message()] }).resolved).toBeNull();
  });
});
