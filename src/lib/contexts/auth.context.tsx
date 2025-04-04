"use client";
import { createContext, useCallback, useEffect, useState } from "react";
import { AuthContextProps, AuthSignForm } from "@/lib/types/auth-context.types";
import { ProviderProps } from "@/lib/types/generic.types";
import authService from "../services/auth.service";
import { toast } from "react-toastify";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { User } from "@in.pulse-crm/sdk";
import usersService from "../services/users.service";

export const AuthContext = createContext({} as AuthContextProps);

export default function AuthProvider({ children }: ProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const instance = pathname.split("/")[1];

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const signIn = useCallback(
    async (instance: string, { login, password }: AuthSignForm) => {
      try {
        const { data } = await authService.login(instance, login, password);

        localStorage.setItem(`@inpulse/${instance}/token`, data.token);

        setUser(data.user);
        setToken(data.token);

        axios.defaults.headers["authorization"] = `Bearer ${data.token}`;
        router.replace(`/${instance}`);
      } catch (err) {
        toast.error("Falha ao logar!\n" + sanitizeErrorMessage(err));
      }
    },
    [router],
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(`@inpulse/${instance}/token`);
    setUser(null);
    setToken(null);
    router.replace(`/${instance}/login`);
  }, [router]);

  useEffect(() => {
    const prevToken = localStorage.getItem(`@inpulse/${instance}/token`);
    setToken(prevToken);

    if (prevToken) {
      authService
        .fetchSessionData(prevToken)
        .then(async (res) => {
          axios.defaults.headers["authorization"] = `Bearer ${prevToken}`;
          usersService.setAuth(`Bearer ${prevToken}`);

          return await usersService.getUserById(res.data.userId);
        })
        .then((res) => {
          setUser(res.data);

          if (pathname.includes("login")) {
            router.replace(`/${instance}`);
          }
        })
        .catch((err) => {
          toast.error(err.message || "Sessão expirada, faça o login novamente!");
          localStorage.removeItem(`@inpulse/${instance}/token`);
          setUser(null);

          if (!pathname.includes("login")) {
            router.replace(`/${instance}/login`);
          }
        });
    }

    if (!prevToken && !pathname.includes("login")) {
      router.replace(`/${instance}/login`);
    }
  }, [instance]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: false,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
