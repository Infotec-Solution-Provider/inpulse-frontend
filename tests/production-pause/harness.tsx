import { TelephonyPanelSlot } from "../../src/lib/telephony/telephony-panel";
import { useOperatorFeatures } from "../../src/lib/components/operator-features-provider";
import "../monitor/harness.css";
import "../../src/app/globals.css";
import "./runtime-fixture";
import { createRoot } from "react-dom/client";
import { useContext, useEffect, useState } from "react";
import AppLayout from "../../src/app/(private)/[instance]/layout";
import { ChatContext } from "../../src/app/(private)/[instance]/(main)/(chat)/chat-context";
import { useThemeContext } from "../../src/app/theme-context";
import { useOperatorPause } from "../../src/lib/operator-pause/provider";
import TelephoneDialerCard from "../../src/app/(private)/[instance]/(main)/(chats-menu)/telephone-dialer-card";
import { useEnvironment,state,resolveSend,refreshToken } from "../chat-send/doubles";
import { AuthContext } from "./doubles";
import { navigate,usePathname } from "../monitor/navigation-doubles";
import { useTelephony } from "../../src/lib/telephony/telephony-provider";
navigate("/tenant-a/");
Object.assign((window as any).productionFixture,{navigate,state,resolveSend,refreshToken,variant:"modern"});
function Probe(){
 const chat=useContext(ChatContext),path=usePathname(),pause=useOperatorPause(),theme=useThemeContext() as any;
 const [error,setError]=useState(""); const access=useOperatorFeatures();
 const phone=useTelephony();
 useEffect(()=>{Object.assign((window as any).productionFixture,{access, runtime:pause?.runtime,setTheme:(mode:string)=>{if(theme.setPreference)theme.setPreference(mode);else if(theme.theme!==mode)theme.toggleTheme();}});},[access, pause?.runtime,theme.setPreference,theme.theme,theme.toggleTheme]);
 return <section className="flex h-full min-h-0 flex-col gap-2 p-2"><h1>{path}</h1>
 {new URLSearchParams(location.search).has("show-phone")&&<TelephonyPanelSlot/>}
 <textarea className="min-h-[64px] shrink-0" aria-label="Message draft" value={chat.state.text} onChange={e=>chat.dispatch({type:"change-text",text:e.target.value})}/>
 <button onClick={()=>void chat.sendMessage()}>Send fixture</button>
 <output data-testid="capabilities">{JSON.stringify(access.capabilities?.features??null)}</output><output data-testid="readonly">{String(chat.isReadOnlyMode)}</output>
 <output data-testid="pending">{chat.pendingSends.length}</output><output role="alert">{error}</output>
 <button onClick={()=>void phone.connect()}>Connect fixture</button>
 <button onClick={()=>void phone.dial("102").catch(e=>setError(e.message))}>Dial fixture</button>
 <button onClick={()=>void phone.dial("102",42).catch(e=>setError(e.message))}>Dial schedule fixture</button>
 <button onClick={phone.hangup}>Hangup fixture</button><output data-testid="phase">{phone.state.phase}</output><output data-testid="connection">{phone.state.connection}</output>
 {new URLSearchParams(location.search).has("card")&&<TelephoneDialerCard/>}
 </section>;
}
function Harness(){const env=useEnvironment();const [authenticated,setAuthenticated]=useState(true);const[identity,setIdentity]=useState((window as any).productionFixture.identity);usePathname();
 useEffect(()=>{(window as any).productionFixture.logout=()=>setAuthenticated(false);(window as any).productionFixture.switchIdentity=(instance:string,userId:number)=>{(window as any).productionFixture.identity={instance,userId};setIdentity({instance,userId});};},[]);
 return <AuthContext.Provider value={{...env.auth,instance:identity.instance,token:authenticated?env.auth.token:null,user:authenticated?{...env.auth.user,CODIGO:identity.userId,NIVEL:identity.instance==="odim"&&!new URLSearchParams(location.search).has("admin")?"ATIVO":"ADMIN",NOME:"Demo"}:null,status:authenticated?"authenticated":"anonymous",signOut:()=>setAuthenticated(false)} as never}>
 <AppLayout><Probe/></AppLayout></AuthContext.Provider>;
}
createRoot(document.getElementById("root")!).render(<Harness/>);
