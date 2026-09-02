"use client";
import { SocketClient, SocketEventType } from "@/lib/sdk-local";
import { ReactNode, createContext, useContext, useEffect, useRef } from "react";
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

const SOCKET_URL = process.env["NEXT_PUBLIC_SOCKET_URL"] || "http://localhost:8004";

export const SocketContext = createContext({} as ISocketContext);

export default function SocketProvider({ children }: SocketProviderProps) {
  const { token } = useContext(AuthContext);
  const { openModal, closeModal } = useContext(AppContext);

  const socket = useRef(new SocketClient(SOCKET_URL));

  useEffect(() => {
    if (token) {
      socket.current.connect(token);
    } else {
      socket.current.disconnect();
    }
  }, [token]);

  useEffect(() => {
    const socketClient = socket.current;
    return () => socketClient.disconnect();
  }, []);

  useEffect(() => {
    const socketClient = socket.current;
    const looseSocket = socketClient as unknown as {
      on: (event: string, callback: (data: { callerNumber: string; callerName: string | null; ramal: string }) => void) => void;
      off: (event: string) => void;
    };

    socketClient.on(SocketEventType.WwebjsQr, ({ qr, phone }) => {
      openModal(<QRModal qr={qr} phone={phone} />);
    });

    socketClient.on(SocketEventType.WwebjsAuth, ({ phone, success, message }) => {
      if (success) {
        toast.success(`Número ${phone} autenticado com sucesso!`);
      } else {
        toast.error(`Erro ao autenticar número ${phone}: ${message}`);
      }
    });

    // Telefonia: chamada receptiva recebida via AMI.
    // Usa string literal ate `@/lib/sdk-local` ser republicada com TelephonyCallReceived.
    looseSocket.on(
      "telephony_call_received",
      (data: {
        callerNumber: string;
        callerName: string | null;
        ramal: string;
      }) => {
        const who = data.callerName ? `${data.callerName} (${data.callerNumber})` : data.callerNumber;
        toast.info(`Chamada recebida de ${who} no ramal ${data.ramal}`, {
          autoClose: 8000,
        });
      }
    );

    return () => {
      socketClient.off(SocketEventType.WwebjsQr);
      socketClient.off(SocketEventType.WwebjsAuth);
      looseSocket.off("telephony_call_received");
    };
  }, [socket, closeModal, openModal]);

  return (
    <SocketContext.Provider
      value={{
        socket: socket.current,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
