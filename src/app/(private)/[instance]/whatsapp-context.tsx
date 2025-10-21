import { AuthContext } from "@/app/auth-context";
import { SendTemplateData } from "@/lib/components/send-template-modal";
import ChatFinishedHandler from "@/lib/event-handlers/chat-finished";
import ChatStartedHandler from "@/lib/event-handlers/chat-started";
import ChatTransferHandler from "@/lib/event-handlers/chat-transfer";
import ReceiveMessageHandler from "@/lib/event-handlers/message";
import EditedMessageHandler from "@/lib/event-handlers/message-edit";
import MessageStatusHandler from "@/lib/event-handlers/message-status";
import ReadChatHandler from "@/lib/event-handlers/read-chat";
import processChatsAndMessages from "@/lib/process-chats-and-messages";
import chatsFilterReducer, {
  ChangeFiltersAction,
  ChatsFiltersState,
} from "@/lib/reducers/chats-filter.reducer";
import {
  AppNotification,
  Customer,
  ForwardMessagesData,
  SendMessageData,
  SocketEventType,
  WhatsappClient,
  WppChat,
  WppChatWithDetails,
  WppChatWithDetailsAndMessages,
  WppMessage,
  WppSchedule,
} from "@in.pulse-crm/sdk";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
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
import { toast } from "react-toastify";
import { DetailedInternalChat } from "./internal-context";
import { SocketContext } from "./socket-context";

export interface DetailedChat extends WppChatWithDetails {
  isUnread: boolean;
  lastMessage: WppMessage | null;
  chatType: "wpp";
}

export interface DetailedSchedule extends WppSchedule {
  customer: Customer | null;
}
interface GetNotificationsParams {
  page: number;
  pageSize: number;
}

interface GetNotificationsResponse {
  notifications: AppNotification[];
  totalCount: number;
}
interface IWhatsappContext {
  wppApi: React.RefObject<WhatsappClient>;
  chats: DetailedChat[];
  chat: WppChatWithDetailsAndMessages | undefined;
  messages: Record<number, WppMessage[]>;
  sectors: { id: number; name: string }[];
  currentChat: DetailedChat | DetailedInternalChat | null;
  currentChatMessages: WppMessage[];
  monitorSchedules: DetailedSchedule[];
  openChat: (chat: DetailedChat) => void;
  setCurrentChat: Dispatch<SetStateAction<DetailedChat | DetailedInternalChat | null>>;
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>;
  sendMessage: (to: string, data: SendMessageData) => Promise<void>;
  editMessage: (messageId: string, newText: string, isInternal?: boolean) => Promise<void>;
  forwardMessages: (data: ForwardMessagesData) => Promise<void>;

  transferAttendance: (chatId: number, userId: number) => Promise<void>;
  chatFilters: ChatsFiltersState;
  getChatsMonitor: () => void;
  getMonitorSchedules: () => void;
  changeChatFilters: ActionDispatch<[ChangeFiltersAction]>;
  finishChat: (chatId: number, resultId: number, triggerSatisfactionSurvey?: boolean) => void;
  startChatByContactId: (contactId: number, template?: SendTemplateData) => void;
  updateChatContact: (contactId: number, newName: string, newCustomer: Customer | null) => void;
  currentChatRef: React.RefObject<DetailedChat | DetailedInternalChat | null>;
  monitorChats: DetailedChat[];
  getChats: () => void;
  getChatById: (chatId: number) => void;
  createSchedule: (chat: WppChat, date: Date) => void;
  notifications: AppNotification[];
  getNotifications: (params: GetNotificationsParams) => Promise<GetNotificationsResponse>;
  markAllAsReadNotification: () => void;
  markAsReadNotificationById: (notificationId: number) => Promise<void>;
  templates: MessageTemplate[];
  parameters: Record<string, string>;
  loadChatMessages: (chat: DetailedChat) => Promise<void>;
}

interface WhatsappProviderProps {
  children: ReactNode;
}

export interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  text: string;
  source: string;
  raw: any;
}

export const WPP_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";
export const NOTIFICATIONS_PER_PAGE = 15;

export const WhatsappContext = createContext({} as IWhatsappContext);

export default function WhatsappProvider({ children }: WhatsappProviderProps) {
  const { token, instance, user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [chats, setChats] = useState<DetailedChat[]>([]);
  const [chat, setChat] = useState<WppChatWithDetailsAndMessages | undefined>();
  const [currentChat, setCurrentChat] = useState<DetailedChat | DetailedInternalChat | null>(null);
  const currentChatRef = useRef<DetailedChat | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<WppMessage[]>([]);
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({});
  const [sectors, setSectors] = useState<{ id: number; name: string }[]>([]);
  const api = useRef(new WhatsappClient(WPP_BASE_URL));
  const [monitorChats, setMonitorChats] = useState<DetailedChat[]>([]);
  const [monitorSchedules, setMonitorSchedules] = useState<DetailedSchedule[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [templates, setTemplates] = useState<Array<MessageTemplate>>([]);
  const [parameters, setParameters] = useState<Record<string, string>>({});

  function setUniqueCurrentChatMessages(update: SetStateAction<WppMessage[]>) {
    setCurrentChatMessages((prev) => {
      const next =
        typeof update === "function" ? (update as (p: WppMessage[]) => WppMessage[])(prev) : update;

      const seen = new Set<string | number>();
      const deduped: WppMessage[] = [];

      for (const msg of next || []) {
        const id = msg.id;
        if (id == null) {
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

  const [chatFilters, changeChatFilters] = useReducer(chatsFilterReducer, {
    search: "",
    showingType: "all",
    sortBy: "lastMessage",
    sortOrder: "desc",
  });

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

  const finishChat = useCallback(
    (chatId: number, resultId: number, triggerSatisfactionSurvey: boolean = false) => {
      api.current.setAuth(token || "");
      api.current.finishChatById(chatId, resultId, triggerSatisfactionSurvey);
      setMonitorChats((prev) => prev.filter((c) => c.id !== chatId));
    },
    [api, token],
  );

  const transferAttendance = useCallback(
    async(chatId: number, selectedUser: number) => {
      api.current.setAuth(token || "");
      await api.current.transferAttendance(chatId, selectedUser).then(() => {
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
    try {
      console.log("Sending message to", { to, data});
      await api.current.sendMessage(to, data);
    } catch (err) {
      toast.error(sanitizeErrorMessage(err));
    }
  }, []);

  const editMessage = useCallback(
    async (messageId: string, newText: string, isInternal: boolean = false) => {
      api.current.editMessage(messageId, newText, isInternal);
    },
    [],
  );

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

  const markAsReadNotificationById = useCallback(
    async (notificationId: number) => {
      try {
        if (!token) return;
        await api.current.markOneAsReadNotification(notificationId);
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)),
        );
      } catch {
        toast.error("Falha ao marcar notificação como lida!");
      }
    },
    [token],
  );

  const getNotifications = useCallback(
    async ({
      page,
      pageSize,
    }: {
      page: number;
      pageSize: number;
    }): Promise<{ notifications: AppNotification[]; totalCount: number }> => {
      if (!(typeof token === "string" && token.length > 0 && api.current)) {
        setNotifications([]);
        return { notifications: [], totalCount: 0 };
      }

      api.current.setAuth(token);

      const response = await api.current.getNotifications({ page, pageSize });

      const { notifications: newNotifications, totalCount } = response.data;

      if (page === 1) {
        setNotifications(newNotifications);
      } else {
        setNotifications((prevNotifications) => [...prevNotifications, ...newNotifications]);
      }

      return { notifications: newNotifications, totalCount };
    },
    [token, api.current],
  );

  const markAllAsReadNotification = useCallback(async () => {
    if (!(typeof token === "string" && token.length > 0 && api.current)) return;

    try {
      api.current.setAuth(token);
      await api.current.markAllAsReadNotification();

      setNotifications((prevNotifications) =>
        prevNotifications.map((notif) => ({
          ...notif,
          read: true,
        })),
      );
      toast.success("Todas as notificações foram marcadas como lidas.");
    } catch (error) {
      toast.error("Falha ao marcar as notificações como lidas.");
      console.error("Erro ao marcar notificações como lidas:", error);
    }
  }, [token, api.current]);

  const createSchedule = useCallback(async (chat: WppChat, date: Date) => {
    try {
      await api.current.createSchedule({
        contactId: chat.contactId!,
        scheduledFor: user!.CODIGO,
        sectorId: chat.sectorId!,
        date,
      });

      toast.success("Agendamento criado com sucesso!");
    } catch (err) {
      toast.error("Falha ao criar agendamento\n" + sanitizeErrorMessage(err));
      console.error("Falha ao criar agendamento", err);
    }
  }, []);

  const loadChatMessages = useCallback(async (chat: DetailedChat) => {
    if (!chat.id) return;

    if (chat.contactId && !messages[chat.contactId]) {
      const res = await api.current.getChatById(chat.id);
      setMessages((prev) => ({ ...prev, [chat.contactId || 0]: res.messages || [] }));
    }
  }, []);
  const getChatById = useCallback(async (chatId: number) => {
    if (!chatId) return;
    const res = await api.current.getChatById(chatId);
    setChat(res);
  }, []);
  const forwardMessages = useCallback(
    async (data: ForwardMessagesData) => {
      try {
        api.current.setAuth(token || "");
        await api.current.forwardMessages(data);
        toast.success("Mensagens encaminhadas com sucesso!");
      } catch (err) {
        const errorMessage = sanitizeErrorMessage(err);
        toast.error(`Falha ao encaminhar mensagens: ${errorMessage}`);
        console.error("Falha ao encaminhar mensagens", err);
      }
    },
    [token],
  );

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

      getNotifications({ page: 1, pageSize: NOTIFICATIONS_PER_PAGE });
      return () => {
        setChats([]);
        setMessages([]);
        setTemplates([]);
        setParameters({});
        setNotifications([]);
      };
    }
  }, [token, api.current, instance]);

  useEffect(() => {
    if (socket) {
      socket.on(
        SocketEventType.WppContactMessagesRead,
        ReadChatHandler(currentChatRef, setChats, setMessages, setUniqueCurrentChatMessages),
      );
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
          () => getNotifications({ page: 1, pageSize: NOTIFICATIONS_PER_PAGE }),
        ),
      );
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

      socket.on(
        SocketEventType.WppMessageEdit,
        EditedMessageHandler(setMessages, setUniqueCurrentChatMessages, currentChatRef),
      );

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

  useEffect(() => {
    console.log(sectors)
  }, [sectors])

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
        editMessage,
        forwardMessages,
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
        markAsReadNotificationById,
        getChatById,
        chat,
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
