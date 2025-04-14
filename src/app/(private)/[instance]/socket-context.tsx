"use client";
import { SocketClient, SocketEventType } from "@in.pulse-crm/sdk";
import { ReactNode, createContext, useContext, useEffect, useMemo } from "react";
import { AuthContext } from "../../auth-context";
import { AppContext } from "./app-context";
import QRModal from "./(main)/qr-modal";
import { toast } from "react-toastify";

interface ISocketContext {
  socket: SocketClient;
}

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketContext = createContext({} as ISocketContext);

export default function SocketProvider({ children }: SocketProviderProps) {
  const { token } = useContext(AuthContext);
  const { openModal, closeModal } = useContext(AppContext);

  const client = useMemo(() => {
    const SOCKET_URL = process.env["NEXT_PUBLIC_SOCKET_URL"] || "http://localhost:8004";

    return new SocketClient(SOCKET_URL);
  }, []);

  useEffect(() => {
    if (token) {
      client.connect(token);
    } else {
      client.disconnect();
    }
  }, [token, client]);

  useEffect(() => {
    client.on(SocketEventType.WwebjsQr, ({ qr, phone }) => {
      openModal(<QRModal qr={qr} phone={phone} onClose={closeModal} />);
    });

    client.on(SocketEventType.WwebjsAuth, ({ phone, success, message }) => {
      if(success) {
        toast.success(`Número ${phone} autenticado com sucesso!`);
      }
      else {
        toast.error(`Erro ao autenticar número ${phone}: ${message}`);
      }
    });

    return () => {
      client.off(SocketEventType.WwebjsQr);
    };
  }, [client]);

  return (
    <SocketContext.Provider
      value={{
        socket: client,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
