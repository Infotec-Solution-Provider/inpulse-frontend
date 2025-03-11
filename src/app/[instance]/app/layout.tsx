"use client"
import Header from "@/app/[instance]/app/header";
import { authContext } from "@/lib/contexts/auth-context";
import { useContext } from "react";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const { user } = useContext(authContext);

    return (
        <div className=" h-full w-full box-border overflow-hidden">
            {user ?
                (
                    <div className="grid grid-rows-[max-content_minmax(400px,1fr)] h-full w-full auto-rows-max">
                        <Header pageContext="App" pageTitle="Home" />
                        <div className="overflow-auto">
                            {children}
                        </div>
                    </div>
                )
                :
                <div className="w-full h-full flex just-center items-center text-slate-400">
                    Carregando...
                </div>
            }
        </div>
    );
}