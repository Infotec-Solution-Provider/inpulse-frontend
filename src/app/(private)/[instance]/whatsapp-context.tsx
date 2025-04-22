import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { SocketEventType, WhatsappClient, WppChatWithDetails, WppMessage } from "@in.pulse-crm/sdk";
import { AuthContext } from "@/app/auth-context";
import { SocketContext } from "./socket-context";

interface DetailedChat extends WppChatWithDetails {
  isUnread: boolean;
  lastMessage: WppMessage | null;
}
interface IWhatsappContext {
  chats: DetailedChat[];
  messages: Record<number, WppMessage[]>;
  openedChat: DetailedChat | null;
  openedChatMessages: WppMessage[];
  openChat: (chat: DetailedChat) => void;
}

interface WhatsappProviderProps {
  children: ReactNode;
}

const WPP_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";

export const WhatsappContext = createContext({} as IWhatsappContext);

export default function WhatsappProvider({ children }: WhatsappProviderProps) {
  const { token } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [chats, setChats] = useState<DetailedChat[]>([]);
  const [openedChat, setOpenedChat] = useState<DetailedChat | null>(null);
  const [openedChatMessages, setOpenedChatMessages] = useState<WppMessage[]>([]);
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({});
  const api = useRef(new WhatsappClient(WPP_BASE_URL));

  const openChat = useCallback(
    (chat: DetailedChat) => {
      console.log(messages);
      setOpenedChat(chat);
      setOpenedChatMessages(messages[chat.contactId || 0] || []);
    },
    [messages],
  );
  

  useEffect(() => {
    api.current.setAuth(token || "");

    if (!token) {
      setChats([]);
    }

    if (token) {
      api.current.getChatsBySession(token, true, true).then((res) => {
        // Ultima mensagem de cada chat, para conseguir renderizar na lista de chats sem depender do estado de mensagens
        const lastMessages: Record<number, WppMessage> = {};
        const chatsMessages: Record<number, WppMessage[]> = {};

        for (const msg of res.data.messages) {
          const contactIdOrZero = msg.contactId || 0;

          if (!chatsMessages[contactIdOrZero]) {
            chatsMessages[contactIdOrZero] = [];
          }
          chatsMessages[contactIdOrZero].push(msg);

          if (
            !lastMessages[contactIdOrZero] ||
            msg.timestamp > lastMessages[contactIdOrZero].timestamp
          ) {
            lastMessages[contactIdOrZero] = msg;
          }
        }

        const detailedChats = res.data.chats.map((chat) => ({
          ...chat,
          isUnread: res.data.messages.some(
            (m) => m.contactId === chat.contactId && m.status !== "READ",
          ),
          lastMessage: chat.contactId ? lastMessages[chat.contactId] || null : null,
        })) as DetailedChat[];

        setChats(
          detailedChats.sort((a, b) =>
            (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
          ),
        );
        setMessages(chatsMessages);
      });
    }
  }, [token]);

  useEffect(() => {
    if (socket) {
      socket.on(SocketEventType.WppMessage, ({ message }) => {
        setMessages((prev) => {
          if (!prev[message.contactId || 0]) {
            prev[message.contactId || 0] = [];
          }

          prev[message.contactId || 0].push(message);

          return prev;
        });

        setChats((prev) =>
          prev
            .map((chat) => {
              if (chat.contactId === message.contactId) {
                return {
                  ...chat,
                  isUnread: true,
                  lastMessage: message,
                };
              }

              return chat;
            })
            .sort((a, b) =>
              (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
            ),
        );
      });

      socket.on(SocketEventType.WppChatStarted, (data) => {
        console.log(data);
      });
    }
  }, [socket]);

  return (
    <WhatsappContext.Provider
      value={{
        chats,
        messages,
        openedChat,
        openedChatMessages,
        openChat,
      }}
    >
      {children}
    </WhatsappContext.Provider>
  );
}
