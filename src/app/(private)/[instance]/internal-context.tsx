import { createContext, useState, useEffect, useRef, useCallback, useContext } from "react";
import {
  InternalChat,
  InternalChatClient,
  InternalChatMember,
  InternalMessage,
  InternalSendMessageData,
  SocketEventType,
  User,
} from "@in.pulse-crm/sdk";
import { AuthContext } from "@/app/auth-context";
import { SocketContext } from "./socket-context";
import InternalChatStartedHandler from "@/lib/event-handlers/internal-chat-started";
import InternalMessageStatusHandler from "@/lib/event-handlers/internal-message-status";
import InternalReceiveMessageHandler from "@/lib/event-handlers/internal-message";
import processInternalChatsAndMessages from "@/lib/process-internal-chats-and-messages";
import usersService from "@/lib/services/users.service";
import { DetailedChat, useWhatsappContext } from "./whatsapp-context";
import InternalChatFinishedHandler from "@/lib/event-handlers/internal-chat-finished";
import { toast } from "react-toastify";
import { ContactsContext } from "./(cruds)/contacts/contacts-context";

export interface DetailedInternalChat extends InternalChat {
  lastMessage: InternalMessage | null;
  chatType: "internal";
  isUnread: boolean | true;
  users: User[];
  participants: InternalChatMember[];
}

interface InternalChatContextType {
  internalApi: React.RefObject<InternalChatClient>;
  internalChats: DetailedInternalChat[];
  messages: Record<number, InternalMessage[]>;
  sendInternalMessage: (data: InternalSendMessageData) => void;
  openInternalChat: (chat: DetailedInternalChat, markAsRead?: boolean) => void;
  startDirectChat: (userId: number) => void;
  setCurrentChat: (chat: DetailedChat | DetailedInternalChat | null) => void;
  monitorInternalChats: DetailedInternalChat[];
  currentInternalChatMessages: InternalMessage[];
  getInternalChatsMonitor: () => void;
  monitorMessages: Record<number, InternalMessage[]>;
  deleteInternalChat: (id: number) => Promise<void>;

  users: User[];
}

const INTENAL_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";

export const InternalChatContext = createContext({} as InternalChatContextType);

export default function useInternalChatContext() {
  const context = useContext(InternalChatContext);

  if (!context) {
    throw new Error("useInternalChatContext must be used within an InternalChatProvider");
  }
  return context;
}

export function InternalChatProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useContext(SocketContext);

  const {
    setCurrentChat,
    currentChatRef,
    setCurrentChatMessages: setWppCurrMsgs,
    chats: wppChats,
  } = useWhatsappContext();

  const [internalChats, setInternalChats] = useState<DetailedInternalChat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Record<number, InternalMessage[]>>({});
  const [monitorInternalChats, setMonitorInternalChats] = useState<DetailedInternalChat[]>([]);
  const [monitorMessages, setMonitorMessages] = useState<Record<number, InternalMessage[]>>({});
  const { contacts } = useContext(ContactsContext);

  const [currentInternalChatMessages, setCurrentChatMessages] = useState<InternalMessage[]>([]);
  const api = useRef(new InternalChatClient(INTENAL_BASE_URL));
  const { token, user } = useContext(AuthContext);

  useEffect(() => {
    const originalTitle = "InPulse";
    const chats = [...internalChats, ...wppChats];
    const unreadChats = chats.filter((chat) => chat.isUnread);

    if (unreadChats.length > 0) {
      document.title = `🔔 InPulse (${unreadChats.length})`;
    } else {
      document.title = originalTitle;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [internalChats, wppChats]);

  const openInternalChat = useCallback(
    (chat: DetailedInternalChat, markAsRead: boolean = true) => {
      setCurrentChat(chat);
      setCurrentChatMessages(messages[chat.id] || monitorMessages[chat.id] || []);
      setWppCurrMsgs([]);
      currentChatRef.current = chat as unknown as DetailedChat;

      if (markAsRead) {
        api.current.markChatMessagesAsRead(chat.id);

        setInternalChats((prev) =>
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
  const deleteInternalChat = async (id: number) => {
    if (api.current) {
      try {
        await api.current.deleteInternalChat(id);
        toast.success("Chat deletado com sucesso!");
        setInternalChats((prev) => prev.filter((chat) => chat.id !== id));
      } catch (error) {
        toast.error("Erro ao deletar Chat");
      }
    }
  };
  const sendInternalMessage = useCallback(
    (data: InternalSendMessageData) => {
      if (token) {
        api.current.setAuth(token);
        api.current.sendMessageToInternalChat(data);
      }
    },
    [token],
  );

  useEffect(() => {
    if (token && users.length === 0) {
      usersService.setAuth(token);
      usersService.getUsers({ perPage: "999" }).then((res) => setUsers(res.data));
    }
    if (token && user && users.length > 0) {
      api.current.setAuth(token);
      api.current.getInternalChatsBySession().then(({ chats, messages }) => {
        const { chatsMessages, detailedChats } = processInternalChatsAndMessages(
          user!.CODIGO,
          users,
          chats || [],
          messages || [],
        );

        setInternalChats(detailedChats || []);
        setMessages(chatsMessages || []);
      });
    } else {
      setInternalChats([]);
      setMessages({});
    }
  }, [token, api.current, user, users]);

  const startDirectChat = useCallback(
    (userId: number) => {
      if (!token || !user) return;
      api.current.createInternalChat([userId, user!.CODIGO], false, "");
    },
    [api, token, user],
  );
  // Carregamento monitoria das conversas
  const getInternalChatsMonitor = useCallback(() => {
    if (token && user && users.length > 0) {
      api.current.setAuth(token);

      api.current.getInternalChatsMonitor().then(({ chats, messages }) => {
        console.log("Monitorando conversas internas", chats, messages);

        const { chatsMessages, detailedChats } = processInternalChatsAndMessages(
          user!.CODIGO,
          users,
          chats || [],
          messages || [],
        );

        setMonitorInternalChats(detailedChats || []);
        setMonitorMessages(chatsMessages || []);
      });
    } else {
      setInternalChats([]);
      setMonitorMessages({});
    }
  }, [token, api.current, user, users]);

  useEffect(() => {
    if (socket && user && users.length > 0) {
      // Evento de nova conversa
      socket.on(
        SocketEventType.InternalChatStarted,
        InternalChatStartedHandler(
          socket,
          users,
          setInternalChats,
          setMessages,
          user,
          openInternalChat,
        ),
      );

      socket.on(
        SocketEventType.InternalChatFinished,
        InternalChatFinishedHandler(
          socket,
          internalChats,
          currentChatRef,
          setMessages,
          setInternalChats,
          setCurrentChat,
          setCurrentChatMessages,
        ),
      );

      // Evento de nova mensagem
      socket.on(
        SocketEventType.InternalMessage,
        InternalReceiveMessageHandler(
          api.current,
          setMessages,
          setCurrentChatMessages,
          setInternalChats,
          currentChatRef,
          users,
          contacts,
          user!,
        ),
      );

      // Evento de status de mensagem
      socket.on(
        SocketEventType.InternalMessageStatus,
        InternalMessageStatusHandler(setMessages, setCurrentChatMessages, currentChatRef),
      );

      return () => {
        socket.off(SocketEventType.InternalChatStarted);
        socket.off(SocketEventType.InternalMessage);
        socket.off(SocketEventType.InternalMessageStatus);
        socket.off(SocketEventType.InternalChatFinished);
      };
    }
  }, [socket, user, users, currentInternalChatMessages]);

  return (
    <InternalChatContext.Provider
      value={{
        internalApi: api,
        internalChats,
        messages,
        setCurrentChat,
        sendInternalMessage,
        startDirectChat,
        openInternalChat,
        currentInternalChatMessages,
        users,
        monitorInternalChats,
        getInternalChatsMonitor,
        monitorMessages,
        deleteInternalChat,
      }}
    >
      {children}
    </InternalChatContext.Provider>
  );
}
