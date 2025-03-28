"use client"
import Header from "@/app/(private)/[instance]/header";
import SocketProvider from "@/lib/contexts/socket.context";
import { ReactNode } from "react";

interface AppLayoutProps {
    children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="h-screen w-full box-border overflow-hidden">
            <SocketProvider>
                <div className="grid grid-rows-[max-content_minmax(400px,1fr)] h-screen w-full auto-rows-max">
                    <Header />
                    {children}
                </div>
            </SocketProvider>
        </div>
    );
}