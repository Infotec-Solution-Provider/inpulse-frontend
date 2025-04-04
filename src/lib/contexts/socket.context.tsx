"use client"
import { SocketClientSDK } from "@in.pulse-crm/sdk";
import { ReactNode, createContext, useContext, useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./auth.context";

interface ISocketContext {
    socket: SocketClientSDK;
}

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketContext = createContext({} as ISocketContext);

export default function SocketProvider({ children }: SocketProviderProps) {
    const { token } = useContext(AuthContext);
    const ioClient = useMemo(() => io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
        autoConnect: false,
        path: '/socket.io',
        transports: ['websocket']
    }), []);
    const client = useMemo(() => new SocketClientSDK(ioClient), [ioClient]);

    useEffect(() => {
        if (!!token) {
            ioClient.auth = { token };
            ioClient.connect();
        }
    }, [token, client, ioClient]);

    return (
        <SocketContext.Provider value={{
            socket: client
        }}>
            {children}
        </SocketContext.Provider>
    );
}