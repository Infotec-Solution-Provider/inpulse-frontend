import { useSyncExternalStore } from "react";
import type { WebrtcSettingsDTO } from "../../src/lib/services/users.service";
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
  settingsSaveCount: 0,
  settingsLoadError: new URLSearchParams(location.search).has("settings-load-error"),
  settingsSaveError: false,
  gatewayAvailable: new URLSearchParams(location.search).has("gateway"),
  runtimeEnabled: new URLSearchParams(location.search).has("runtime"),
  runtimeState: {state:"available",version:1,activeCallId:null as string|null,reasonId:null as number|null,startedAt:null as string|null},
  runtimeCalls: [] as Array<Record<string,any>>, runtimeEvents: [] as Record<string,unknown>[], transfers: [] as string[],
  calls: [] as string[], reports: [] as string[], session: null as Session | null, media: null as MediaStream | null,
  logout() { authenticated = false; authListeners.forEach(callback => callback()); },
};
export function useAuthContext() {
  const active = useSyncExternalStore(callback => { authListeners.add(callback); return () => { authListeners.delete(callback); }; }, () => authenticated);
  return { token: active ? "test-token" : null, instance: "tenant-a", user: { CODIGO: 7, NIVEL: "ADMIN" } };
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
  async getTelephonyTransferOptions(){return [{key:"operator:8",name:"Ana",extension:"102",source:"operator"},{key:"directory:1",name:"Recepção",extension:"0200",source:"directory"}];},
  async getWebrtcConfig() { return { allowAutoAnswer: harness.runtimeEnabled, websocketUrl: "wss://pbx.example.test/ws", domain: "pbx.example.test", extension: "101", uri: "sip:101@pbx.example.test", authorizationUser: "101", password: "test-only", iceServers: [] }; },
};
export const customersService = { setAuth() {}, async startTelephonyScheduleCall() { return { callId: "test-crm-id" }; }, async reportTelephonyCall(_id: number, _call: string, state: string) { harness.reports.push(state); } };
class Session extends Emitter {
  direction = "outgoing"; remote_identity = { uri: { user: "102" } }; ended = false;
  connection = Object.assign(new EventTarget(), { getReceivers: () => [], connectionState: "new" });
  isEnded() { return this.ended; }
  terminate() { this.ended = true; this.emit("ended"); }
  mute() { harness.media?.getAudioTracks().forEach(track => { track.enabled = false; }); }
  unmute() { harness.media?.getAudioTracks().forEach(track => { track.enabled = true; }); }
  refer(target:string,options:{eventHandlers:Record<string,()=>void>}){harness.transfers.push(target);setTimeout(()=>options.eventHandlers.accepted(),25);}
  sendDTMF() {} answer() { this.emit("confirmed"); }
}
export class UA extends Emitter {
  registered = false;
  start() { this.registered = true; this.emit("registered"); }
  stop() { this.registered = false; }
  isRegistered() { return this.registered; }
  call(target: string, options: { mediaStream: MediaStream }) {
    harness.calls.push(target); harness.media = options.mediaStream;
    harness.session = new Session(); this.emit("newRTCSession", { originator: "local", session: harness.session });
    harness.session.emit("sending");
    return harness.session;
  }
}
export class WebSocketInterface {}
export const debug = { disable() {} };
declare global { interface Window { phoneHarness: typeof harness } }
window.phoneHarness = harness;

// In-process HTTP double: exercise the actual durable runtime client without a CRM or SIP server.
const originalFetch=window.fetch.bind(window);
window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
 const target=typeof input==="string"?input:input instanceof URL?input.href:input.url;
 if(!target.startsWith("http://runtime.fixture"))return originalFetch(input,init);
 const path=new URL(target).pathname.replace(/^\/api/,""),method=init?.method||"GET",body=init?.body?JSON.parse(String(init.body)):{};
 const reply=(data:unknown)=>new Response(JSON.stringify({data}),{status:200,headers:{"Content-Type":"application/json"}});
 const status=()=>({enabled:harness.runtimeEnabled,...harness.runtimeState,allowChangeReason:true,reasons:[{id:1,name:"Café",maxSeconds:60,productive:"NAO"},{id:2,name:"Reunião",maxSeconds:0,productive:"SIM"}],serverNow:new Date().toISOString(),pbx:{status:"unknown"}});
 if(path==="/telephony/operator-state")return reply(status());
 if(path==="/telephony/operator-state/actions"){
  if(body.kind==="now"){Object.assign(harness.runtimeState,{state:"paused",reasonId:body.reasonId,startedAt:new Date().toISOString()});}
  else if(body.kind==="after_attendance")harness.runtimeState.state="pending";
  else if(body.kind==="resume"||body.kind==="cancel_pending")harness.runtimeState.state="available";
  else if(body.kind==="change_reason")harness.runtimeState.reasonId=body.reasonId;
  harness.runtimeState.version++;return reply(status());
 }
 if(path==="/telephony/session")return reply({observed:true});
 if(path==="/telephony/metrics")return reply({serverNow:new Date().toISOString(),crmDay:"2026-11-13",conversationSeconds:125,attempts:harness.runtimeCalls.length,pauseSeconds:60,productivePauseSeconds:0,connectedSeconds:7200,contacts:3,closedOrders:1,closedOrderValue:"125.50",productivityPercent:12,quotesToClose:2,scheduledCustomers:4,overdueSchedules:1,expectedSeconds:180,expectedSource:"campaign",minimumConversationSeconds:10,incompleteCalls:0,visibility:{orders:true,productivity:true},availability:{}});
 if(path==="/telephony/calls"&&method==="POST"){
  if(!harness.runtimeCalls.some(call=>call.callId===body.callId))harness.runtimeCalls.push({...body,operatorId:7,state:"prepared",preparedAt:new Date().toISOString(),sentAt:null,answeredAt:null,endedAt:null,rating:null,comment:"",reviewVersion:0,cursor:"1"});
  harness.runtimeState.activeCallId=body.callId;return reply({callId:body.callId});
 }
 if(path.endsWith("/events")){
  harness.runtimeEvents.push(body);const call=harness.runtimeCalls.find(call=>call.callId===body.callId);
  if(call){call.state=body.type;if(body.type==="sent")call.sentAt=body.occurredAt;if(body.type==="answered")call.answeredAt=body.occurredAt;if(["ended","failed","transferred","rejected"].includes(body.type)){call.endedAt=body.occurredAt;harness.runtimeState.activeCallId=null;}}
  return reply({applied:true});
 }
 if(path.endsWith("/quality")){const call=harness.runtimeCalls.find(call=>path.includes(call.callId));if(call){call.rating=body.rating;call.comment=body.comment;call.reviewVersion++;}return reply({version:call?.reviewVersion||1});}
 if(path==="/telephony/calls")return reply({calls:harness.runtimeCalls});
 if(path.startsWith("/telephony/calls/"))return reply({calls:harness.runtimeCalls.filter(call=>path.endsWith(call.callId))});
 if(path.endsWith("/call/start"))return reply({callId:"test-crm-id"});
 if(path.endsWith("/call/end")){harness.reports.push(body.state);return reply({});}
 return reply({});
};
