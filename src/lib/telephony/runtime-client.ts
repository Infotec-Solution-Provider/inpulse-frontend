import type { CallPreparation, CallReport } from "./browser-phone";
import type { OperatorDashboardMetrics } from "./operator-dashboard";

export interface OperatorPauseChannelCapability {
  supported: boolean;
  /** The channel guard is active, independently of the current operator state. */
  enforced: boolean;
  reason?: string | null;
}
export interface RuntimeOperatorState {
  enabled:boolean; state:"available"|"pending"|"paused"; version:number; activeCallId?:string|null;
  reasonId?:number|null; reason?:string|null; pauseId?:number|null; startedAt?:string|null; maxSeconds?:number;
  allowChangeReason?:boolean;pendingScheduleId?:number|null;
  /** Local incoming resume is durable but has not yet been confirmed by the server. */
  pendingSync?:boolean;
  scope?:"telephony"|"all_channels";
  requestedScope?:"telephony"|"all_channels";
  scopeReady?:boolean;
  policyRevision?:string|null;
  afterAttendanceScope?:"telephony_schedule";
  channels?:{telephony:OperatorPauseChannelCapability;whatsapp:OperatorPauseChannelCapability};
  reasons:Array<{id:number;name:string;maxSeconds:number;productive:string}>;
  pbx?:{status:string;detail?:string|null}; serverNow:string;
}
export interface RuntimeCall {callId:string;operatorId:number;direction:string;number:string;state:string;scheduleId:number|null;preparedAt:string;sentAt:string|null;answeredAt:string|null;endedAt:string|null;rating:"RUIM"|"MÉDIA"|"BOA"|null;comment:string;reviewVersion:number;cursor:string}

function pausePolicyFingerprint(snapshot:RuntimeOperatorState){
  return JSON.stringify([snapshot.enabled,snapshot.scope,snapshot.requestedScope,snapshot.scopeReady,snapshot.policyRevision,
    snapshot.channels?.telephony.supported,snapshot.channels?.telephony.enforced,
    snapshot.channels?.whatsapp.supported,snapshot.channels?.whatsapp.enforced]);
}
type Pending = {id:string;identity:string;kind:"prepare"|"event"|"pause"|"probe"|"review";payload:Record<string,unknown>;order:number;blocked?:{code:string;message:string}};
const url=(process.env.NEXT_PUBLIC_CUSTOMERS_URL||"http://localhost:8002").replace(/\/$/,"");
let order=0;
function openOutbox():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
  const request=indexedDB.open("inpulse-telephony-outbox",1);
  request.onupgradeneeded=()=>request.result.createObjectStore("operations",{keyPath:"id"});
  request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(new Error("Não foi possível abrir o registro local da telefonia."));
});}
async function write(entry:Pending){const db=await openOutbox();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction("operations","readwrite");tx.objectStore("operations").put(entry);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
async function pending(identity:string):Promise<Pending[]>{const db=await openOutbox();try{return await new Promise((resolve,reject)=>{const tx=db.transaction("operations","readonly"),r=tx.objectStore("operations").getAll();r.onsuccess=()=>resolve((r.result as Pending[]).filter(x=>x.identity===identity).sort((a,b)=>a.order-b.order));r.onerror=()=>reject(r.error);});}finally{db.close();}}
async function remove(id:string){const db=await openOutbox();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction("operations","readwrite");tx.objectStore("operations").delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}}

export function createTelephonyRuntimeClient(options:{identity:string;getToken:()=>string|null;onSyncError?:(message:string|null)=>void;onOperatorState?:(state:RuntimeOperatorState)=>void}) {
  const instance=options.identity.split(":")[0];
  let disposed=false,listening=false,revision=0,state:RuntimeOperatorState|null=null,flushing:Promise<void>|null=null;
  let enqueueChain=Promise.resolve();
  let localWriteFailure:Error|null=null,stateRequest=0,policyEpoch=0;
  const legacyUntracked=new Set<string>();
  const legacy=new Map<string,{scheduleId:number;callId:string}>();
  const unconfirmed=new Set<string>();
  async function request<T>(path:string,method="GET",body?:unknown):Promise<T>{
    const token=options.getToken();if(!token)throw new Error("Entre novamente para sincronizar a telefonia.");
    const response=await fetch(`${url}/api${path}`,{method,cache:"no-store",headers:{Authorization:/^Bearer\s/i.test(token)?token:`Bearer ${token}`,"Content-Type":"application/json","x-crm-instance":instance},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await response.json();if(!response.ok){const error=Object.assign(new Error(result.message||"Não foi possível confirmar a operação telefônica."),{code:result.code,status:response.status,outcome:result.outcome});throw error;}return result.data as T;
  }
  function publishState(next:RuntimeOperatorState){
    const policyChanged=!state||pausePolicyFingerprint(next)!==pausePolicyFingerprint(state);
    if(state?.enabled&&next.enabled){
      if(next.version<state.version)return state;
      // The same server version predates the durable incoming resume.
      if(state.pendingSync&&next.version===state.version){
        if(!policyChanged)return state;
        // Policy changes do not advance the operator version. Preserve the local
        // resume, but never retain a channel guarantee withdrawn by the server.
        next={...state,scope:next.scope,requestedScope:next.requestedScope,scopeReady:next.scopeReady,
          policyRevision:next.policyRevision,afterAttendanceScope:next.afterAttendanceScope,channels:next.channels};
      }
    }
    // OFF snapshots reset the version domain; a subsequent ON snapshot is valid.
    if(!next.enabled||policyChanged)policyEpoch++;
    state=next;if(!disposed)options.onOperatorState?.(next);return next;
  }
  async function refreshState(){const currentRequest=++stateRequest;const next=await request<RuntimeOperatorState>("/telephony/operator-state");if(currentRequest===stateRequest)return publishState(next);return state??next;}
  async function flush(){
    if(flushing)return flushing;
    flushing=(async()=>{
      const current=await refreshState();
      if(!current.enabled){if((await pending(options.identity)).length&&!disposed)options.onSyncError?.("A sincronização está suspensa para esta empresa. Os registros locais foram preservados.");return;}
      let retained=false;
      do {
        const observedRevision=revision;
        await enqueueChain;
        const blockedCalls=new Set<string>();
        retained=false;
        for(const entry of await pending(options.identity)){
          if(disposed)return;
          const callId=String(entry.payload.callId||"");
          if(entry.kind==="probe"||entry.kind==="review"){if(entry.kind==="probe"&&callId)blockedCalls.add(callId);retained=true;continue;}
          if(entry.blocked||blockedCalls.has(callId)){if(callId)blockedCalls.add(callId);retained=true;continue;}
          try {
            if(entry.kind==="prepare")await request("/telephony/calls","POST",entry.payload);
            else if(entry.kind==="event")await request(`/telephony/calls/${encodeURIComponent(callId)}/events`,"POST",entry.payload);
            else await request("/telephony/operator-state/actions","POST",entry.payload);
            await remove(entry.id);
          } catch(error) {
            const failure=error as Error&{status?:number;code?:string;outcome?:string};
            if(failure.status&&failure.status>=400&&failure.status<500&&failure.outcome!=="UNKNOWN"){
              await write({...entry,blocked:{code:failure.code||"REJECTED",message:failure.message}});
              if(callId)blockedCalls.add(callId);retained=true;continue;
            }
            throw error;
          }
        }
        await enqueueChain;
        await refreshState();
        await enqueueChain;
        if(revision===observedRevision)break;
      }while(!disposed);
      if(!disposed)options.onSyncError?.(retained?"Há registros telefônicos pendentes de conferência. A ligação não será repetida.":null);
    })().catch(error=>{if(!disposed)options.onSyncError?.("Registro telefônico pendente de sincronização. A ligação não será repetida.");throw error;}).finally(()=>{flushing=null;});
    return flushing;
  }
  function enqueue(kind:Pending["kind"],payload:Record<string,unknown>,id:string){
    // Serial IndexedDB commits preserve prepare -> resume -> events even on network failure.
    const work=enqueueChain.then(()=>write({id:`${options.identity}:${id}`,identity:options.identity,kind,payload,order:order=Math.max(order+1,Date.now()*1000)}).then(()=>{revision++;}));
    enqueueChain=work.catch(()=>{localWriteFailure=new Error("O registro local da telefonia falhou. Confira o histórico antes de finalizar.");if(!disposed)options.onSyncError?.("Não foi possível guardar o registro local. A chamada recebida pode ser atendida, mas seu histórico precisa ser conferido.");});
    return work;
  }
  async function prepareCall(input:CallPreparation){
    if(input.direction==="incoming"){
      if(state?.enabled===false){legacyUntracked.add(input.callId);return;}
      await enqueue("prepare",input as unknown as Record<string,unknown>,input.callId);void flush().catch(()=>{});return;
    }
    if((await pendingPreparations()).length)throw new Error("Há uma preparação sem confirmação. Confira o registro pendente antes de ligar novamente.");
    const current=await refreshState();
    if(!current.enabled){
      if(input.scheduleId){try{const prepared=await request<{callId:string}>(`/customers/schedules/telephony/${input.scheduleId}/call/start`,"POST",{dialedPhone:input.number});legacy.set(input.callId,{scheduleId:input.scheduleId,callId:prepared.callId});}catch(error){unconfirmed.add(input.callId);throw error;}}
      if(!input.scheduleId)legacyUntracked.add(input.callId);
      return;
    }
    if(current.state!=="available"&&!(current.state==="pending"&&input.scheduleId&&current.pendingScheduleId===input.scheduleId))throw new Error("Retome a operação antes de iniciar outra ligação.");
    // A durable probe survives reload, but is NEVER replayed as a new outgoing preparation.
    await enqueue("probe",input as unknown as Record<string,unknown>,input.callId);
    unconfirmed.add(input.callId);
    try { await request("/telephony/calls","POST",input);await remove(`${options.identity}:${input.callId}`);unconfirmed.delete(input.callId); }
    catch(error) {
      if((error as {outcome?:string}).outcome==="NOT_COMMITTED")await remove(`${options.identity}:${input.callId}`);
      if(!disposed)options.onSyncError?.("O preparo da ligação não foi confirmado. Confira a preparação pendente antes de ligar novamente.");
      void refreshState().catch(()=>{});throw error;
    }
  }
  function reportCall(event:CallReport){
    if(unconfirmed.has(event.callId)||legacyUntracked.has(event.callId))return;
    const old=legacy.get(event.callId);
    if(old){if(["answered","ended","failed","rejected","transferred"].includes(event.type)){
      const state=event.type==="answered"?"answered":event.type==="failed"||event.type==="rejected"?"failed":"ended";
      enqueueChain=enqueueChain.then(()=>request(`/customers/schedules/telephony/${old.scheduleId}/call/end`,"PATCH",{callId:old.callId,state})).then(()=>undefined);void enqueueChain.catch(()=>{if(!disposed)options.onSyncError?.("A atualização do atendimento não foi confirmada. Confira o histórico antes de finalizar.");});
    }return;}
    if(state?.enabled===false)return;
    void enqueue("event",event as unknown as Record<string,unknown>,event.eventId).then(()=>flush()).catch(()=>{});
  }
  async function commandPause(kind:string,reasonId?:number,offlineIncoming=false){
    const current=offlineIncoming&&state?state:await refreshState();
    const payload={operationId:crypto.randomUUID(),kind,expectedVersion:current.version,...(reasonId?{reasonId}:{}),...(kind==="release_lost"?{confirmNoCall:true}:{}),...(offlineIncoming?{occurredAt:new Date().toISOString()}: {})};
    if(offlineIncoming){
      await enqueue("pause",payload,payload.operationId);
      // Local pending resume permits the incoming call, while further outgoing remains server-gated.
      stateRequest++;const optimistic=publishState({...current,state:"available",pendingSync:true});void flush().catch(()=>{});return optimistic;
    }
    try {
      const actionPolicyEpoch=policyEpoch;
      const result=await request<RuntimeOperatorState>("/telephony/operator-state/actions","POST",payload);
      // A policy/capability change observed during the request supersedes its
      // delayed acknowledgement, even when the runtime remains enabled. Keep the
      // known snapshot and any newer GET in flight; the next poll reconciles state.
      if(result.enabled&&actionPolicyEpoch!==policyEpoch&&state)return state;
      // A GET started before this acknowledgement may contain the previous version.
      // Invalidate it, while allowing a later policy-disabled snapshot (version zero).
      stateRequest++;return publishState(result);
    } catch(error) {
      // A competing tab or an uncertain response can have changed the server state.
      await refreshState().catch(()=>{});throw error;
    }
  }
  async function pendingPreparations(){await enqueueChain;return(await pending(options.identity)).filter(entry=>entry.kind==="probe").map(entry=>({callId:String(entry.payload.callId),number:String(entry.payload.number),scheduleId:entry.payload.scheduleId as number|undefined}));}
  async function getCall(callId:string){return(await request<{calls:RuntimeCall[]}>(`/telephony/calls/${encodeURIComponent(callId)}`)).calls[0];}
  async function confirmUnsentPreparation(callId:string){
    await enqueueChain;
    const entry=(await pending(options.identity)).find(item=>item.kind==="probe"&&item.payload.callId===callId);if(!entry)return;
    if(!(await refreshState()).enabled)throw new Error("Reative a sincronização para conferir esta preparação.");
    const call=await getCall(callId);
    if(call?.sentAt||call?.answeredAt)throw new Error("Há evidência de ligação enviada ou atendida. Confira o histórico antes de liberar.");
    if(call&&!call.endedAt&&call.state!=="observation_lost"){
      const event={callId,eventId:crypto.randomUUID(),type:"failed",detail:"cancelled_before_sent",occurredAt:new Date().toISOString()};
      await request(`/telephony/calls/${encodeURIComponent(callId)}/events`,"POST",event);
    }
    await remove(entry.id);unconfirmed.delete(callId);if(!disposed)options.onSyncError?.(null);await refreshState();
  }
  async function review(call:RuntimeCall,rating:RuntimeCall["rating"],comment:string){
    await enqueueChain;
    let entry=(await pending(options.identity)).find(item=>item.kind==="review"&&item.payload.callId===call.callId);
    if(entry&&(entry.payload.rating!==rating||entry.payload.comment!==comment))throw new Error("Há uma avaliação sem confirmação. Consulte com os mesmos valores antes de alterá-la.");
    if(!entry){const payload={operationId:crypto.randomUUID(),callId:call.callId,rating,comment,expectedVersion:call.reviewVersion};await enqueue("review",payload,payload.operationId);entry=(await pending(options.identity)).find(item=>item.kind==="review"&&item.payload.callId===call.callId)!;}
    try{
      const {callId:_callId,...body}=entry.payload;
      const result=await request<{version:number}>(`/telephony/calls/${encodeURIComponent(call.callId)}/quality`,"PUT",body);
      await remove(entry.id);return result;
    }catch(error){if((error as {outcome?:string}).outcome==="NOT_COMMITTED")await remove(entry.id);throw error;}
  }
  const online=()=>{void enqueueChain.then(()=>flush()).catch(()=>{});};
  function activate(){disposed=false;if(!listening&&typeof window!=="undefined"){window.addEventListener("online",online);listening=true;}}
  function dispose(){disposed=true;if(listening&&typeof window!=="undefined"){window.removeEventListener("online",online);listening=false;}}
  activate();
  return {prepareCall,reportCall,refreshState,commandPause,request,review,activate,dispose,pendingPreparations,confirmUnsentPreparation,getCall,
    listCalls:(operatorId?:number,before?:string)=>{const query=new URLSearchParams();if(operatorId)query.set("operatorId",String(operatorId));if(before)query.set("before",before);return request<{calls:RuntimeCall[]}>(`/telephony/calls${query.size?`?${query}`:""}`);},
    metrics:()=>request<OperatorDashboardMetrics>("/telephony/metrics"),
    session:async(kind:"connect"|"heartbeat"|"disconnect",sessionId:string)=>{if(state?.enabled===false)return{observed:false};return request<{observed:boolean}>("/telephony/session","POST",{kind,sessionId});},
    waitForSync:async()=>{await enqueueChain;if(localWriteFailure)throw localWriteFailure;await flush();if((await pending(options.identity)).some(entry=>entry.kind!=="review"))throw new Error("Há registros telefônicos pendentes de sincronização. Confira o histórico antes de finalizar.");},
  };
}
export type TelephonyRuntimeClient=ReturnType<typeof createTelephonyRuntimeClient>;
