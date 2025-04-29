"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthContextProps, AuthSignForm } from "@/lib/types/auth-context.types";
import { ProviderProps } from "@/lib/types/generic.types";
import authService from "../lib/services/auth.service";
import { toast } from "react-toastify";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { User } from "@in.pulse-crm/sdk";
import usersService from "../lib/services/users.service";

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
  const instanceRef = useRef(pathname.split("/")[1]);

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const signIn = useCallback(
    async (instance: string, { login, password }: AuthSignForm) => {
      try {
        const session = await authService.login(instance, login, password);
        localStorage.setItem(`@inpulse/${instance}/token`, session.token);

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
    localStorage.removeItem(`@inpulse/${instanceRef.current}/token`);
    setUser(null);
    setToken(null);
    router.replace(`/${instanceRef.current}/login`);
  }, [router]);

  useEffect(() => {
    const instance = pathname.split("/")[1];
    instanceRef.current = instance;
    const prevToken = localStorage.getItem(`@inpulse/${instanceRef.current}/token`);
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

          if (pathname.includes("login")) {
            router.replace(`/${instanceRef.current}`);
          }
        })
        .catch((err) => {
          toast.error(err.message || "Sessão expirada, faça o login novamente!");
          localStorage.removeItem(`@inpulse/${instanceRef.current}/token`);
          setUser(null);

          if (!pathname.includes("login")) {
            router.replace(`/${instanceRef.current}/login`);
          }
        });
    }

    if (!prevToken && !pathname.includes("login")) {
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
