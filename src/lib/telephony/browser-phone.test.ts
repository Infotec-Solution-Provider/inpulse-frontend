import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UA } from "jssip";
import { BrowserPhone } from "./browser-phone";
import { initialPhoneState, normalizeDialTarget, type PhoneState, type WebrtcConfig } from "./types";

const config: WebrtcConfig = { websocketUrl: "wss://pbx.example.test/ws", domain: "pbx.example.test", uri: "sip:101@pbx.example.test", extension: "101", authorizationUser: "101", password: "test-only", iceServers: [] };
function stream() {
  const track = { id: "audio-1", kind: "audio", stop: vi.fn() };
  const tracks = [track];
  return { track, value: { getTracks: () => tracks, addTrack: (item: typeof track) => tracks.push(item) } as unknown as MediaStream };
}
class Session extends EventEmitter {
  direction = "outgoing";
  remote_identity = { uri: { user: "102" } };
  connection = Object.assign(new EventTarget(), { getReceivers: () => [], connectionState: "new" });
  isEnded = vi.fn(() => false);
  terminate = vi.fn(); answer = vi.fn(); mute = vi.fn(); unmute = vi.fn(); sendDTMF = vi.fn();
}
class Agent extends EventEmitter {
  registered = true;
  start = vi.fn(); stop = vi.fn(); isRegistered = () => this.registered;
  session = new Session();
  call = vi.fn(() => { this.emit("newRTCSession", { originator: "local", session: this.session }); return this.session; });
}
const phones: BrowserPhone[] = [];
afterEach(() => { phones.splice(0).forEach(phone => phone.disconnect()); vi.useRealTimers(); });
function setup() {
  const agent = new Agent(); const microphone = stream();
  let state: PhoneState = { ...initialPhoneState };
  const deps = {
    createAgent: () => agent as unknown as UA,
    getMicrophone: vi.fn(async () => microphone.value), createStream: () => stream().value,
    onState: (next: PhoneState) => { state = next; }, onAudio: vi.fn(),
    prepareSchedule: vi.fn(async (scheduleId: number, _phone: string) => ({ scheduleId, callId: "crm-1" })),
    reportSchedule: vi.fn(),
  };
  const phone = new BrowserPhone(deps); phones.push(phone); phone.connect(config); agent.emit("registered");
  return { phone, agent, microphone, deps, state: () => state };
}
describe("BrowserPhone", () => {
  it("only calls after microphone permission and updates from SIP events", async () => {
    const { phone, agent, deps, state } = setup();
    await phone.dial("(11) 99999-9999", 42);
    expect(deps.prepareSchedule).toHaveBeenCalledWith(42, "11999999999");
    expect(agent.call).toHaveBeenCalledWith("sip:11999999999@pbx.example.test", expect.objectContaining({ mediaConstraints: { audio: true, video: false } }));
    expect(state().phase).toBe("dialing");
    agent.session.emit("progress"); expect(state().phase).toBe("ringing");
    agent.session.emit("confirmed"); expect(state().phase).toBe("active");
    expect(deps.reportSchedule).toHaveBeenCalledWith({ scheduleId: 42, callId: "crm-1" }, "answered");
    agent.session.emit("ended"); expect(state().phase).toBe("ended");
  });
  it("does not dial or change CRM when microphone permission is denied", async () => {
    const { phone, agent, deps, state } = setup();
    deps.getMicrophone.mockRejectedValue(Object.assign(new Error("denied"), { name: "NotAllowedError" }));
    await expect(phone.dial("102", 42)).rejects.toThrow("microfone");
    expect(agent.call).not.toHaveBeenCalled(); expect(deps.prepareSchedule).not.toHaveBeenCalled();
    expect(state().phase).toBe("failed");
  });
  it("cancels pending permission and stops a stream returned after cancellation", async () => {
    const { phone, agent, deps, microphone } = setup();
    let resolve!: (stream: MediaStream) => void;
    deps.getMicrophone.mockReturnValue(new Promise(done => { resolve = done; }));
    const pending = phone.dial("102"); phone.hangup(); resolve(microphone.value); await pending;
    expect(agent.call).not.toHaveBeenCalled(); expect(microphone.track.stop).toHaveBeenCalled();
  });
  it("never dials when CRM preparation fails and releases the microphone", async () => {
    const { phone, agent, deps, microphone } = setup();
    deps.prepareSchedule.mockRejectedValue(new Error("synthetic HTTP failure"));
    await expect(phone.dial("102", 42)).rejects.toThrow("Nenhuma chamada foi enviada");
    expect(agent.call).not.toHaveBeenCalled(); expect(microphone.track.stop).toHaveBeenCalled();
  });
  it("cancels CRM preparation without placing a call and closes the prepared record", async () => {
    const { phone, agent, deps } = setup();
    let resolve!: (call: { scheduleId: number; callId: string }) => void;
    deps.prepareSchedule.mockReturnValue(new Promise(done => { resolve = done; }));
    const pending = phone.dial("102", 42); await Promise.resolve(); phone.hangup();
    resolve({ scheduleId: 42, callId: "crm-1" }); await pending;
    expect(agent.call).not.toHaveBeenCalled(); expect(deps.reportSchedule).toHaveBeenCalledWith({ scheduleId: 42, callId: "crm-1" }, "failed");
  });
  it("blocks concurrent calls, rejects incoming while busy, and never retries failed calls", async () => {
    const { phone, agent, state } = setup();
    await phone.dial("102"); await expect(phone.dial("103")).rejects.toThrow("andamento");
    const other = new Session(); agent.emit("newRTCSession", { originator: "remote", session: other });
    expect(other.terminate).toHaveBeenCalledWith({ status_code: 486 });
    agent.session.emit("failed"); agent.emit("registered");
    expect(state().phase).toBe("failed"); expect(agent.call).toHaveBeenCalledTimes(1);
  });
  it("releases media and ignores late events from ended calls", async () => {
    const { phone, agent, microphone, deps, state } = setup();
    await phone.dial("102", 42); phone.hangup();
    expect(microphone.track.stop).toHaveBeenCalled(); expect(deps.onAudio).toHaveBeenLastCalledWith(null);
    expect(agent.session.terminate).toHaveBeenCalledTimes(1);
    agent.session.emit("confirmed"); expect(state().phase).toBe("ended");
    expect(deps.reportSchedule).toHaveBeenCalledTimes(1);
  });
  it("answers incoming calls with audio only and supports mute and DTMF", async () => {
    const { phone, agent, state } = setup(); const incoming = new Session(); incoming.direction = "incoming";
    agent.emit("newRTCSession", { originator: "remote", session: incoming });
    expect(state().phase).toBe("incoming"); await phone.answer();
    expect(incoming.answer).toHaveBeenCalledWith(expect.objectContaining({ mediaConstraints: { audio: true, video: false } }));
    incoming.emit("confirmed"); phone.toggleMute(); expect(incoming.mute).toHaveBeenCalledWith({ audio: true });
    phone.toggleMute(); expect(incoming.unmute).toHaveBeenCalled();
    phone.sendTone("#"); expect(incoming.sendDTMF).toHaveBeenCalledWith("#");
  });
  it("attaches received audio to the output", async () => {
    const { phone, agent, deps } = setup(); await phone.dial("102");
    const event = Object.assign(new Event("track"), { track: { id: "remote-1", kind: "audio" } });
    agent.session.connection.dispatchEvent(event); expect(deps.onAudio).toHaveBeenCalledWith(expect.anything());
  });
  it("does not dial after a registration loss during microphone preparation", async () => {
    const { phone, agent, deps, microphone } = setup();
    deps.getMicrophone.mockImplementation(async () => { agent.registered = false; return microphone.value; });
    await expect(phone.dial("102")).rejects.toThrow(); expect(agent.call).not.toHaveBeenCalled();
    expect(microphone.track.stop).toHaveBeenCalled();
  });
  it("stops the agent and releases the microphone on disconnect", async () => {
    const { phone, agent, microphone, state } = setup(); await phone.dial("102"); phone.disconnect();
    expect(agent.stop).toHaveBeenCalled(); expect(microphone.track.stop).toHaveBeenCalled(); expect(state().connection).toBe("disconnected");
  });
  it("reports registration timeout without redialing", () => {
    vi.useFakeTimers(); const { phone, agent, state } = setup(); agent.registered = false; phone.connect(config);
    vi.advanceTimersByTime(20_001); expect(state().connection).toBe("error"); expect(agent.call).not.toHaveBeenCalled();
  });
  it("rejects SIP URI/header injection and accepts phone formatting", () => {
    expect(() => normalizeDialTarget("sip:attacker@outside.test")).toThrow();
    expect(() => normalizeDialTarget("101\r\nVia:bad")).toThrow();
    expect(normalizeDialTarget("+55 (11) 99999-9999")).toBe("+5511999999999");
  });
});
