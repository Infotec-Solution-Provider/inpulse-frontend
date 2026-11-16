import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOperatorPauseClient, type RuntimeOperatorState } from "./client";
const status: RuntimeOperatorState = { authority: "central-v1", enabled: true, state: "available", version: 1, reasons: [], serverNow: "2026-11-16T12:00:00Z" };
const callId = "00000000-0000-4000-8000-000000000001";
const payload = { resultId: 9, startedAt: "2026-11-16T11:59:00Z", finishedAt: "2026-11-16T12:00:00Z", dialedPhone: "101" };
const json = (data: unknown) => new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json" } });
type Seen = { path: string; method: string; body: any };
const clients: ReturnType<typeof createOperatorPauseClient>[] = [];
beforeEach(() => { vi.stubGlobal("indexedDB", new IDBFactory()); vi.stubGlobal("window", new EventTarget()); });
afterEach(() => { clients.forEach(client => client.dispose()); clients.length = 0; vi.unstubAllGlobals(); });
function setup(intercept: (request: Seen) => Promise<Response | void> | Response | void) {
  const seen: Seen[] = [];
  vi.stubGlobal("fetch", vi.fn(async (raw: string, init: RequestInit) => {
    const request = { path: new URL(raw, "http://fixture.test").pathname, method: init.method || "GET", body: init.body ? JSON.parse(String(init.body)) : {} };
    seen.push(request); return await intercept(request) ?? json(status);
  }));
  const create = () => { const client = createOperatorPauseClient({ identity: "tenant-a:7:central-v1", getToken: () => "fixture-token" }); clients.push(client); return client; };
  return { seen, create };
}
describe("production legacy journal", () => {
  it("preserves uncertain legacy start across reload without automatically repeating call/start", async () => {
    const api = setup(request => { if (request.path.endsWith("/call/start")) throw new TypeError("response lost"); });
    const first = api.create(); await expect(first.startLegacyCall({ callId, scheduleId: 42, number: "101" })).rejects.toThrow(); first.dispose();
    const reloaded = api.create();
    await expect(reloaded.pendingPreparations()).resolves.toMatchObject([{ callId, scheduleId: 42 }]);
    await expect(reloaded.waitForSync()).rejects.toThrow("pendentes");
    await expect(reloaded.startLegacyCall({ callId: crypto.randomUUID(), scheduleId: 42, number: "101" })).rejects.toThrow("sem confirmação");
    expect(api.seen.filter(request => request.path.endsWith("/call/start"))).toHaveLength(1);
    expect(api.seen.find(request => request.path.endsWith("/call/start"))?.body).toEqual({ callId, dialedPhone: "101" });
  });
  it("retains an uncertain frozen finish across reload and consults its original UUID without replaying PATCH", async () => {
    let receipt = "UNKNOWN";
    const api = setup(request => {
      if (request.path.endsWith("/finish") && request.method === "PATCH") throw new TypeError("commit response lost");
      if (request.path.includes("/finish-attempts/")) return json({ operationId: request.path.split("/").at(-1), outcome: receipt, status: receipt === "COMMITTED" ? "verified" : "not_found", retryAllowed: false });
    });
    const first = api.create(); await expect(first.finishLegacySchedule(42, payload)).rejects.toThrow(); first.dispose();
    const reloaded = api.create(), pending = await reloaded.pendingFinishes();
    expect(pending).toHaveLength(1); const operationId = pending[0]!.operationId;
    await expect(reloaded.waitForSync()).rejects.toThrow("pendentes");
    await expect(reloaded.finishLegacySchedule(42, { ...payload, resultId: 10 })).rejects.toThrow("antes de alterar");
    await expect(reloaded.finishLegacySchedule(42, { ...payload, finishedAt: "2026-11-16T12:02:00Z" })).rejects.toThrow("não será repetida");
    expect(api.seen.filter(request => request.method === "PATCH")).toHaveLength(1);
    expect(api.seen.filter(request => request.path.includes("/finish-attempts/")).every(request => request.path.endsWith(operationId))).toBe(true);
    receipt = "COMMITTED";
    await expect(reloaded.confirmLegacyFinish(operationId)).resolves.toMatchObject({ outcome: "COMMITTED" });
    await expect(reloaded.pendingFinishes()).resolves.toHaveLength(0);
    expect(api.seen.filter(request => request.method === "PATCH")).toHaveLength(1);
  });
  it("returns confirmed success even if the following status refresh fails", async () => {
    let finished = false;
    const api = setup(request => {
      if (request.path.endsWith("/finish") && request.method === "PATCH") { finished = true; return json({ outcome: "COMMITTED" }); }
      if (finished && request.path.endsWith("/operator-state")) throw new TypeError("status unavailable after commit");
    });
    const client = api.create();
    await expect(client.finishLegacySchedule(42, payload)).resolves.toEqual({ outcome: "COMMITTED" });
    await expect(client.pendingFinishes()).resolves.toHaveLength(0);
    expect(api.seen.filter(request => request.method === "PATCH")).toHaveLength(1);
  });
  it("removes only a known not-committed finish and never invents a missing committed receipt", async () => {
    const api = setup(request => request.method === "PATCH" ? new Response(JSON.stringify({ message: "Not written", outcome: "NOT_COMMITTED" }), { status: 409, headers: { "Content-Type": "application/json" } }) : undefined);
    const client = api.create(); await expect(client.finishLegacySchedule(42, payload)).rejects.toMatchObject({ outcome: "NOT_COMMITTED" });
    await expect(client.pendingFinishes()).resolves.toHaveLength(0);
    await expect(client.confirmLegacyFinish(crypto.randomUUID())).rejects.toThrow("não foi encontrada");
  });
  it("rejects outgoing terminal events emitted while the first admission GET is still pending", async () => {
    let release!: () => void; const hold = new Promise<void>(resolve => { release = resolve; }); let holdStatus = true;
    const api = setup(async request => {
      if (request.path.endsWith("/operator-state") && holdStatus) await hold;
      if (request.path.endsWith("/telephony/calls") && request.method === "POST") return json({ callId });
      if (request.path.endsWith("/events")) return json({ received: true });
    });
    const client = api.create(); const preparation = client.prepareCall({ callId, direction: "outgoing", number: "101" });
    client.reportCall({ callId, eventId: crypto.randomUUID(), type: "ended", occurredAt: status.serverNow });
    await vi.waitFor(() => expect(api.seen.some(request => request.path.endsWith("/operator-state"))).toBe(true));
    holdStatus = false; release(); await preparation;
    client.reportCall({ callId, eventId: crypto.randomUUID(), type: "failed", detail: "cancelled_before_sent", occurredAt: status.serverNow });
    await client.waitForSync();
    expect(api.seen.filter(request => request.path.endsWith("/events"))).toMatchObject([{ body: { type: "failed", detail: "cancelled_before_sent" } }]);
    expect(api.seen.filter(request => request.path.endsWith("/events"))).toHaveLength(1);
  });
  it("does not replay metadata while authority is unknown, then synchronizes it under central-v1", async () => {
    let authority: string = "tenant-crm";
    const api = setup(request => request.path.endsWith("/operator-state") ? json({ ...status, authority }) : request.path.endsWith("/telephony/calls") ? json({ callId }) : undefined);
    const client = api.create(); await client.prepareCall({ callId, direction: "incoming", number: "101" });
    await expect(client.waitForSync()).rejects.toThrow("autoridade");
    expect(api.seen.filter(request => request.path.endsWith("/telephony/calls"))).toHaveLength(0);
    authority = "central-v1"; await client.waitForSync();
    expect(api.seen.filter(request => request.path.endsWith("/telephony/calls"))).toHaveLength(1);
  });
  it("captures incoming calls when a cached OFF has changed to central ON", async () => {
    let enabled = false;
    const api = setup(request => request.path.endsWith("/operator-state") ? json({ ...status, enabled, version: enabled ? 1 : 0 }) : json({ received: true }));
    const client = api.create(); await client.refreshState(); enabled = true;
    await client.prepareCall({ callId, direction: "incoming", number: "101" });
    client.reportCall({ callId, eventId: crypto.randomUUID(), type: "answered", occurredAt: status.serverNow });
    await client.waitForSync();
    expect(api.seen.filter(request => request.path.endsWith("/telephony/calls") && request.method === "POST")).toHaveLength(1);
    expect(api.seen.find(request => request.path.endsWith("/telephony/calls"))?.body).not.toHaveProperty("legacyCandidate");
    expect(api.seen.filter(request => request.path.endsWith("/events"))).toMatchObject([{ body: { type: "answered" } }]);
  });
  it("keeps a newly confirmed OFF incoming call in legacy mode without permanent pending records", async () => {
    const api = setup(request => request.path.endsWith("/operator-state") ? json({ ...status, enabled: false, version: 0 }) : undefined);
    const client = api.create(); await client.refreshState();
    await client.prepareCall({ callId, direction: "incoming", number: "101" });
    client.reportCall({ callId, eventId: crypto.randomUUID(), type: "answered", occurredAt: status.serverNow });
    await expect(client.waitForSync()).resolves.toBeUndefined();
    expect(api.seen.filter(request => request.method === "POST")).toHaveLength(0);
  });
  it("retains terminal events of previously admitted calls while policy is OFF and never replays outgoing prepare", async () => {
    let enabled = true;
    const api = setup(request => request.path.endsWith("/operator-state") ? json({ ...status, enabled, version: enabled ? 1 : 0 }) : json({ received: true }));
    const client = api.create(); await client.prepareCall({ callId, direction: "outgoing", number: "101" });
    enabled = false; await client.refreshState();
    client.reportCall({ callId, eventId: crypto.randomUUID(), type: "ended", occurredAt: status.serverNow });
    await expect(client.waitForSync()).rejects.toThrow("pendentes");
    enabled = true; await client.waitForSync();
    expect(api.seen.filter(request => request.path.endsWith("/telephony/calls") && request.method === "POST")).toHaveLength(1);
    expect(api.seen.filter(request => request.path.endsWith("/events"))).toMatchObject([{ body: { type: "ended" } }]);
  });
});
