import {
  ActionDispatch,
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Customer,
  SendMessageData,
  SocketEventType,
  WhatsappClient,
  WppChat,
  WppChatWithDetails,
  WppMessage,
  WppSchedule,
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
import ChatFinishedHandler from "@/lib/event-handlers/chat-finished";
import { toast } from "react-toastify";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import ChatTransferHandler from "@/lib/event-handlers/chat-transfer";
import { AppNotification } from "@/lib/types/app-notification.type";
import { SendTemplateData } from "@/lib/components/send-template-modal";

export interface DetailedChat extends WppChatWithDetails {
  isUnread: boolean;
  lastMessage: WppMessage | null;
  chatType: "wpp";
}

export interface DetailedSchedule extends WppSchedule {
  customer: Customer | null;
}

interface IWhatsappContext {
  wppApi: React.RefObject<WhatsappClient>;
  chats: DetailedChat[];
  messages: Record<number, WppMessage[]>;
  sectors: { id: number; name: string }[];
  currentChat: DetailedChat | DetailedInternalChat | null;
  currentChatMessages: WppMessage[];
  monitorSchedules: DetailedSchedule[];
  openChat: (chat: DetailedChat) => void;
  setCurrentChat: Dispatch<SetStateAction<DetailedChat | DetailedInternalChat | null>>;
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>;
  sendMessage: (to: string, data: SendMessageData) => void;
  transferAttendance: (chatId: number, userId: number) => void;
  chatFilters: ChatsFiltersState;
  getChatsMonitor: () => void;
  getMonitorSchedules: () => void;
  changeChatFilters: ActionDispatch<[ChangeFiltersAction]>;
  finishChat: (chatId: number, resultId: number) => void;
  startChatByContactId: (contactId: number, template?: SendTemplateData) => void;
  updateChatContact: (contactId: number, newName: string, newCustomer: Customer | null) => void;
  currentChatRef: React.RefObject<DetailedChat | DetailedInternalChat | null>;
  monitorChats: DetailedChat[];
  getChats: () => void;
  createSchedule: (chat: WppChat, date: Date) => void;
  notifications: AppNotification[];
  getNotifications: () => void;
  markAllAsReadNotification: () => void;
  templates: MessageTemplate[];
  parameters: Record<string, string>;
  loadChatMessages: (chat: DetailedChat) => void;
}

interface WhatsappProviderProps {
  children: ReactNode;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  text: string;
}

export const WPP_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";

export const WhatsappContext = createContext({} as IWhatsappContext);

export default function WhatsappProvider({ children }: WhatsappProviderProps) {
  const { token, instance } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [chats, setChats] = useState<DetailedChat[]>([]); // Todas as conversas com detalhes (cliente e contato)
  const [currentChat, setCurrentChat] = useState<DetailedChat | DetailedInternalChat | null>(null); // Conversa que está aberta
  const currentChatRef = useRef<DetailedChat | null>(null); // Referência para a conversa atual
  const [currentChatMessages, setCurrentChatMessages] = useState<WppMessage[]>([]); // Mensagens da conversa aberta
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({}); // Mensagens de todas as conversas
  const [sectors, setSectors] = useState<{ id: number; name: string }[]>([]); // Setores do whatsapp
  const api = useRef(new WhatsappClient(WPP_BASE_URL)); // Instância do cliente do whatsapp
  const [monitorChats, setMonitorChats] = useState<DetailedChat[]>([]);
  const [monitorSchedules, setMonitorSchedules] = useState<DetailedSchedule[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [templates, setTemplates] = useState<Array<MessageTemplate>>([]);
  const [parameters, setParameters] = useState<Record<string, string>>({});

  //setCurrentChatMessagesWrapper
  function setUniqueCurrentChatMessages(update: SetStateAction<WppMessage[]>) {
    setCurrentChatMessages((prev) => {
      const next =
        typeof update === "function" ? (update as (p: WppMessage[]) => WppMessage[])(prev) : update;

      const seen = new Set<string | number>();
      const deduped: WppMessage[] = [];

      for (const msg of next || []) {
        const id = (msg as any)?.id;
        if (id == null) {
          // Se não houver id, mantemos a mensagem
          deduped.push(msg);
          continue;
        }
        if (!seen.has(id)) {
          seen.add(id);
          deduped.push(msg);
        }
      }

      return deduped;
    });
  }

  // Reducer que controla os filtros de conversas
  const [chatFilters, changeChatFilters] = useReducer(chatsFilterReducer, {
    search: "",
    showingType: "all",
  });

  // Abre conversa
  const openChat = useCallback(
    (chat: DetailedChat) => {
      setCurrentChat(chat);
      setUniqueCurrentChatMessages(messages[chat.contactId || 0] || []);
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
    (contactId: number, newName: string, newCustomer: Customer | null) => {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.contact && chat.contactId === contactId) {
            return {
              ...chat,
              contact: {
                ...chat.contact,
                name: newName,
              },
              customer: newCustomer,
            };
          }
          return chat;
        }),
      );

      if (currentChat && currentChat.chatType === "wpp" && currentChat.contactId === contactId) {
        setCurrentChat((prev) => {
          (prev as DetailedChat)!.contact!.name = newName;
          (prev as DetailedChat)!.customer = newCustomer;
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
      api.current.finishChatById(chatId, resultId);
      setMonitorChats((prev) => prev.filter((c) => c.id !== chatId));
    },
    [api, token],
  );
  // Atualizar operador atendimento
  const transferAttendance = useCallback(
    (chatId: number, selectedUser: number) => {
      api.current.setAuth(token || "");
      api.current.transferAttendance(chatId, selectedUser).then(() => {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));
        getChatsMonitor();
      });
    },
    [api, token],
  );

  const startChatByContactId = useCallback(
    (contactId: number, template?: SendTemplateData) => {
      api.current.startChatByContactId(contactId, template);
    },
    [api, token],
  );

  const sendMessage = useCallback(async (to: string, data: SendMessageData) => {
    api.current.sendMessage(to, data);
  }, []);

  // Carregamento monitoria das conversas
  const getChatsMonitor = useCallback(() => {
    if (typeof token === "string" && token.length > 0 && api.current) {
      api.current.setAuth(token);
      api.current.getChatsMonitor().then(({ chats, messages }) => {
        const { chatsMessages, detailedChats } = processChatsAndMessages(chats, messages);

        setMonitorChats(detailedChats);
        setMessages(chatsMessages);
      });
    } else {
      setMonitorChats([]);
      setMessages({});
    }
  }, [token, api.current]);

  const getMonitorSchedules = useCallback(() => {
    if (typeof token === "string" && token.length > 0 && api.current) {
      api.current.setAuth(token);
      api.current.getSchedules().then((res) => {
        setMonitorSchedules(res.data as DetailedSchedule[]);
      });
    } else {
      setMonitorSchedules([]);
    }
  }, [token, api.current]);
  // Buscar notificações do usuario

  const getNotifications = useCallback(() => {
    if (typeof token === "string" && token.length > 0 && api.current) {
      api.current.setAuth(token);
      api.current.getNotifications().then((res) => {
        setNotifications(res as AppNotification[]);
      });
    } else {
      setMonitorSchedules([]);
    }
  }, [token, api.current]);

  const markAllAsReadNotification = useCallback(() => {
    if (typeof token === "string" && token.length > 0 && api.current) {
      api.current.setAuth(token);
      api.current.markAllAsReadNotification().then((res) => {
        getNotifications();
      });
    }
  }, [token, api.current]);

  const createSchedule = useCallback(async (chat: WppChat, date: Date) => {
    try {
      await api.current.createSchedule({
        contactId: chat.contactId!,
        scheduledFor: chat.userId!,
        sectorId: chat.sectorId!,
        date,
      });

      toast.success("Agendamento criado com sucesso!");
    } catch (err) {
      toast.error("Falha ao criar agendamento\n" + sanitizeErrorMessage(err));
      console.error("Falha ao criar agendamento", err);
    }
  }, []);

  const loadChatMessages = useCallback(
    async (chat: DetailedChat) => {
      if (!chat.id) return;

      if (chat.contactId && !messages[chat.contactId]) {
        const res = await api.current.getChatById(chat.id);

        setMessages((prev) => ({ ...prev, [chat.contactId || 0]: res.messages || [] }));
      }
    },
    [messages],
  );

  // Função para obter e processar as conversas e mensagens
  const getChats = useCallback(() => {
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

  // Carregamento inicial das conversas e mensagens
  useEffect(() => {
    if (typeof token === "string" && token.length > 0 && api.current) {
      api.current.setAuth(token);
      api.current.ax.get("/api/whatsapp/session/parameters").then(async (res) => {
        const parameters: Record<string, string> = res.data["parameters"];

        if (parameters["is_official"] === "true") {
          const templatesResponse = await api.current.ax.get("/api/whatsapp/templates");
          setTemplates(templatesResponse.data.templates);
        }
        setParameters(parameters);
      });

      api.current.getChatsBySession(true, true).then(({ chats, messages }) => {
        const { chatsMessages, detailedChats } = processChatsAndMessages(chats, messages);

        setChats(detailedChats);
        setMessages(chatsMessages);
      });

      api.current.getSectors().then((res) => setSectors(res));
      getNotifications();

      return () => {
        setChats([]);
        setMessages([]);
        setTemplates([]);
        setParameters({});
        setNotifications([]);
      };
    }
  }, [token, api.current, instance]);

  // Atribui listeners para eventos de socket do whatsapp
  useEffect(() => {
    if (socket) {
      // Evento de conversa lida
      socket.on(
        SocketEventType.WppContactMessagesRead,
        ReadChatHandler(currentChatRef, setChats, setMessages, setUniqueCurrentChatMessages),
      );

      // Evento de nova conversa
      socket.on(
        SocketEventType.WppChatStarted,
        ChatStartedHandler(
          api.current,
          socket,
          setMessages,
          setChats,
          setCurrentChat,
          setUniqueCurrentChatMessages,
        ),
      );

      // Evento de conversa finalizada
      socket.on(
        SocketEventType.WppChatFinished,
        ChatFinishedHandler(
          socket,
          chats,
          currentChat,
          setMessages,
          setChats,
          setCurrentChat,
          setUniqueCurrentChatMessages,
          getNotifications,
        ),
      );

      // Evento de conversa transferido
      socket.on(
        SocketEventType.WppChatTransfer,
        ChatTransferHandler(
          api.current,
          socket,
          chats,
          currentChat,
          setMessages,
          setChats,
          setCurrentChat,
          setUniqueCurrentChatMessages,
        ),
      );

      // Evento de nova mensagem
      socket.on(
        SocketEventType.WppMessage,
        ReceiveMessageHandler(
          api.current,
          setMessages,
          setUniqueCurrentChatMessages,
          setChats,
          currentChatRef,
          chats,
        ),
      );

      // Evento de status de mensagem
      socket.on(
        SocketEventType.WppMessageStatus,
        MessageStatusHandler(setMessages, setUniqueCurrentChatMessages, currentChatRef),
      );

      return () => {
        socket.off(SocketEventType.WppMessage);
        socket.off(SocketEventType.WppChatStarted);
        socket.off(SocketEventType.WppContactMessagesRead);
      };
    }
  }, [socket, chats, currentChat]);

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
        setCurrentChatMessages: setUniqueCurrentChatMessages,
        wppApi: api,
        chatFilters,
        changeChatFilters,
        updateChatContact,
        sectors,
        currentChatRef,
        transferAttendance,
        getChatsMonitor,
        monitorChats,
        getChats,
        createSchedule,
        getMonitorSchedules,
        monitorSchedules,
        notifications,
        getNotifications,
        markAllAsReadNotification,
        templates,
        parameters,
        loadChatMessages,
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
