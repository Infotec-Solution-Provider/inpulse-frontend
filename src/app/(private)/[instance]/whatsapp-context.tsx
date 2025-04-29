import {
  ActionDispatch,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  MonitorChat,
  SendMessageData,
  SocketEventType,
  WhatsappClient,
  WppChatsAndMessages,
  WppChatWithDetails,
  WppMessage,
} from "@in.pulse-crm/sdk";
import { AuthContext } from "@/app/auth-context";
import { SocketContext } from "./socket-context";
import processChatsAndMessages from "@/lib/process-chats-and-messages";
import MessageStatusHandler from "@/lib/event-handlers/message-status";
import ReceiveMessageHandler from "@/lib/event-handlers/message";
import ChatStartedHandler from "@/lib/event-handlers/chat-started";
import ReadChatHandler from "@/lib/event-handlers/read-chat";
import chatsFilterReducer, {
  ChangeFiltersAction,
  ChatsFiltersState,
} from "@/lib/reducers/chats-filter.reducer";
import { DetailedInternalChat } from "./internal-context";

export interface DetailedChat extends WppChatWithDetails {
  isUnread: boolean;
  lastMessage: WppMessage | null;
  chatType: "wpp";
}

interface IWhatsappContext {
  wppApi: React.RefObject<WhatsappClient>;
  chats: DetailedChat[];
  messages: Record<number, WppMessage[]>;
  sectors: { id: number; name: string }[];
  currentChat: DetailedChat | DetailedInternalChat | null;
  currentChatMessages: WppMessage[];
  openChat: (chat: DetailedChat) => void;
  setCurrentChat: (chat: DetailedChat | DetailedInternalChat | null) => void;
  sendMessage: (to: string, data: SendMessageData) => void;
  transferAttendance: (chatId: number, userId: number) => void;
  chatFilters: ChatsFiltersState;
  getChatsMonitor: () => void;
  changeChatFilters: ActionDispatch<[ChangeFiltersAction]>;
  finishChat: (chatId: number, resultId: number) => void;
  startChatByContactId: (contactId: number) => void;
  updateChatContact: (contactId: number, newName: string) => void;
  currentChatRef: React.RefObject<DetailedChat | DetailedInternalChat | null>;
  monitorChats: MonitorChat[];
}

interface WhatsappProviderProps {
  children: ReactNode;
}

const WPP_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";

export const WhatsappContext = createContext({} as IWhatsappContext);

export default function WhatsappProvider({ children }: WhatsappProviderProps) {
  const { token } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [chats, setChats] = useState<DetailedChat[]>([]); // Todas as conversas com detalhes (cliente e contato)
  const [currentChat, setCurrentChat] = useState<DetailedChat | DetailedInternalChat | null>(null); // Conversa que está aberta
  const currentChatRef = useRef<DetailedChat | DetailedInternalChat | null>(null); // Referência para a conversa atual
  const [currentChatMessages, setCurrentChatMessages] = useState<WppMessage[]>([]); // Mensagens da conversa aberta
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({}); // Mensagens de todas as conversas
  const [sectors, setSectors] = useState<{ id: number; name: string }[]>([]); // Setores do whatsapp
  const api = useRef(new WhatsappClient(WPP_BASE_URL)); // Instância do cliente do whatsapp
  const [monitorChats, setMonitorChats] = useState<MonitorChat[]>([]);

  // Reducer que controla os filtros de conversas
  const [chatFilters, changeChatFilters] = useReducer(chatsFilterReducer, {
    search: "",
    showingType: "all",
  });

  // Abre conversa
  const openChat = useCallback(
    (chat: DetailedChat) => {
      setCurrentChat(chat);
      setCurrentChatMessages(messages[chat.contactId || 0] || []);
      currentChatRef.current = chat;

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

  // Atualiza o nome do contato
  const updateChatContact = useCallback(
    (contactId: number, newName: string) => {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.contact && chat.contactId === contactId) {
            return {
              ...chat,
              contact: {
                ...chat.contact,
                name: newName,
              },
            };
          }
          return chat;
        }),
      );

      if (currentChat && currentChat.chatType === "wpp" && currentChat.contactId === contactId) {
        setCurrentChat((prev) => {
          (prev as DetailedChat)!.contact!.name = newName;
          return prev;
        });
      }
    },
    [currentChat],
  );

  // Finaliza uma conversa
  const finishChat = useCallback(
    (chatId: number, resultId: number) => {
      api.current.setAuth(token || "");
      api.current.finishChatById(chatId, resultId).then(() => {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      });
    },
    [api, token],
  );
  // Atualizar operador atendimento
  const transferAttendance = useCallback(
    (chatId: number, selectedUser: number) => {
      api.current.setAuth(token || "");
      api.current.transferAttendance(chatId, selectedUser).then(() => {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      });
    },
    [api, token],
  );

  const startChatByContactId = useCallback(
    (contactId: number) => {
      api.current.startChatByContactId(contactId);
    },
    [api, token],
  );

  // Envia mensagem
  const sendMessage = useCallback(async (to: string, data: SendMessageData) => {
    api.current.sendMessage(to, data);
  }, []);

  // Carregamento monitoria das conversas
  const getChatsMonitor = useCallback( () => {
    if (token) {
      api.current.setAuth(token);
       api.current.getChatsMonitor().then((res) => {
        if (res) {
          setMonitorChats(res);
          return { data: res };
        }
        else{
          setMonitorChats([]);
          return { data: [] };
        }
       });
    }

  }, [token]);

  // Carregamento inicial das conversas e mensagens
  useEffect(() => {
    if (typeof token === "string" && token.length > 0 && api.current) {
      api.current.setAuth(token);
      api.current.getChatsBySession(true, true).then(({ chats, messages }) => {
        const { chatsMessages, detailedChats } = processChatsAndMessages(chats, messages);

        setChats(detailedChats);
        setMessages(chatsMessages);
      });
      api.current.getSectors().then((res) => setSectors(res));
    } else {
      setChats([]);
      setMessages({});
    }
  }, [token, api.current]);

  // Atribui listeners para eventos de socket do whatsapp
  useEffect(() => {
    if (socket) {
      // Evento de conversa lida
      socket.on(
        SocketEventType.WppContactMessagesRead,
        ReadChatHandler(currentChatRef, setChats, setMessages, setCurrentChatMessages),
      );

      // Evento de nova conversa
      socket.on(
        SocketEventType.WppChatStarted,
        ChatStartedHandler(api.current, socket, setMessages, setChats),
      );

      // Evento de nova mensagem
      socket.on(
        SocketEventType.WppMessage,
        ReceiveMessageHandler(
          api.current,
          setMessages,
          setCurrentChatMessages,
          setChats,
          currentChatRef,
        ),
      );

      // Evento de status de mensagem
      socket.on(
        SocketEventType.WppMessageStatus,
        MessageStatusHandler(setMessages, setCurrentChatMessages, currentChatRef),
      );
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
        currentChat: currentChat,
        currentChatMessages: currentChatMessages,
        openChat,
        setCurrentChat,
        finishChat,
        startChatByContactId,
        sendMessage,
        wppApi: api,
        chatFilters,
        changeChatFilters,
        updateChatContact,
        sectors,
        currentChatRef,
        transferAttendance,
        getChatsMonitor,
        monitorChats,
      }}
    >
      {children}
    </WhatsappContext.Provider>
  );
}

export const useWhatsappContext = () => {
  const context = useContext(WhatsappContext);
  if (!context) {
    throw new Error("useWhatsappContext must be used within a WhatsappProvider");
  }
  return context;
};
