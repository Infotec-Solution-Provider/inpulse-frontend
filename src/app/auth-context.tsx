"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { AuthContextProps, AuthSignForm } from "@/lib/types/auth-context.types";
import { ProviderProps } from "@/lib/types/generic.types";
import { User } from "@/lib/sdk-local";
import { authSession } from "@/lib/auth-session";
import authService from "../lib/services/auth.service";
import usersService from "../lib/services/users.service";

const LAST_TENANT_STORAGE_KEY = "@inpulse/last-tenant";
const REFRESH_RETRY_DELAYS_MS = [0, 1_000, 2_000];

type AuthStatus = AuthContextProps["status"];

function getInstanceFromPath(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? "";
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const AuthContext = createContext({} as AuthContextProps);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used within an AuthProvider");
  return context;
}

export default function AuthProvider({ children }: ProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const instanceRef = useRef(getInstanceFromPath(pathname));
  const tokenRef = useRef<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const refreshAbortRef = useRef<AbortController | null>(null);
  const sessionEpochRef = useRef(0);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const clearLocalSession = useCallback((redirect = true) => {
    sessionEpochRef.current += 1;
    refreshAbortRef.current?.abort();
    refreshAbortRef.current = null;
    tokenRef.current = null;
    authSession.clearConfiguration();
    setToken(null);
    setUser(null);
    setStatus("anonymous");
    delete axios.defaults.headers.common.Authorization;
    delete axios.defaults.headers.authorization;
    if (instanceRef.current) {
      localStorage.removeItem(`@inpulse/${instanceRef.current}/token`);
      if (redirect) router.replace(`/${instanceRef.current}/login`);
    } else if (redirect) {
      router.replace("/");
    }
  }, [router]);

  const applySession = useCallback((session: { token: string; user: User }) => {
    tokenRef.current = session.token;
    authSession.setAccessToken(session.token);
    setToken(session.token);
    setUser(session.user);
    setStatus("authenticated");
    axios.defaults.headers.common.Authorization = `Bearer ${session.token}`;
    usersService.setAuth(session.token);
    if (instanceRef.current) localStorage.removeItem(`@inpulse/${instanceRef.current}/token`);
  }, []);

  const refreshSession = useCallback(async (): Promise<string> => {
    let lastError: unknown;
    const epoch = sessionEpochRef.current;
    const instance = instanceRef.current;
    const abortController = new AbortController();
    refreshAbortRef.current = abortController;
    setStatus((current) => current === "anonymous" ? current : "recovering");
    try {
      for (const delay of REFRESH_RETRY_DELAYS_MS) {
        if (delay) await wait(delay);
        if (abortController.signal.aborted || epoch !== sessionEpochRef.current) {
          throw new Error("session refresh cancelled");
        }
        try {
          const session = await authService.refresh(instance, abortController.signal);
          if (
            abortController.signal.aborted ||
            epoch !== sessionEpochRef.current ||
            instance !== instanceRef.current
          ) {
            throw new Error("session refresh cancelled");
          }
          applySession(session);
          return session.token;
        } catch (error) {
          lastError = error;
          if (axios.isCancel(error) || abortController.signal.aborted) throw error;
          if (authSession.isDefinitiveRefreshFailure(error)) throw error;
        }
      }
      setStatus(tokenRef.current ? "recovering" : "anonymous");
      throw lastError;
    } finally {
      if (refreshAbortRef.current === abortController) refreshAbortRef.current = null;
    }
  }, [applySession]);

  useEffect(() => {
    authSession.installGlobalAxios();
    authSession.configure({
      instance: instanceRef.current,
      refresh: refreshSession,
      onInvalid: () => { if (tokenRef.current) clearLocalSession(true); },
    });
  }, [clearLocalSession, refreshSession, pathname]);

  const signIn = useCallback(async (instance: string, { login, password }: AuthSignForm) => {
    sessionEpochRef.current += 1;
    refreshAbortRef.current?.abort();
    refreshAbortRef.current = null;
    authSession.clearConfiguration();
    try {
      const session = await authService.login(instance, login, password);
      localStorage.setItem(LAST_TENANT_STORAGE_KEY, instance);
      instanceRef.current = instance;
      authSession.configure({
        instance,
        refresh: refreshSession,
        onInvalid: () => { if (tokenRef.current) clearLocalSession(true); },
      });
      applySession(session);
      router.replace(`/${instance}`);
    } catch (err) {
      toast.error("Falha ao logar!\n" + sanitizeErrorMessage(err));
    }
  }, [applySession, clearLocalSession, refreshSession, router]);

  const signOut = useCallback(async () => {
    const instance = instanceRef.current;
    clearLocalSession(false);
    try {
      if (instance) await authService.logout(instance);
    } catch {
      // Local logout must still complete when the API is unavailable.
    } finally {
      channelRef.current?.postMessage({ type: "logout", instance });
      router.replace(instance ? `/${instance}/login` : "/");
    }
  }, [clearLocalSession, router]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("inpulse-auth");
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<{ type?: string; instance?: string }>) => {
      if (event.data?.type === "logout" && event.data.instance === instanceRef.current) {
        clearLocalSession(true);
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [clearLocalSession]);

  useEffect(() => {
    const instance = getInstanceFromPath(pathname);
    const isRootPath = pathname === "/";
    const isLoginPath = pathname.includes("/login");
    const requiresAuth = !isRootPath && !isLoginPath;

    if (!instance) {
      instanceRef.current = "";
      setStatus("anonymous");
      return;
    }

    if (instanceRef.current === instance && tokenRef.current) {
      if (isLoginPath) router.replace(`/${instance}`);
      return;
    }

    sessionEpochRef.current += 1;
    refreshAbortRef.current?.abort();
    refreshAbortRef.current = null;
    authSession.setAccessToken(null);
    tokenRef.current = null;
    instanceRef.current = instance;
    authSession.configure({
      instance,
      refresh: refreshSession,
      onInvalid: () => { if (tokenRef.current) clearLocalSession(true); },
    });
    localStorage.setItem(LAST_TENANT_STORAGE_KEY, instance);

    if (isLoginPath) {
      setStatus("anonymous");
      return;
    }

    setStatus("loading");
    let cancelled = false;
    const bootstrapEpoch = sessionEpochRef.current;
    const isStaleBootstrap = () => (
      cancelled ||
      bootstrapEpoch !== sessionEpochRef.current ||
      instance !== instanceRef.current
    );

    const bootstrap = async () => {
      try {
        await authSession.forceRefresh();
        if (isStaleBootstrap()) return;
        if (isLoginPath) router.replace(`/${instance}`);
        return;
      } catch (refreshError) {
        if (isStaleBootstrap()) return;
        const legacyToken = localStorage.getItem(`@inpulse/${instance}/token`);
        if (legacyToken) {
          try {
            const sessionData = await authService.fetchSessionData(legacyToken);
            if (isStaleBootstrap()) return;
            tokenRef.current = legacyToken;
            authSession.setAccessToken(legacyToken);
            usersService.setAuth(legacyToken);
            const legacyUser = await usersService.getUserById(sessionData.userId);
            if (isStaleBootstrap()) return;
            applySession({ token: legacyToken, user: legacyUser });
            if (isLoginPath) router.replace(`/${instance}`);
            return;
          } catch {
            tokenRef.current = null;
            authSession.setAccessToken(null);
            localStorage.removeItem(`@inpulse/${instance}/token`);
          }
        }

        if (!authSession.isDefinitiveRefreshFailure(refreshError)) {
          setStatus("recovering");
          if (requiresAuth) {
            toast.error("Não foi possível renovar a sessão. Verifique a conexão e tente novamente.");
            return;
          }
        }
        setStatus("anonymous");
        if (requiresAuth) router.replace(`/${instance}/login`);
      }
    };

    void bootstrap();
    return () => { cancelled = true; };
  }, [applySession, pathname, refreshSession, router]);

  useEffect(() => {
    if (!token) return;
    const refreshWhenNeeded = () => {
      if (authSession.expiresWithin(60_000)) void authSession.forceRefresh().catch(() => undefined);
    };
    const interval = setInterval(refreshWhenNeeded, 30_000);
    const onVisibility = () => { if (document.visibilityState === "visible") refreshWhenNeeded(); };
    window.addEventListener("focus", refreshWhenNeeded);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshWhenNeeded);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);

  useEffect(() => {
    if (status !== "recovering") return;
    let cancelled = false;
    const retryUntilRecovered = async () => {
      while (!cancelled) {
        await wait(5_000);
        if (cancelled) return;
        try {
          await authSession.forceRefresh();
          return;
        } catch (error) {
          if (authSession.isDefinitiveRefreshFailure(error)) return;
        }
      }
    };
    void retryUntilRecovered();
    return () => { cancelled = true; };
  }, [status]);

  const requiresAuth = pathname !== "/" && !pathname.includes("/login");
  const blockPrivateContent = requiresAuth && (status === "loading" || (status === "recovering" && !token));

  return (
    <AuthContext.Provider value={{
      status,
      user,
      token,
      isAuthenticated: status === "authenticated" || (status === "recovering" && !!token),
      signIn,
      signOut,
      instance: instanceRef.current,
      pathname,
    }}>
      {blockPrivateContent ? (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
          {status === "recovering" ? "Reconectando sua sessão..." : "Carregando sua sessão..."}
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}
