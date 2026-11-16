"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuthContext } from "@/app/auth-context";
import {
  isManagedOperatorTenant,
  readOperatorFeatures,
  type OperatorFeature,
  type OperatorFeatureCapabilities,
} from "@/lib/operator-features";

interface Access {
  managed: boolean;
  capabilities: OperatorFeatureCapabilities | null;
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
const Context = createContext<Access | null>(null);
const baseUrl = (process.env.NEXT_PUBLIC_CUSTOMERS_URL || "").replace(/\/$/, "");
export function useOperatorFeatures() {
  const access = useContext(Context),
    { instance } = useAuthContext();
  const managed = isManagedOperatorTenant(instance);
  const state = access ?? {
    managed,
    capabilities: null,
    ready: !managed,
    error: null,
    refresh: async () => {},
  };
  return {
    ...state,
    allows: (feature: OperatorFeature) =>
      state.ready && state.capabilities?.features[feature] === true,
  };
}
export function OperatorFeaturesProvider({ children }: { children: ReactNode }) {
  const { instance, user, token } = useAuthContext();
  return (
    <FeatureSession
      key={`${instance}:${user?.CODIGO ?? ""}`}
      instance={instance}
      operatorId={user?.CODIGO ?? 0}
      token={token}
    >
      {children}
    </FeatureSession>
  );
}
function FeatureSession({
  instance,
  operatorId,
  token,
  children,
}: {
  instance: string;
  operatorId: number;
  token: string | null;
  children: ReactNode;
}) {
  const managed = isManagedOperatorTenant(instance);
  const [capabilities, setCapabilities] = useState<OperatorFeatureCapabilities | null>(null);
  const [acceptedToken, setAcceptedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = useRef({ token, alive: true, request: 0 });
  current.current.token = token;
  const refresh = useCallback(async () => {
    if (!managed) return;
    const snapshot = current.current,
      auth = snapshot.token,
      request = ++snapshot.request;
    if (!auth || operatorId < 1) {
      setCapabilities(null);
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/api/customers/operator-features`, {
        cache: "no-store",
        headers: {
          Authorization: /^Bearer\s/i.test(auth) ? auth : `Bearer ${auth}`,
          "x-crm-instance": instance,
        },
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json"))
        throw new Error();
      const data = readOperatorFeatures((await response.json()).data, operatorId);
      if (snapshot.alive && snapshot.request === request && snapshot.token === auth) {
        setCapabilities(data);
        setAcceptedToken(auth);
        setError(null);
      }
    } catch {
      if (snapshot.alive && snapshot.request === request && snapshot.token === auth) {
        setCapabilities(null);
        setError("Não foi possível conferir as permissões do operador. Tente novamente.");
      }
    }
  }, [instance, operatorId, managed]);
  useEffect(() => {
    current.current.alive = true;
    setCapabilities(null);
    void refresh();
    const focus = () => {
      if (document.visibilityState !== "hidden") void refresh();
    };
    const timer = window.setInterval(focus, 30_000);
    window.addEventListener("focus", focus);
    return () => {
      current.current.alive = false;
      current.current.request++;
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [token, refresh]);
  const visible = token && acceptedToken === token ? capabilities : null;
  return (
    <Context.Provider
      value={{
        managed,
        capabilities: visible,
        ready: !managed || visible !== null,
        error,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
