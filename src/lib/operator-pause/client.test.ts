import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOperatorPauseClient, type RuntimeOperatorState } from "./client";

const available: RuntimeOperatorState = { authority: "central-v1", enabled: true, state: "available", version: 1, reasons: [], serverNow: "2026-11-16T12:00:00Z" };
const global: RuntimeOperatorState = { ...available, scope: "all_channels", requestedScope: "all_channels", scopeReady: true, policyRevision: "a".repeat(64),
  channels: { telephony: { supported: true, enforced: true }, whatsapp: { supported: true, enforced: true } } };
const json = (data: unknown) => new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json" } });
let current: RuntimeOperatorState, intercept: ((init: RequestInit) => Promise<Response> | Response | undefined) | undefined;
const changes: Array<[string, Partial<RuntimeOperatorState>]> = [
  ["scope", { scope: "telephony" }], ["requested scope", { requestedScope: "telephony" }], ["readiness", { scopeReady: false }],
  ["policy revision", { policyRevision: "b".repeat(64) }],
  ["telephone supported", { channels: { telephony: { supported: false, enforced: true }, whatsapp: { supported: true, enforced: true } } }],
  ["telephone enforced", { channels: { telephony: { supported: true, enforced: false }, whatsapp: { supported: true, enforced: true } } }],
  ["WhatsApp supported", { channels: { telephony: { supported: true, enforced: true }, whatsapp: { supported: false, enforced: true } } }],
  ["WhatsApp enforced", { channels: { telephony: { supported: true, enforced: true }, whatsapp: { supported: true, enforced: false } } }],
  ["omitted legacy metadata", { scope: undefined, requestedScope: undefined, scopeReady: undefined, policyRevision: undefined, channels: undefined }],
];
beforeEach(() => { current = global; intercept = undefined; vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => await intercept?.(init) ?? json(current))); });
afterEach(() => vi.unstubAllGlobals());
const client = () => { const state = vi.fn(), unavailable = vi.fn(); return { state, unavailable, runtime: createOperatorPauseClient({ identity: "tenant-a:7:central-v1", getToken: () => "snapshot-token", onOperatorState: state, onUnavailable: unavailable }) }; };

describe("production pause-only client", () => {
  it("clears a previously enabled snapshot on definitive pilot denial and never falls back to legacy prepare", async () => {
    const denied = vi.fn(), runtime = createOperatorPauseClient({ identity: "odim:535:central-v1", getToken: () => "token", onAccessDenied: denied });
    await runtime.refreshState();
    intercept = () => new Response(JSON.stringify({ code: "OPERATOR_FEATURE_PILOT_REQUIRED", message: "Denied" }), { status: 403, headers: { "Content-Type": "application/json" } });
    await expect(runtime.refreshState()).rejects.toMatchObject({ status: 403 });
    await expect(runtime.prepareCall({ callId: crypto.randomUUID(), direction: "outgoing", number: "102" })).rejects.toMatchObject({ status: 403 });
    expect(denied).toHaveBeenCalled();
    expect(vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });
  it("cannot resurrect an enabled snapshot from an old action ACK after access was revoked", async () => {
    const { runtime, state } = client(); let release!: () => void, denied = false;
    const hold = new Promise<void>(resolve => { release = resolve; });
    intercept = async init => init.method === "POST" ? (await hold, json({ ...global, version: 5, state: "paused" })) : denied ? new Response(JSON.stringify({ code: "OPERATOR_FEATURE_PILOT_REQUIRED" }), { status: 403, headers: { "Content-Type": "application/json" } }) : json(global);
    const action = runtime.commandPause("now", 3);
    const rejected = expect(action).rejects.toMatchObject({ code: "OPERATOR_FEATURE_PILOT_REQUIRED" });
    await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    denied = true; await expect(runtime.refreshState()).rejects.toMatchObject({ status: 403 });
    const publications = state.mock.calls.length; release(); await rejected;
    expect(state).toHaveBeenCalledTimes(publications);
  });
  it.each([2, 3])("retains phone-only rollback over old global action ACK version %i", async version => {
    const { runtime, state } = client(); let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    intercept = async init => { if (init.method === "POST") { await hold; return json({ ...global, state: "paused", version }); } return json(current); };
    const action = runtime.commandPause("now", 3);
    await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    current = { ...global, version: 2, scope: "telephony", requestedScope: "telephony", policyRevision: "b".repeat(64), channels: { telephony: { supported: true, enforced: true }, whatsapp: { supported: true, enforced: false } } };
    await runtime.refreshState(); release();
    await expect(action).resolves.toEqual(current);
    expect(state).toHaveBeenLastCalledWith(current);
  });
  it.each(changes)("does not let delayed ACK restore changed %s", async (_label, metadata) => {
    const { runtime } = client(); let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    intercept = async init => { if (init.method === "POST") { await hold; return json({ ...global, version: 5, state: "paused" }); } return json(current); };
    const action = runtime.commandPause("now", 3);
    await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    current = { ...global, ...metadata }; await runtime.refreshState(); release();
    await expect(action).resolves.toEqual(current);
  });
  it("keeps disabled policy despite a delayed enabled action acknowledgement", async () => {
    const { runtime } = client(); let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    intercept = async init => { if (init.method === "POST") { await hold; return json({ ...global, state: "paused", version: 2 }); } return json(current); };
    const action = runtime.commandPause("now", 3);
    await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    current = { ...available, enabled: false, version: 0 }; await runtime.refreshState(); release();
    await expect(action).resolves.toEqual(current);
    current = available; await expect(runtime.refreshState()).resolves.toEqual(available);
  });
  it("keeps the highest operator version and accepts newer state/clock without treating it as a policy change", async () => {
    const { runtime } = client(); let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    const acknowledged = { ...global, version: 3, state: "paused" as const };
    intercept = async init => { if (init.method === "POST") { await hold; return json(acknowledged); } return json(current); };
    const action = runtime.commandPause("now", 3);
    await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    current = { ...global, version: 2, state: "pending", serverNow: "2026-11-16T12:01:00Z" }; await runtime.refreshState(); release();
    await expect(action).resolves.toEqual(acknowledged);
    current = global; await expect(runtime.refreshState()).resolves.toEqual(acknowledged);
  });
  it("updates policy at the same optimistic operator version without regressing local state", async () => {
    const { runtime } = client(); current = { ...global, pendingSync: true, version: 2 }; await runtime.refreshState();
    current = { ...global, state: "paused", scope: "telephony", scopeReady: false, version: 2 };
    await expect(runtime.refreshState()).resolves.toMatchObject({ state: "available", pendingSync: true, scope: "telephony", scopeReady: false, version: 2 });
  });
  it("does not publish available on gateway HTML/404 or malformed JSON snapshots", async () => {
    const { runtime, state, unavailable } = client();
    intercept = () => new Response("not found", { status: 404, headers: { "Content-Type": "text/html" } });
    await expect(runtime.refreshState()).rejects.toThrow("indisponível");
    intercept = () => json({}); await expect(runtime.refreshState()).rejects.toThrow("conferir");
    expect(state).not.toHaveBeenCalled(); expect(unavailable).toHaveBeenCalledTimes(2);
  });
  it("never posts an action while runtime is disabled", async () => {
    const { runtime, state } = client(); current = { ...available, enabled: false, version: 0 };
    await expect(runtime.commandPause("now", 3)).rejects.toThrow("não está disponível");
    expect(state).toHaveBeenLastCalledWith(current);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
  });
  it("uses the production service alias and tenant/auth snapshot without replaying a 401 write", async () => {
    const { runtime } = client();
    intercept = init => init.method === "POST" ? new Response(JSON.stringify({ message: "Expired", code: "UNAUTHORIZED" }), { status: 401, headers: { "Content-Type": "application/json" } }) : undefined;
    await expect(runtime.commandPause("now", 3)).rejects.toMatchObject({ status: 401 });
    const writes = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST");
    expect(writes).toHaveLength(1);
    expect(writes[0]![0]).toBe("/api/customers/telephony/operator-state/actions");
    expect(writes[0]![1]?.headers).toMatchObject({ Authorization: "Bearer snapshot-token", "x-crm-instance": "tenant-a" });
  });
  it("rejects an unconfirmed authority and never publishes an available snapshot", async () => {
    const { runtime, state, unavailable } = client();
    intercept = () => json({ ...global, authority: "tenant-crm" });
    await expect(runtime.refreshState()).rejects.toThrow("autoridade");
    expect(state).not.toHaveBeenCalled(); expect(unavailable).toHaveBeenCalledOnce();
  });
  it("keeps communication uncertainty when an older action ACK follows a failed status check", async () => {
    const { runtime, state, unavailable } = client(); let release!: () => void, failStatus = false;
    const hold = new Promise<void>(resolve => { release = resolve; });
    intercept = async init => {
      if (init.method === "POST") { await hold; return json({ ...global, state: "paused", version: 3 }); }
      if (failStatus) return new Response("not found", { status: 404, headers: { "Content-Type": "text/html" } });
      return json(global);
    };
    const action = runtime.commandPause("now", 3);
    await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    failStatus = true;
    await expect(runtime.refreshState()).rejects.toThrow("indisponível");
    const published = state.mock.calls.length; release();
    await expect(action).resolves.toEqual(global);
    expect(state).toHaveBeenCalledTimes(published); expect(unavailable).toHaveBeenCalledOnce();
  });
});
