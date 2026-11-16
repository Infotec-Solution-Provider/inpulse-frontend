import { useSyncExternalStore } from "react";
type WebrtcSettingsDTO = Record<string, any>;
type Listener = (...args: any[]) => void; // Test transport mimics the event emitter used by JsSIP.
class Emitter {
  listeners = new Map<string, Listener[]>();
  on(name: string, callback: Listener) { this.listeners.set(name, [...(this.listeners.get(name) || []), callback]); }
  emit(name: string, data?: unknown) { for (const callback of this.listeners.get(name) || []) callback(data); }
}
let authenticated = true;
const authListeners = new Set<() => void>();
export const harness = {
  // Shape saved before the gateway existed (no mode/pbxAddress), so the form's normalization is exercised.
  settings: { enabled: false, websocketUrl: "", domain: "", iceServers: [] } as unknown as WebrtcSettingsDTO,
  settingsSaveCount: 0, webrtcReads: 0, uaStarts: 0, answers: 0, agent: null as UA | null,
  incoming() { const session = new Session(); session.direction = "incoming"; harness.session = session; harness.agent?.emit("newRTCSession", {originator:"remote",session,request:{getHeader:()=>"incoming-fixture-call-id"}}); },
  settingsLoadError: new URLSearchParams(location.search).has("settings-load-error"),
  settingsSaveError: false,
  gatewayAvailable: new URLSearchParams(location.search).has("gateway"),
  calls: [] as string[], reports: [] as string[], session: null as Session | null, media: null as MediaStream | null,
  logout() { authenticated = false; authListeners.forEach(callback => callback()); },
};
export function useAuthContext() {
  const active = useSyncExternalStore(callback => { authListeners.add(callback); return () => { authListeners.delete(callback); }; }, () => authenticated);
  return { token: active ? "test-token" : null, instance: "tenant-a", user: { CODIGO: 7 } };
}
export const useWhatsappContext = () => ({ parameters: { feature_telephony_dialer_enabled: "true" } });
export const usersService = {
  setAuth() {},
  async getWebrtcSettings() {
    if (harness.settingsLoadError) throw new Error("test read failure");
    return { ...structuredClone(harness.settings), gatewayAvailable: harness.gatewayAvailable };
  },
  async saveWebrtcSettings(settings: WebrtcSettingsDTO) {
    harness.settingsSaveCount++;
    if (harness.settingsSaveError) throw new Error("test ambiguous write failure");
    harness.settings = structuredClone(settings);
    return { ...structuredClone(settings), gatewayAvailable: harness.gatewayAvailable };
  },
  async getWebrtcConfig() { harness.webrtcReads++; return { websocketUrl: "wss://pbx.example.test/ws", domain: "pbx.example.test", extension: "101", uri: "sip:101@pbx.example.test", authorizationUser: "101", password: "test-only", iceServers: [] }; },
};
export const customersService = { setAuth() {},
  async getTelephonySchedules(){const f=(window as any).productionFixture;return{data:f.finished||f.operator.state==="paused"?[]:[{CODIGO:42,CLIENTE:1,CLIENTE_RAZAO:"Synthetic customer",CLIENTE_FANTASIA:"Synthetic customer",FONE1:"101",DT_AGENDAMENTO:"2026-11-16T12:00:00Z",CAMPANHA_NOME:"Fixture campaign",CONCLUIDO:"NAO"}]};}, async startTelephonyScheduleCall() { return { callId: "test-crm-id" }; }, async reportTelephonyCall(_id: number, _call: string, state: string) { harness.reports.push(state); } };
class Session extends Emitter {
  direction = "outgoing"; remote_identity = { uri: { user: "102" } }; ended = false;
  connection = Object.assign(new EventTarget(), { getReceivers: () => [], connectionState: "new" });
  isEnded() { return this.ended; }
  terminate() { this.ended = true; this.emit("ended"); }
  mute() { harness.media?.getAudioTracks().forEach(track => { track.enabled = false; }); }
  unmute() { harness.media?.getAudioTracks().forEach(track => { track.enabled = true; }); }
  sendDTMF() {} answer() { harness.answers++; this.emit("confirmed"); }
}
export class UA extends Emitter {
  registered = false;
  start() { harness.uaStarts++; harness.agent = this; this.registered = true; this.emit("registered"); }
  stop() { this.registered = false; }
  isRegistered() { return this.registered; }
  call(target: string, options: { mediaStream: MediaStream }) {
    harness.calls.push(target); harness.media = options.mediaStream;
    harness.session = new Session(); this.emit("newRTCSession", { originator: "local", session: harness.session });
    return harness.session;
  }
}
export class WebSocketInterface {}
export const debug = { disable() {} };

(window as any).phoneHarness = harness;
