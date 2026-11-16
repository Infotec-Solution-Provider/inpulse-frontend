import type { RuntimeOperatorState } from "../../src/lib/operator-pause/client";

const query = new URLSearchParams(location.search);
const initial: RuntimeOperatorState = {
  authority: "central-v1", enabled: !query.has("runtime-off"), state: "available", version: 1,
  scope: query.has("mixed") ? "telephony" : "all_channels", requestedScope: "all_channels", scopeReady: !query.has("mixed"), policyRevision: "a".repeat(64),
  afterAttendanceScope: "telephony_schedule", activeCallId: null,
  channels: { telephony: { supported: true, enforced: true }, whatsapp: { supported: true, enforced: !query.has("mixed"), reason: query.has("mixed") ? "unavailable" : null } },
  reasons: [{ id: 3, name: "Café", maxSeconds: 60, productive: "NAO" }], allowChangeReason: true, serverNow: new Date().toISOString(),
};
let saved: any = null;
try { saved = JSON.parse(sessionStorage.getItem("production-pause-fixture") || "null"); } catch { /* Synthetic fixture state only. */ }
const fixture = {
  operator: (saved?.operator ?? initial) as RuntimeOperatorState,
  calls: new Map<string, any>(saved?.calls ?? []), requests: [] as Array<{ path: string; method: string; body: any }>,
  api404: query.has("api404"), offline: false, holdPreparation: false, releasePreparation: null as (() => void) | null,
  holdStatus: false, releaseStatus: null as (() => void) | null,
  losePreparationResponse: false, finishWrites: saved?.finishWrites ?? 0, receipts: new Map<string, any>(saved?.receipts ?? []), lastScheduleId: null as number | null,
  deferFinish: false, finished: saved?.finished ?? false,
  verifyFinishes() { for(const [id]of fixture.receipts)fixture.receipts.set(id,{operationId:id,outcome:"COMMITTED",status:"verified",retryAllowed:false});fixture.operator.activeCallId=null;fixture.finished=true;fixture.finishAttendance();persist(); },
  finishAttendance() { if (fixture.operator.state === "pending") { fixture.operator = { ...fixture.operator, state: "paused", version: fixture.operator.version + 1, startedAt: new Date().toISOString() }; persist(); } },
};
(window as any).productionFixture = fixture;
function persist() { sessionStorage.setItem("production-pause-fixture", JSON.stringify({ operator: fixture.operator, calls: [...fixture.calls],receipts:[...fixture.receipts],finishWrites:fixture.finishWrites,finished:fixture.finished })); }
const json = (data: unknown) => new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json" } });
const refused = (code: string) => new Response(JSON.stringify({ code, message: code, outcome: "NOT_COMMITTED" }), { status: 409, headers: { "Content-Type": "application/json" } });
const originalFetch = window.fetch.bind(window);
window.fetch = async (raw, init) => {
  const path = new URL(String(raw), location.href).pathname, method = init?.method || "GET";
  if (!path.startsWith("/api/customers/")) return originalFetch(raw, init);
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  fixture.requests.push({ path, method, body });
  if (fixture.offline) throw new TypeError("fixture offline");
  if (fixture.api404) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/html" } });
  if (path === "/api/customers/telephony/operator-state") {
    if(fixture.holdStatus)await new Promise<void>(resolve=>{fixture.releaseStatus=()=>{fixture.holdStatus=false;resolve();};});
    return json({ ...fixture.operator, serverNow: new Date().toISOString() });
  }
  if (path.endsWith("/operator-state/actions")) {
    if (body.expectedVersion !== fixture.operator.version) return refused("VERSION_CONFLICT");
    const next = { ...fixture.operator, version: fixture.operator.version + 1 };
    if (body.kind === "now") {
      if (next.activeCallId) return refused("CALL_ACTIVE");
      Object.assign(next, { state: "paused", reasonId: body.reasonId, reason: "Café", startedAt: new Date().toISOString(), maxSeconds: 60 });
    } else if (body.kind === "after_attendance") Object.assign(next, { state: "pending", reasonId: body.reasonId, reason: "Café", pendingScheduleId: fixture.lastScheduleId });
    else if (["resume", "cancel_pending"].includes(body.kind)) Object.assign(next, { state: "available", reasonId: null, reason: null, startedAt: null, pendingScheduleId: null });
    else if (body.kind === "release_lost") Object.assign(next, { activeCallId: null });
    fixture.operator = next; persist(); return json(next);
  }
  if (path.endsWith("/telephony/calls") && method === "POST") {
    if (body.direction === "outgoing" && fixture.operator.state !== "available" && !(fixture.operator.state === "pending" && body.scheduleId === fixture.operator.pendingScheduleId)) return refused("OPERATOR_UNAVAILABLE");
    if (body.direction === "outgoing" && fixture.operator.activeCallId && fixture.operator.activeCallId !== body.callId) return refused("CALL_ACTIVE");
    if (fixture.holdPreparation) await new Promise<void>(resolve => { fixture.releasePreparation = resolve; });
    const row = fixture.calls.get(body.callId) ?? { ...body, preparedAt: new Date().toISOString(), sentAt: null, answeredAt: null, endedAt: null, state: "prepared" };
    fixture.calls.set(body.callId, row);
    if (body.direction === "outgoing") { fixture.operator.activeCallId = body.callId; fixture.lastScheduleId = body.scheduleId ?? null; }
    persist();
    if (fixture.losePreparationResponse) throw new TypeError("fixture response lost");
    return json({ callId: body.callId });
  }
  if (path.endsWith("/events")) {
    const call = fixture.calls.get(body.callId);
    if (!call) return refused("CALL_UNAVAILABLE");
    call.state = body.type;
    if (body.type === "sent") call.sentAt = body.occurredAt;
    if (body.type === "answered") { call.answeredAt = body.occurredAt; fixture.operator.activeCallId = body.callId; fixture.operator.version++; }
    if (["ended", "failed", "rejected"].includes(body.type)) {
      call.endedAt = body.occurredAt;
      if (fixture.operator.activeCallId === body.callId) { fixture.operator.activeCallId = null; fixture.operator.version++; }
    }
    persist(); return json({ received: true });
  }
  if (/\/telephony\/calls\/[^/]+$/.test(path)) return json({ calls: [...fixture.calls.values()].filter(call => path.endsWith("/" + call.callId)) });
  if (path.endsWith("/telephony/session")) return json({ observed: true });
  if (path.endsWith("/call/start")) {
    const callId = body.callId || crypto.randomUUID();
    fixture.lastScheduleId = Number(path.split("/").at(-3));
    const call = { callId, state: "dialing", direction: "outgoing", startedAt: new Date().toISOString(), sentAt: null, answeredAt: null, endedAt: null, dialedPhone: body.dialedPhone };
    fixture.calls.set(callId, call); fixture.operator.activeCallId = callId; persist(); return json(call);
  }
  if (path.endsWith("/call/end")) return json({ received: true });
  if (path.endsWith("/finish") && method === "PATCH") {
    fixture.finishWrites++; fixture.receipts.set(body.operationId, { operationId: body.operationId, outcome: fixture.deferFinish?"UNKNOWN":"COMMITTED", status: fixture.deferFinish?"pending_verification":"verified", retryAllowed: false });persist();
    if(fixture.deferFinish)throw new TypeError("fixture finish response lost");
    fixture.finishAttendance(); return json({ outcome: "COMMITTED" });
  }
  if (path.includes("/finish-attempts/")) return json(fixture.receipts.get(path.split("/").at(-1)!) ?? { outcome: "UNKNOWN", status: "not_found", retryAllowed: false });
  return json({});
};
