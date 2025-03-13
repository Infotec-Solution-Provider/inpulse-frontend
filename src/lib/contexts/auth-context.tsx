"use client"
import { createContext, useCallback, useEffect, useState } from "react";
import { AuthContextProps, AuthSignForm } from "@/lib/types/auth-context.types";
import { ProviderProps } from "@/lib/types/generic.types";
import { User } from "@in.pulse-crm/types";
import authService from "../services/auth.service";
import { toast } from "react-toastify";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";

export const authContext = createContext({} as AuthContextProps);

export default function AuthProvider({ children }: ProviderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const instance = pathname.split("/")[1];

    const [user, setUser] = useState<User | null>(null);

    const signIn = useCallback(async (instance: string, { login, password }: AuthSignForm) => {
        try {
            const { data } = await authService.login(instance, login, password)

            localStorage.setItem("@inpulse/token", data.token);
            setUser(data.user);
            axios.defaults.headers["authorization"] = `Bearer ${data.token}`;
            router.replace(`/${instance}/app`);
        } catch (err) {
            toast.error("Falha ao logar!\n" + sanitizeErrorMessage(err));
        }
    }, [router]);

    const signOut = useCallback(() => {
        localStorage.removeItem("@inpulse/token");
        setUser(null);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("@inpulse/token");

        if (token && pathname) {
            authService.fetchSessionUser(instance, token)
                .then(({ data }) => {
                    console.log(data);
                    setUser(data);
                    axios.defaults.headers["authorization"] = `Bearer ${token}`;

                    if (user && pathname.includes("login")) {
                        router.replace(`/${instance}/app`);
                    }
                })
                .catch((err) => {
                    toast.error(err.message || "Sessão expirada, faça o login novamente!");
                    localStorage.removeItem("@inpulse/token");
                    setUser(null);

                    if (!user && !pathname.includes("login")) {
                        router.replace(`/${instance}/login`);
                    }
                });
        }

        if (!token && !user && !pathname.includes("login")) {
            router.replace(`/${instance}/login`);
        }


    }, [router, instance, pathname]);

    return (
        <authContext.Provider value={{
            user,
            isAuthenticated: false,
            signIn,
            signOut
        }}>
            {children}
        </authContext.Provider>
    );
}
