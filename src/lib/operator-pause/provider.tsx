"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuthContext } from "@/app/auth-context";
import { useOperatorFeatures } from "@/lib/components/operator-features-provider";
import { createOperatorPauseClient, type OperatorPauseClient, type RuntimeOperatorState } from "./client";

interface OperatorPauseContextValue {
  canAccessOperatorRuntime: boolean;
  operatorState: RuntimeOperatorState | null;
  runtime: OperatorPauseClient;
  syncError: string | null;
  busy: boolean;
  state: { scheduleId: number | null };
  observePhone: (busy: boolean, scheduleId: number | null) => void;
}
const OperatorPauseContext = createContext<OperatorPauseContextValue | null>(null);
export const useOperatorPause = () => useContext(OperatorPauseContext);

/** Authentication owns the pause lifecycle; SIP access and route changes do not. */
export function OperatorPauseProvider({ children }: { children: ReactNode }) {
  const { token, instance, user } = useAuthContext();
  const access = useOperatorFeatures();
  const authenticated = !!token && !!instance && !!user;
  const allowed = authenticated && (!access.managed || access.allows("operator"));
  return <PauseSession key={`${instance}:${user?.CODIGO ?? ""}:${authenticated}`} token={token} instance={instance} operatorId={user?.CODIGO ?? 0} authenticated={authenticated} allowed={allowed}>{children}</PauseSession>;
}

function PauseSession({ children, token, instance, operatorId, authenticated, allowed }: { children: ReactNode; token: string | null; instance: string; operatorId: number; authenticated: boolean; allowed: boolean }) {
  const access = useOperatorFeatures();
  const refreshAccess = useRef(access.refresh);
  refreshAccess.current = access.refresh;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const [operatorState, setOperatorState] = useState<RuntimeOperatorState | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [phone, setPhone] = useState({ busy: false, scheduleId: null as number | null });
  const [runtime] = useState(() => createOperatorPauseClient({ identity: `${instance}:${operatorId}:central-v1`, getToken: () => tokenRef.current,
    onOperatorState: next => { setOperatorState(next); setSyncError(null); }, onSyncError: setSyncError,
    onAccessDenied: () => { setOperatorState(null); setSyncError("Seu acesso às funcionalidades do operador não está habilitado."); void refreshAccess.current(); },
    onUnavailable: () => setSyncError("Não foi possível conferir a pausa. Atualize o estado antes de continuar.") }));
  const observePhone = useCallback((busy: boolean, scheduleId: number | null) => {
    setPhone(current => current.busy === busy && current.scheduleId === scheduleId ? current : { busy, scheduleId });
  }, []);

  useEffect(() => {
    if (!authenticated || !allowed) { setOperatorState(null); return; }
    let cancelled = false;
    runtime.activate();
    const refresh = () => { void runtime.refreshState().then(status => {
      if(status.enabled)void runtime.waitForSync().catch(()=>{});
    }).catch(() => {
      if (!cancelled) setSyncError("Não foi possível conferir a pausa. Atualize o estado antes de continuar.");
    }); };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => { cancelled = true; window.clearInterval(timer); runtime.dispose(); };
  }, [authenticated, allowed, runtime]);

  return <OperatorPauseContext.Provider value={{ canAccessOperatorRuntime: allowed, operatorState, runtime, syncError,
    busy: phone.busy, state: { scheduleId: phone.scheduleId }, observePhone }}>{children}</OperatorPauseContext.Provider>;
}
