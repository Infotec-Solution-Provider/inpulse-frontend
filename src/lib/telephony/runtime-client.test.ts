import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTelephonyRuntimeClient, type RuntimeCall, type RuntimeOperatorState } from "./runtime-client";
import type { CallReport } from "./browser-phone";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const available: RuntimeOperatorState = { enabled: true, state: "available", version: 1, reasons: [], serverNow: "2026-11-13T12:00:00Z" };
const globalPolicy: RuntimeOperatorState = {
  ...available, scope: "all_channels", requestedScope: "all_channels", scopeReady: true, policyRevision: "a".repeat(64),
  afterAttendanceScope: "telephony_schedule", channels: { telephony: { supported: true, enforced: true }, whatsapp: { supported: true, enforced: true } },
};
const json = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
const rejected = (code: string, status = 409, outcome = "NOT_COMMITTED") => new Response(JSON.stringify({ code, outcome, message: code }), { status, headers: { "Content-Type": "application/json" } });
const clients: ReturnType<typeof createTelephonyRuntimeClient>[] = [];
beforeEach(() => { vi.stubGlobal("indexedDB", new IDBFactory()); vi.stubGlobal("window", new EventTarget()); });
afterEach(() => { clients.splice(0).forEach(client => client.dispose()); vi.unstubAllGlobals(); });
function client(identity = "tenant-a:7") {
  const sync = vi.fn(), state = vi.fn();
  const runtime = createTelephonyRuntimeClient({ identity, getToken: () => "test-token", onSyncError: sync, onOperatorState: state }); clients.push(runtime);
  return { runtime, sync, state };
}
interface Seen { path: string; method: string; body: Record<string, unknown>; instance: string }
function server() {
  const calls = new Map<string, RuntimeCall>(), seen: Seen[] = [], receipts = new Map<string, number>();
  let state = { ...available }, offline = false;
  let intercept: ((request: Seen) => Promise<Response | undefined | void> | Response | undefined | void) | undefined;
  const fetcher = vi.fn(async (raw: string, init?: RequestInit) => {
    const request: Seen = { path: new URL(raw).pathname.replace(/^\/api/, ""), method: init?.method || "GET", body: init?.body ? JSON.parse(String(init.body)) : {}, instance: new Headers(init?.headers).get("x-crm-instance") || "" }; seen.push(request);
    if (offline) throw new TypeError("offline");
    const custom = await intercept?.(request); if (custom) return custom;
    const { path, method, body } = request;
    if (path === "/telephony/operator-state") return json(state);
    if (path === "/telephony/calls" && method === "POST") {
      calls.set(String(body.callId), { callId: String(body.callId), operatorId: 7, direction: String(body.direction), number: String(body.number), state: "prepared", scheduleId: null, preparedAt: available.serverNow, sentAt: null, answeredAt: null, endedAt: null, rating: null, comment: "", reviewVersion: 0, cursor: "1" });
      return json({ callId: body.callId });
    }
    if (path.endsWith("/events")) {
      const call = calls.get(String(body.callId)); if (call) { if (body.type === "sent") call.sentAt = String(body.occurredAt); if (["failed", "ended"].includes(String(body.type))) call.endedAt = String(body.occurredAt); }
      return json({ applied: true });
    }
    if (path.endsWith("/quality")) {
      const operation = String(body.operationId), version = receipts.get(operation) ?? Number(body.expectedVersion) + 1; receipts.set(operation, version); return json({ version });
    }
    if (path.startsWith("/telephony/calls/")) { const call = calls.get(path.split("/")[3]!); return json({ calls: call ? [call] : [] }); }
    if (path === "/telephony/session") return json({ observed: true });
    if (path.includes("/call/start")) return json({ callId: id(99) });
    return json({});
  });
  vi.stubGlobal("fetch", fetcher);
  return { calls, seen, fetcher, receipts, setState: (next: RuntimeOperatorState) => { state = next; }, setOffline: (value: boolean) => { offline = value; }, intercept: (handler: typeof intercept) => { intercept = handler; } };
}
const event = (callId: string, n: number, type: CallReport["type"] = "ended"): CallReport => ({ callId, eventId: id(n), type, occurredAt: available.serverNow });

describe("durable browser telephony journal", () => {
  it("retains uncertain outgoing preparation across reload without retrying or redialing", async () => {
    const api = server(), first = client();
    api.intercept(request => { if (request.path === "/telephony/calls" && request.method === "POST") throw new TypeError("response lost"); });
    await expect(first.runtime.prepareCall({ callId: id(1), direction: "outgoing", number: "101" })).rejects.toThrow();
    first.runtime.reportCall(event(id(1), 2, "failed")); first.runtime.dispose();
    const next = client();
    expect(await next.runtime.pendingPreparations()).toMatchObject([{ callId: id(1), number: "101" }]);
    await expect(next.runtime.prepareCall({ callId: id(3), direction: "outgoing", number: "102" })).rejects.toThrow("sem confirmação");
    await expect(next.runtime.waitForSync()).rejects.toThrow("pendentes");
    expect(api.seen.filter(request => request.path === "/telephony/calls" && request.method === "POST")).toHaveLength(1);
    expect(api.seen.filter(request => request.path.endsWith("/events"))).toHaveLength(0);
    api.intercept(undefined);
    await next.runtime.confirmUnsentPreparation(id(1));
    expect(await next.runtime.pendingPreparations()).toHaveLength(0);
  });
  it("closes only a confirmed unsent preparation and refuses to mark sent calls as failed", async () => {
    const api = server(), { runtime } = client();
    api.intercept(request => {
      if (request.path === "/telephony/calls" && request.method === "POST") {
        api.calls.set(id(1), { callId: id(1), sentAt: null, answeredAt: null, endedAt: null, state: "prepared" } as RuntimeCall);
        throw new TypeError("response lost after commit");
      }
    });
    await expect(runtime.prepareCall({ callId: id(1), direction: "outgoing", number: "101" })).rejects.toThrow();
    api.intercept(undefined); api.calls.get(id(1))!.sentAt = available.serverNow;
    await expect(runtime.confirmUnsentPreparation(id(1))).rejects.toThrow("enviada");
    expect(api.seen.filter(request => request.path.endsWith("/events"))).toHaveLength(0);
    api.calls.get(id(1))!.sentAt = null;
    await runtime.confirmUnsentPreparation(id(1));
    expect(api.seen.filter(request => request.path.endsWith("/events"))).toMatchObject([{ body: { type: "failed", detail: "cancelled_before_sent" } }]);
  });
  it("preserves incoming preparation and events while offline and replays metadata after reload", async () => {
    const api = server(), first = client(); api.setOffline(true);
    await first.runtime.prepareCall({ callId: id(1), direction: "incoming", number: "555" });
    first.runtime.reportCall(event(id(1), 2, "answered")); first.runtime.reportCall(event(id(1), 3));
    await expect(first.runtime.waitForSync()).rejects.toThrow(); first.runtime.dispose();
    api.setOffline(false); const next = client(); await next.runtime.waitForSync();
    expect(api.seen.filter(request => request.path === "/telephony/calls" && request.method === "POST")).toMatchObject([{ body: { direction: "incoming", callId: id(1) } }]);
    expect(api.seen.filter(request => request.path.endsWith("/events")).map(request => request.body.eventId)).toEqual([id(2), id(3)]);
  });
  it("drains an event queued while a previous flush is waiting for its response", async () => {
    const api = server(), { runtime } = client();
    await runtime.prepareCall({ callId: id(1), direction: "outgoing", number: "101" });
    let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    api.intercept(async request => { if (request.path.endsWith("/events") && request.body.eventId === id(2)) await hold; });
    runtime.reportCall(event(id(1), 2, "answered"));
    await vi.waitFor(() => expect(api.seen.some(request => request.body.eventId === id(2))).toBe(true));
    runtime.reportCall(event(id(1), 3));
    const draining = runtime.waitForSync(); release(); await draining;
    expect(api.seen.filter(request => request.path.endsWith("/events")).map(request => request.body.eventId)).toEqual([id(2), id(3)]);
  });
  it("retains permanent refusals without retrying or discarding their dependent events", async () => {
    const api = server(), { runtime } = client();
    api.intercept(request => request.path === "/telephony/calls" && request.method === "POST" ? rejected("TELEPHONY_INVALID_REQUEST", 400) : undefined);
    await runtime.prepareCall({ callId: id(1), direction: "incoming", number: "555" }); runtime.reportCall(event(id(1), 2));
    await expect(runtime.waitForSync()).rejects.toThrow(); await expect(runtime.waitForSync()).rejects.toThrow();
    expect(api.seen.filter(request => request.path === "/telephony/calls" && request.method === "POST")).toHaveLength(1);
    expect(api.seen.filter(request => request.path.endsWith("/events"))).toHaveLength(0);
  });
  it("does not erase older entries when the tenant policy is disabled", async () => {
    const api = server(), { runtime } = client(); api.setOffline(true);
    await runtime.prepareCall({ callId: id(1), direction: "incoming", number: "555" }); await expect(runtime.waitForSync()).rejects.toThrow();
    api.setOffline(false); api.setState({ ...available, enabled: false });
    await expect(runtime.waitForSync()).rejects.toThrow();
    api.setState(available); await runtime.waitForSync();
    expect(api.seen.filter(request => request.path === "/telephony/calls" && request.method === "POST")).toHaveLength(1);
  });
  it("isolates entries by tenant/operator even when operation UUIDs are equal", async () => {
    const api = server(), a = client("tenant-a:7"), b = client("tenant-b:7"); api.setOffline(true);
    await a.runtime.prepareCall({ callId: id(1), direction: "incoming", number: "111" }); await b.runtime.prepareCall({ callId: id(1), direction: "incoming", number: "222" });
    await expect(a.runtime.waitForSync()).rejects.toThrow(); await expect(b.runtime.waitForSync()).rejects.toThrow(); api.setOffline(false);
    await a.runtime.waitForSync();
    expect(api.seen.filter(request => request.path === "/telephony/calls" && request.method === "POST").map(request => request.instance)).toEqual(["tenant-a"]);
    await b.runtime.waitForSync();
    expect(api.seen.filter(request => request.path === "/telephony/calls" && request.method === "POST").map(request => request.instance)).toEqual(["tenant-a", "tenant-b"]);
  });
  it("reactivates safely after StrictMode cleanup without clearing the journal", async () => {
    const api = server(), { runtime, state } = client();
    runtime.dispose(); runtime.activate(); runtime.activate();
    await runtime.refreshState(); expect(state).toHaveBeenCalledTimes(1);
    await runtime.session("connect", id(10));
    expect(api.seen.filter(request => request.path === "/telephony/session")).toMatchObject([{ body: { kind: "connect", sessionId: id(10) } }]);
    api.setState({ ...available, enabled: false }); await runtime.refreshState(); await runtime.session("heartbeat", id(10));
    expect(api.seen.filter(request => request.path === "/telephony/session")).toHaveLength(1);
  });
  it("keeps legacy synchronization failure visible to the finish gate", async () => {
    const api = server(), { runtime } = client(); api.setState({ ...available, enabled: false });
    await runtime.prepareCall({ callId: id(1), direction: "outgoing", number: "101", scheduleId: 42 });
    api.intercept(request => request.path.endsWith("/call/end") ? rejected("LEGACY_UNKNOWN", 503, "UNKNOWN") : undefined);
    runtime.reportCall(event(id(1), 2));
    await expect(runtime.waitForSync()).rejects.toThrow("LEGACY_UNKNOWN");
    expect(api.seen.filter(request => request.path.endsWith("/call/end"))).toMatchObject([{method:"PATCH"}]);
  });
  it("reuses the review operation ID after uncertain commit, including after reload", async () => {
    const api = server(), first = client(), call = { callId: id(1), reviewVersion: 0 } as RuntimeCall;
    let lose = true;
    api.intercept(request => { if (request.path.endsWith("/quality") && lose) { lose = false; throw new TypeError("response lost"); } });
    await expect(first.runtime.review(call, "BOA", "Áudio limpo")).rejects.toThrow(); first.runtime.dispose();
    const next = client();
    await expect(next.runtime.review(call, "RUIM", "outro")).rejects.toThrow("sem confirmação");
    await expect(next.runtime.review({ ...call, reviewVersion: 1 }, "BOA", "Áudio limpo")).resolves.toEqual({ version: 1 });
    const writes = api.seen.filter(request => request.path.endsWith("/quality"));
    expect(writes).toHaveLength(2); expect(writes[1]!.body.operationId).toBe(writes[0]!.body.operationId); expect(writes[1]!.body.expectedVersion).toBe(0);
  });
  it("allows another attempt only for the same schedule while an after-attendance pause is pending", async () => {
    const api=server(),{runtime}=client();api.setState({...available,state:"pending",pendingScheduleId:42});
    await expect(runtime.prepareCall({callId:id(1),direction:"outgoing",number:"101",scheduleId:42})).resolves.toBeUndefined();
    await expect(runtime.prepareCall({callId:id(2),direction:"outgoing",number:"102",scheduleId:43})).rejects.toThrow("Retome");
    await expect(runtime.prepareCall({callId:id(3),direction:"outgoing",number:"103"})).rejects.toThrow("Retome");
    expect(api.seen.filter(request=>request.path==="/telephony/calls"&&request.method==="POST")).toHaveLength(1);
  });
  it("does not report a clean finish when the browser could not persist an incoming event",async()=>{
    server();const {runtime}=client();vi.stubGlobal("indexedDB",{open(){throw new Error("disk unavailable");}});
    await expect(runtime.prepareCall({callId:id(1),direction:"incoming",number:"111"})).rejects.toThrow();
    await expect(runtime.waitForSync()).rejects.toThrow("registro local");
  });

  it("does not replace an acknowledged pause with a GET snapshot started before the acknowledgement", async () => {
    const api = server(), { runtime, state } = client();
    const paused: RuntimeOperatorState = { ...available, state: "paused", version: 2, reasonId: 3 };
    let releaseAction!: () => void, releasePoll!: () => void, holdPoll = false;
    const actionPending = new Promise<void>(resolve => { releaseAction = resolve; });
    api.intercept(async request => {
      if (request.path === "/telephony/operator-state/actions") {
        await actionPending;
        api.setState(paused);
        return json(paused);
      }
      if (request.path === "/telephony/operator-state" && holdPoll) {
        return new Promise<Response>(resolve => { releasePoll = () => resolve(json(available)); });
      }
    });
    const action = runtime.commandPause("now", 3);
    await vi.waitFor(() => expect(api.seen.some(request => request.path.endsWith("/actions"))).toBe(true));
    holdPoll = true;
    const poll = runtime.refreshState();
    await vi.waitFor(() => expect(releasePoll).toBeTypeOf("function"));
    releaseAction();
    await expect(action).resolves.toEqual(paused);
    const published = state.mock.calls.length;
    releasePoll();
    await poll;
    expect(state).toHaveBeenLastCalledWith(paused);
    expect(state).toHaveBeenCalledTimes(published);
    const write = api.seen.find(request => request.path.endsWith("/actions"))!;
    expect(write.body).toMatchObject({ kind: "now", reasonId: 3, expectedVersion: 1 });

    // A later GET can also be stale; the request counter alone cannot reject it.
    holdPoll = false;
    api.setState(available);
    await expect(runtime.refreshState()).resolves.toEqual(paused);
    expect(state).toHaveBeenLastCalledWith(paused);

    // A new policy snapshot must still be accepted even though OFF has version zero.
    const disabled = { ...available, enabled: false, version: 0 };
    api.setState(disabled);
    await runtime.refreshState();
    expect(state).toHaveBeenLastCalledWith(disabled);
    await expect(runtime.session("connect", id(20))).resolves.toEqual({ observed: false });
    expect(api.seen.filter(request => request.path === "/telephony/session")).toHaveLength(0);
    api.setState(available);
    await runtime.refreshState();
    expect(state).toHaveBeenLastCalledWith(available);
  });

  it("refreshes operator state after a competing action rejects the expected version", async () => {
    const api = server(), { runtime, state } = client();
    const competing: RuntimeOperatorState = { ...available, state: "paused", version: 4, reasonId: 8 };
    api.intercept(request => {
      if (request.path.endsWith("/actions")) {
        api.setState(competing);
        return rejected("VERSION_CONFLICT");
      }
    });
    await expect(runtime.commandPause("now", 3)).rejects.toMatchObject({ code: "VERSION_CONFLICT", status: 409 });
    expect(state).toHaveBeenLastCalledWith(competing);
    expect(api.seen.map(request => request.path)).toEqual([
      "/telephony/operator-state",
      "/telephony/operator-state/actions",
      "/telephony/operator-state",
    ]);
  });

  it("marks an offline incoming resume as pending until its durable operation is confirmed", async () => {
    const api = server(), { runtime, state } = client();
    api.setState({ ...available, state: "paused", version: 2 });
    await runtime.refreshState();
    api.setOffline(true);
    await expect(runtime.commandPause("resume", undefined, true)).resolves.toMatchObject({ state: "available", version: 2, pendingSync: true });
    expect(state).toHaveBeenLastCalledWith(expect.objectContaining({ pendingSync: true }));
    await expect(runtime.waitForSync()).rejects.toThrow();
    api.setOffline(false);
    api.intercept(request => {
      if (request.path.endsWith("/actions")) {
        const confirmed = { ...available, version: 3 };
        api.setState(confirmed);
        return json(confirmed);
      }
    });
    await runtime.waitForSync();
    expect(state).toHaveBeenLastCalledWith({ ...available, version: 3 });
    expect(api.seen.filter(request => request.path.endsWith("/actions"))).toMatchObject([
      { body: { kind: "resume", expectedVersion: 2, occurredAt: expect.any(String) } },
    ]);
  });

  it("keeps a newer GET state when an older action acknowledgement arrives afterwards", async () => {
    const api = server(), { runtime, state } = client();
    const acknowledged: RuntimeOperatorState = { ...available, state: "paused", version: 2, reasonId: 3 };
    const newer: RuntimeOperatorState = { ...available, version: 3 };
    let releaseAction!: () => void;
    const actionPending = new Promise<void>(resolve => { releaseAction = resolve; });
    api.intercept(async request => {
      if (request.path.endsWith("/actions")) {
        await actionPending;
        return json(acknowledged);
      }
    });
    const action = runtime.commandPause("now", 3);
    await vi.waitFor(() => expect(api.seen.some(request => request.path.endsWith("/actions"))).toBe(true));
    api.setState(newer);
    await expect(runtime.refreshState()).resolves.toEqual(newer);
    const published = state.mock.calls.length;
    releaseAction();
    await expect(action).resolves.toEqual(newer);
    expect(state).toHaveBeenLastCalledWith(newer);
    expect(state).toHaveBeenCalledTimes(published);
  });

  it("keeps the optimistic incoming resume while a GET still reports the same server version", async () => {
    const api = server(), { runtime, state } = client();
    api.setState({ ...available, state: "paused", version: 2, reasonId: 3 });
    await runtime.refreshState();
    api.setOffline(true);
    await runtime.commandPause("resume", undefined, true);
    await expect(runtime.waitForSync()).rejects.toThrow();
    const optimistic = state.mock.lastCall![0] as RuntimeOperatorState;
    expect(optimistic).toMatchObject({ state: "available", version: 2, pendingSync: true });
    api.setOffline(false);
    const published = state.mock.calls.length;
    await expect(runtime.refreshState()).resolves.toEqual(optimistic);
    expect(state).toHaveBeenCalledTimes(published);
    expect(state).toHaveBeenLastCalledWith(optimistic);
    api.intercept(request => {
      if (request.path.endsWith("/actions")) {
        const confirmed = { ...available, version: 3 };
        api.setState(confirmed);
        return json(confirmed);
      }
    });
    await runtime.waitForSync();
    expect(state).toHaveBeenLastCalledWith({ ...available, version: 3 });
  });

  it("keeps a policy OFF observed during an action until a subsequent ON GET is confirmed", async () => {
    const api = server(), { runtime, state } = client();
    const disabled = { ...available, enabled: false, version: 0 };
    const reenabled = { ...available, version: 1 };
    let releaseAction!: () => void, releaseOn!: () => void, holdOn = false;
    const actionPending = new Promise<void>(resolve => { releaseAction = resolve; });
    api.intercept(async request => {
      if (request.path.endsWith("/actions")) {
        await actionPending;
        return json({ ...available, state: "paused", version: 2, reasonId: 3 });
      }
      if (request.path === "/telephony/operator-state" && holdOn) {
        return new Promise<Response>(resolve => { releaseOn = () => resolve(json(reenabled)); });
      }
    });
    const action = runtime.commandPause("now", 3);
    await vi.waitFor(() => expect(api.seen.some(request => request.path.endsWith("/actions"))).toBe(true));
    api.setState(disabled);
    await runtime.refreshState();
    expect(state).toHaveBeenLastCalledWith(disabled);
    holdOn = true;
    const on = runtime.refreshState();
    await vi.waitFor(() => expect(releaseOn).toBeTypeOf("function"));
    const published = state.mock.calls.length;
    releaseAction();
    await expect(action).resolves.toEqual(disabled);
    expect(state).toHaveBeenCalledTimes(published);
    expect(state).toHaveBeenLastCalledWith(disabled);
    await expect(runtime.session("connect", id(21))).resolves.toEqual({ observed: false });
    releaseOn();
    await expect(on).resolves.toEqual(reenabled);
    expect(state).toHaveBeenLastCalledWith(reenabled);
  });

  it.each([2, 3])("keeps a phone-only rollback when an old global action acknowledges version %i", async acknowledgedVersion => {
    const api = server(), { runtime, state } = client();
    api.setState(globalPolicy);
    const phoneOnly: RuntimeOperatorState = {
      ...globalPolicy, scope: "telephony", requestedScope: "telephony", version: 2,
      policyRevision: "b".repeat(64), channels: { telephony: { supported: true, enforced: true }, whatsapp: { supported: true, enforced: false } },
    };
    let releaseAction!: () => void;
    const actionPending = new Promise<void>(resolve => { releaseAction = resolve; });
    api.intercept(async request => {
      if (request.path.endsWith("/actions")) {
        await actionPending;
        return json({ ...globalPolicy, state: "paused", version: acknowledgedVersion });
      }
    });
    const action = runtime.commandPause("now", 3);
    await vi.waitFor(() => expect(api.seen.some(request => request.path.endsWith("/actions"))).toBe(true));
    api.setState(phoneOnly);
    await expect(runtime.refreshState()).resolves.toEqual(phoneOnly);
    const published = state.mock.calls.length;
    releaseAction();
    await expect(action).resolves.toEqual(phoneOnly);
    expect(state).toHaveBeenCalledTimes(published);
    expect(state).toHaveBeenLastCalledWith(phoneOnly);
    // A later authoritative GET still reconciles the operator state under the new policy.
    const confirmed = { ...phoneOnly, state: "paused" as const, version: 3 };
    api.setState(confirmed);
    await expect(runtime.refreshState()).resolves.toEqual(confirmed);
  });

  const policyChanges: Array<[string, Partial<RuntimeOperatorState>]> = [
    ["scope", { scope: "telephony" }],
    ["requested scope", { requestedScope: "telephony" }],
    ["scope readiness", { scopeReady: false }],
    ["policy revision", { policyRevision: "b".repeat(64) }],
    ["phone support", { channels: { telephony: { supported: false, enforced: true }, whatsapp: { supported: true, enforced: true } } }],
    ["phone enforcement", { channels: { telephony: { supported: true, enforced: false }, whatsapp: { supported: true, enforced: true } } }],
    ["WhatsApp support", { channels: { telephony: { supported: true, enforced: true }, whatsapp: { supported: false, enforced: true } } }],
    ["WhatsApp enforcement", { channels: { telephony: { supported: true, enforced: true }, whatsapp: { supported: true, enforced: false } } }],
    ["legacy metadata omission", { scope: undefined, requestedScope: undefined, scopeReady: undefined, policyRevision: undefined, channels: undefined }],
  ];
  it.each(policyChanges)("rejects stale global acknowledgements after a change in %s", async (_label, change) => {
    const api = server(), { runtime, state } = client();
    api.setState(globalPolicy);
    let releaseAction!: () => void;
    const actionPending = new Promise<void>(resolve => { releaseAction = resolve; });
    api.intercept(async request => {
      if (request.path.endsWith("/actions")) {
        await actionPending;
        return json({ ...globalPolicy, state: "paused", version: 3 });
      }
    });
    const action = runtime.commandPause("now", 3);
    await vi.waitFor(() => expect(api.seen.some(request => request.path.endsWith("/actions"))).toBe(true));
    const current = { ...globalPolicy, ...change };
    api.setState(current);
    await runtime.refreshState();
    releaseAction();
    await expect(action).resolves.toEqual(current);
    expect(state).toHaveBeenLastCalledWith(current);
  });

  it("accepts a current action acknowledgement after only state and clock updates", async () => {
    const api = server(), { runtime, state } = client();
    api.setState(globalPolicy);
    let releaseAction!: () => void;
    const actionPending = new Promise<void>(resolve => { releaseAction = resolve; });
    const acknowledged = { ...globalPolicy, state: "paused" as const, version: 3 };
    api.intercept(async request => {
      if (request.path.endsWith("/actions")) { await actionPending; return json(acknowledged); }
    });
    const action = runtime.commandPause("now", 3);
    await vi.waitFor(() => expect(api.seen.some(request => request.path.endsWith("/actions"))).toBe(true));
    api.setState({ ...globalPolicy, state: "pending", version: 2, serverNow: "2026-11-13T12:01:00Z" });
    await runtime.refreshState();
    releaseAction();
    await expect(action).resolves.toEqual(acknowledged);
    expect(state).toHaveBeenLastCalledWith(acknowledged);
  });

  it("withdraws stale channel guarantees without undoing an offline incoming resume", async () => {
    const api = server(), { runtime, state } = client();
    api.setState({ ...globalPolicy, state: "paused", version: 2 });
    await runtime.refreshState();
    api.setOffline(true);
    await runtime.commandPause("resume", undefined, true);
    await expect(runtime.waitForSync()).rejects.toThrow();
    api.setOffline(false);
    const phoneOnly: RuntimeOperatorState = {
      ...globalPolicy, state: "paused", version: 2, scope: "telephony", scopeReady: false,
      channels: { telephony: { supported: true, enforced: true }, whatsapp: { supported: true, enforced: false } },
    };
    api.setState(phoneOnly);
    await expect(runtime.refreshState()).resolves.toMatchObject({ ...phoneOnly, state: "available", pendingSync: true });
    expect(state).toHaveBeenLastCalledWith(expect.objectContaining({ state: "available", pendingSync: true, scope: "telephony", scopeReady: false, channels: phoneOnly.channels }));
  });

});
