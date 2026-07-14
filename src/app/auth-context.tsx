"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthContextProps, AuthSignForm } from "@/lib/types/auth-context.types";
import { ProviderProps } from "@/lib/types/generic.types";
import authService from "../lib/services/auth.service";
import { toast } from "react-toastify";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { User } from "@/lib/sdk-local";
import usersService from "../lib/services/users.service";

const LAST_TENANT_STORAGE_KEY = "@inpulse/last-tenant";

export const AuthContext = createContext({} as AuthContextProps);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export default function AuthProvider({ children }: ProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const getInstanceFromPath = (path: string) => path.split("/").filter(Boolean)[0] ?? "";
  const instanceRef = useRef(getInstanceFromPath(pathname));

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);


  const signIn = useCallback(
    async (instance: string, { login, password }: AuthSignForm) => {
      try {
        const session = await authService.login(instance, login, password);
        localStorage.setItem(`@inpulse/${instance}/token`, session.token);
        localStorage.setItem(LAST_TENANT_STORAGE_KEY, instance);

        instanceRef.current = instance;

        setUser(session.user);
        setToken(session.token);

        axios.defaults.headers["authorization"] = `Bearer ${session.token}`;
        router.replace(`/${instance}`);
      } catch (err) {
        toast.error("Falha ao logar!\n" + sanitizeErrorMessage(err));
      }
    },
    [router],
  );

  const signOut = useCallback(() => {
    setToken(null);
    if (instanceRef.current) {
      localStorage.removeItem(`@inpulse/${instanceRef.current}/token`);
      router.replace(`/${instanceRef.current}/login`);
      setUser(null);
      return;
    }

    router.replace("/");
    setUser(null);
  }, [router]);

  useEffect(() => {
    const instance = getInstanceFromPath(pathname);
    instanceRef.current = instance;
    if (instanceRef.current) {
      localStorage.setItem(LAST_TENANT_STORAGE_KEY, instanceRef.current);
    }
    const prevToken = instanceRef.current
      ? localStorage.getItem(`@inpulse/${instanceRef.current}/token`)
      : null;
    const startedAt = Date.now();
    const isRootPath = pathname === "/";
    const isLoginPath = pathname.includes("/login");
    const requiresAuth = !isRootPath && !isLoginPath;

    setToken(prevToken);

    if (prevToken) {
      usersService.setAuth(prevToken);

      authService
        .fetchSessionData(prevToken)
        .then(async (session) => {
          instanceRef.current = session.instance;
          axios.defaults.headers["authorization"] = `Bearer ${prevToken}`;
          usersService.setAuth(`Bearer ${prevToken}`);
          const user = await usersService.getUserById(session.userId);
          setUser(user);

          if (isLoginPath) {
            router.replace(`/${instanceRef.current}`);
          }
        })
        .catch((err) => {
          toast.error(err.message || "Sessão expirada, faça o login novamente!");
          if (instanceRef.current) {
            localStorage.removeItem(`@inpulse/${instanceRef.current}/token`);
          }
          setUser(null);

          if (requiresAuth && instanceRef.current) {
            router.replace(`/${instanceRef.current}/login`);
          }
        });
    }

    if (!prevToken && requiresAuth && instanceRef.current) {
      router.replace(`/${instanceRef.current}/login`);
    }
  }, [pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: false,
        signIn,
        signOut,
        instance: instanceRef.current,
        pathname: pathname,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
