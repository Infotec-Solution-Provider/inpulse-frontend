import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  SendMessageData,
  SocketEventType,
  WhatsappClient,
  WppChatWithDetails,
  WppMessage,
  WppMessageStatus,
} from "@in.pulse-crm/sdk";
import { AuthContext } from "@/app/auth-context";
import { SocketContext } from "./socket-context";
import processChatsAndMessages from "@/lib/process-chats-and-messages";
import { Formatter } from "@in.pulse-crm/utils";
import HorizontalLogo from "@/assets/img/hlogodark.png";

export interface DetailedChat extends WppChatWithDetails {
  isUnread: boolean;
  lastMessage: WppMessage | null;
}
interface IWhatsappContext {
  wppApi: WhatsappClient;
  chats: DetailedChat[];
  messages: Record<number, WppMessage[]>;
  openedChat: DetailedChat | null;
  openedChatMessages: WppMessage[];
  openChat: (chat: DetailedChat) => void;
  sendMessage: (to: string, data: SendMessageData) => void;
}

interface WhatsappProviderProps {
  children: ReactNode;
}

const WPP_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";

export const WhatsappContext = createContext({} as IWhatsappContext);

const types: Record<string, string> = {
  image: "Enviou uma imagem.",
  video: "Enviou um vídeo.",
  audio: "Enviou um áudio.",
  ptt: "Enviou uma mensagem de voz.",
  document: "Enviou um documento.",
  file: "Enviou um arquivo.",
};

function compareStatus(prevStatus: WppMessageStatus, newStatus: WppMessageStatus) {
  if (prevStatus === "PENDING") {
    return newStatus;
  }
  if (prevStatus === "SENT" && newStatus !== "PENDING") {
    return prevStatus;
  }
  if (prevStatus === "RECEIVED" && ["SENT", "PENDING"].includes(newStatus)) {
    return prevStatus;
  }
  if (prevStatus === "READ" && ["SENT", "PENDING", "RECEIVED"].includes(newStatus)) {
    return prevStatus;
  }

  return newStatus;
}

export default function WhatsappProvider({ children }: WhatsappProviderProps) {
  const { token } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [chats, setChats] = useState<DetailedChat[]>([]);
  const [openedChat, setOpenedChat] = useState<DetailedChat | null>(null);
  const [openedChatMessages, setOpenedChatMessages] = useState<WppMessage[]>([]);
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({});
  const api = useRef(new WhatsappClient(WPP_BASE_URL));
  const openedChatRef = useRef<DetailedChat | null>(null);

  const openChat = useCallback(
    (chat: DetailedChat) => {
      setOpenedChat(chat);
      setOpenedChatMessages(messages[chat.contactId || 0] || []);
      openedChatRef.current = chat;
      if (chat.contactId) {
        api.current.markContactMessagesAsRead(chat.contactId);

        setChats((prev) =>
          prev.map((c) => {
            if (c.id === chat.id) {
              return {
                ...c,
                isUnread: false,
              };
            }
            return c;
          }),
        );
      }
    },
    [messages],
  );

  const sendMessage = useCallback(async (to: string, data: SendMessageData) => {
    api.current.sendMessage(to, data);
  }, []);

  useEffect(() => {
    api.current.setAuth(token || "");

    if (token) {
      api.current.getChatsBySession(token, true, true).then(({ chats, messages }) => {
        const { chatsMessages, detailedChats } = processChatsAndMessages(chats, messages);

        setChats(detailedChats);
        setMessages(chatsMessages);
      });
    } else {
      setChats([]);
      setMessages({});
    }
  }, [token]);

  const handleContactMessagesRead = ({ contactId }: { contactId: number }) => {
    setMessages((prev) => {
      if (prev[contactId]) {
        prev[contactId] = prev[contactId].map((m) => {
          if (m.to.startsWith("me") && m.status !== "READ") {
            return {
              ...m,
              status: "READ",
            };
          }
          return m;
        });
      }
      return prev;
    });

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.contactId === contactId) {
          return {
            ...chat,
            isUnread: false,
          };
        }

        return chat;
      }),
    );

    if (openedChatRef.current && openedChatRef.current.contactId === contactId) {
      setOpenedChatMessages((prev) =>
        prev.map((m) => {
          if (m.to.startsWith("me") && m.status !== "READ") {
            return {
              ...m,
              status: "READ",
            };
          }
          return m;
        }),
      );
    }
  };

  const handleReceiveMessage = ({ message }: { message: WppMessage }) => {
    if (!message.from.startsWith("me") && !message.from.startsWith("system")) {
      new Notification(Formatter.phone(message.from), {
        body: message.type !== "chat" ? types[message.type] || "Enviou um arquivo" : message.body,
        icon: HorizontalLogo.src,
      });
    }

    setMessages((prev) => {
      const newMessages = { ...prev };
      const contactId = message.contactId || 0;

      if (!newMessages[contactId]) {
        newMessages[contactId] = [];
      }

      const findIndex = newMessages[contactId].findIndex((m) => m.id === message.id);
      if (findIndex === -1) {
        newMessages[contactId].push(message);
      } else {
        newMessages[contactId][findIndex] = message;
      }

      return newMessages;
    });

    setChats((prev) =>
      prev
        .map((chat) => {
          if (chat.contactId === message.contactId) {
            return {
              ...chat,
              isUnread: openedChatRef.current?.contactId !== message.contactId,
              lastMessage: message,
            };
          }

          return chat;
        })
        .sort((a, b) =>
          (a.lastMessage?.timestamp || 0) < (b.lastMessage?.timestamp || 0) ? 1 : -1,
        ),
    );

    if (openedChatRef.current && openedChatRef.current.contactId === message.contactId) {
      setOpenedChatMessages((prev) => {
        if (!prev.some((m) => m.id === message.id)) {
          return [...prev, message];
        }
        return prev;
      });

      // TODO: Change the logic to only update the received message;
      if (message.to.startsWith("me") && message.status !== "READ" && message.contactId) {
        api.current.markContactMessagesAsRead(message.contactId || 0);
      }
    }
  };

  // Handle chat started event (reviewd!)
  const handleChatStarted = async ({ chatId }: { chatId: number }) => {
    const { messages, ...chat } = await api.current.getChatById(chatId);
    const isUnread = messages.some((m) => m.contactId === chat.contactId && m.status !== "READ");
    const lastMessage = messages.find((m) => m.contactId === chat.contactId) || null;

    socket.joinRoom(`chat:${chat.id}`);

    new Notification("Novo atendimento!", {
      body: `Contato: ${chat.contact?.name || "Contato excluído"}`,
      icon: HorizontalLogo.src,
    });

    setMessages((prev) => {
      const newMessages = { ...prev };
      const contactId = chat.contactId || 0;

      if (!newMessages[contactId]) {
        newMessages[contactId] = messages;
      } else {
        newMessages[contactId] = [...newMessages[contactId], ...messages];
      }

      return newMessages;
    });

    setChats((prev) => {
      const chatIndex = prev.findIndex((c) => c.id === chat.id);
      if (chatIndex !== -1) {
        return prev;
      }
      return [{ ...chat, isUnread, lastMessage }, ...prev];
    });
  };

  const handleMessageStatus = ({
    messageId,
    contactId,
    status,
  }: {
    messageId: number;
    contactId: number;
    status: WppMessageStatus;
  }) => {
    setMessages((prev) => {
      const newMsgs = { ...prev };

      if (newMsgs[contactId]) {
        newMsgs[contactId] = newMsgs[contactId].map((m) => {
          if (m.id === messageId) {
            return {
              ...m,
              status: compareStatus(m.status, status),
            };
          }
          return m;
        });
      }

      return newMsgs;
    });
    if (openedChatRef.current && openedChatRef.current.contactId === contactId) {
      setOpenedChatMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            return {
              ...m,
              status: compareStatus(m.status, status),
            };
          }
          return m;
        }),
      );
    }
  };

  useEffect(() => {
    if (socket) {
      socket.on(SocketEventType.WppMessage, handleReceiveMessage);
      socket.on(SocketEventType.WppContactMessagesRead, handleContactMessagesRead);
      socket.on(SocketEventType.WppChatStarted, handleChatStarted);
      socket.on(SocketEventType.WppMessageStatus, handleMessageStatus);
    }

    return () => {
      if (socket) {
        socket.off(SocketEventType.WppMessage);
        socket.off(SocketEventType.WppChatStarted);
        socket.off(SocketEventType.WppContactMessagesRead);
      }
    };
  }, [socket]);

  return (
    <WhatsappContext.Provider
      value={{
        chats,
        messages,
        openedChat,
        openedChatMessages,
        openChat,
        sendMessage,
        wppApi: api.current,
      }}
    >
      {children}
    </WhatsappContext.Provider>
  );
}
