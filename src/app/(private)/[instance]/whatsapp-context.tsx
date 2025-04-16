import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { SocketEventType, WhatsappClient, WppChatWithDetails, WppMessage } from "@in.pulse-crm/sdk";
import { AuthContext } from "@/app/auth-context";
import { SocketContext } from "./socket-context";

interface IWhatsappContext {
  chats: WppChatWithDetails[];
  messages: Record<number, WppMessage[]>;
}

interface WhatsappProviderProps {
  children: ReactNode;
}

const WPP_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";

export const WhatsappContext = createContext({} as IWhatsappContext);

export default function WhatsappProvider({ children }: WhatsappProviderProps) {
  const { token } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [chats, setChats] = useState<WppChatWithDetails[]>([]);
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({});
  const api = useRef(new WhatsappClient(WPP_BASE_URL));

  useEffect(() => {
    api.current.setAuth(token || "");

    if (!token) {
      setChats([]);
    }

    if (token) {
      api.current.getChatsWithMessages().then((res) => {
        setChats(res.data.chats);

        for (const msg of res.data.messages) {
          setMessages((prev) => {
            const key = msg.chatId || 0;

            if (!prev[key]) {
              prev[key] = [];
            }

            prev[key].push(msg);

            return prev;
          });
        }
      });
    }
  }, [token]);

  useEffect(() => {
    socket.on(SocketEventType.WppMessage, (data) => {
      console.log(data);
    });

  }, [socket]);

  return (
    <WhatsappContext.Provider
      value={{
        chats,
        messages,
      }}
    >
      {children}
    </WhatsappContext.Provider>
  );
}
