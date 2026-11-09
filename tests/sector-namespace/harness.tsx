import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import UsersProvider,{useUsersContext} from '../../src/app/(private)/[instance]/(cruds)/users/users-context';
import {loadWhatsappSectorSession} from '../../src/lib/whatsapp-sector-bootstrap';
import {AuthContext,WhatsappContext,watch,bootstrapApi,record} from './doubles';
function Editor(){const {sectors,openUserModal}=useUsersContext();return<><p data-testid="crm-options">{JSON.stringify(sectors)}</p><button onClick={()=>openUserModal(record as any)}>Editar operador</button></>}
function Harness(){
 const state=watch(),scope=JSON.stringify([state.instance,state.user.CODIGO,state.token]);
 const live=useRef(scope);live.current=scope;
 const [snapshot,setSnapshot]=useState<any>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;setSnapshot(null);setError(false);if(!state.token)return;
 void loadWhatsappSectorSession(bootstrapApi as any,{instance:state.instance,crmSectorId:state.user.SETOR,token:state.token,isCurrent:()=>active&&live.current===scope})
 .then(value=>{if(value)setSnapshot({...value,scope})}).catch(()=>{if(active)setError(true)});return()=>{active=false};},[scope]);
 const current=snapshot&&snapshot.scope===scope;
 return<AuthContext.Provider value={{token:state.token,user:state.user,instance:state.instance}}>
 <p data-testid="original-crm">{state.user.SETOR}</p>
 {!state.token?<p>Sessão encerrada</p>:error?<p>Mapeamento indisponível</p>:!current?<p>Carregando sessão</p>:
 <WhatsappContext.Provider value={{...snapshot,loaded:true,parameters:snapshot.parameters}}><p data-testid="wa-sector">{snapshot.whatsappSectorId}</p><p data-testid="wa-options">{JSON.stringify(snapshot.sectors)}</p><UsersProvider key={scope}><Editor/></UsersProvider></WhatsappContext.Provider>}
 </AuthContext.Provider>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
