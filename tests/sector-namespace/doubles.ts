import {createContext,useContext,useSyncExternalStore} from 'react';
const listeners=new Set<()=>void>(),query=new URLSearchParams(location.search);
const fields=[{name:'NOME',label:'Nome',type:'text',group:'Cadastro',nullable:false},{name:'SETOR',label:'Setor',type:'number',group:'Cadastro',nullable:false}];
const record={CODIGO:55,NOME:'Operador sintético',LOGIN:'operator',NIVEL:'ATIVO',SETOR:2,AVATAR_ID:null};
const state={instance:'odim',token:'fixture-token' as string|null,user:{CODIGO:23,SETOR:1,NIVEL:'ADMIN'},calls:[] as any[],writes:[] as any[],revision:0};
Object.assign(window,{sectorTest:{state,update(patch:Partial<typeof state>){Object.assign(state,patch);state.revision++;listeners.forEach(fn=>fn())}}});
export function watch(){useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>state.revision);return state}
export const AuthContext=createContext<any>({}),WhatsappContext=createContext<any>({});
export const useAuthContext=()=>useContext(AuthContext),useWhatsappContext=()=>useContext(WhatsappContext);
export function capability(instance:string){if(instance!=='odim'||query.has('off'))return null;
 return {revision:'reviewed-v2',sharedUserIds:[],excludedOperatorIds:[],canTransferAttendance:true,canUseAdminTransferTarget:false,
 crmSectorId:1,whatsappSectorId:12,crmSectorByWhatsappSector:query.has('missing')?{}:query.has('ambiguous')?{'12':1,'13':1}:{'12':1,'13':2}}}
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export const bootstrapApi={async get(url:string,config:any){
 const instance=config.headers['x-crm-instance'];state.calls.push({url,instance});
 if(query.get('delay')==='params'&&url.endsWith('/parameters')||query.get('delay')==='sectors'&&url.endsWith('/sectors'))await wait(500);
 if(url.endsWith('/parameters'))return query.has('missing-root')?{data:{parameters:{}}}:{data:{parameters:{feature_crm_users_enabled:query.get('form')==='registration'?'true':'false'},tenantPolicy:capability(instance)}};
 if(url.endsWith('/sectors'))return{data:{data:[{id:1,name:'INFOTEC foreign',defaultClientId:99},{id:12,name:'ODIM principal',defaultClientId:27},{id:13,name:'ODIM apoio',defaultClientId:27}]}};
 return{data:{data:[{id:27}]}};
}};
export class UsersClient{constructor(_base:string){}setAuth(_token:string){}async getUsers(){return{data:[],page:{totalRows:0}}}async createUser(data:any){state.writes.push({kind:'basic-create',data});return{...data,CODIGO:56}}async updateUser(_id:string,data:any){state.writes.push({kind:'basic-update',data});return data}}
export const crmUsersService={setAuth(_token:string){},async getRegistration(){return{data:{record:{...record},version:'v1',fields}}},async registrationSchema(){return{data:{fields}}},
 async updateRegistration(_id:number,changes:any){state.writes.push({kind:'registration-update',data:changes});return{data:{record:{...record,...changes},version:'v2',fields}}},
 async createRegistration(changes:any){state.writes.push({kind:'registration-create',data:changes});return{data:{record:{...record,...changes},version:'v2',fields}}},};
export {record};
