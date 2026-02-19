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
  FileDirType,
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
import { Logger, sanitizeErrorMessage } from "@in.pulse-crm/utils";
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
import filesService from "../../../lib/services/files.service";
import getFileSHA256 from "../../../lib/utils/get-file-sha256";

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

interface SendMessageOptions {
  sendAsChatOwner?: boolean;
  contactId: number;
  text: string;
  quotedId?: number | null;
  chatId?: number | null;
  file?: File;
  sendAsDocument?: boolean;
  sendAsAudio?: boolean;
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
  openChat: (chat: DetailedChat, preloadedMessages?: WppMessage[]) => void;
  setCurrentChat: Dispatch<SetStateAction<DetailedChat | DetailedInternalChat | null>>;
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>;
  sendMessage: (to: string, data: SendMessageOptions) => Promise<void>;
  editMessage: (messageId: string, newText: string, isInternal?: boolean) => Promise<void>;
  forwardMessages: (data: ForwardMessagesData) => Promise<void>;
  transferAttendance: (chatId: number, userId: number) => Promise<void>;
  chatFilters: ChatsFiltersState;
  getChatsMonitor: () => void;
  getMonitorSchedules: () => void;
  changeChatFilters: ActionDispatch<[ChangeFiltersAction]>;
  finishChat: (chatId: number, resultId: number, scheduleDate?: Date | null) => void;
  startChatByContactId: (contactId: number, template?: SendTemplateData) => Promise<any>;
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
  loadChatMessages: (chat: DetailedChat) => Promise<WppMessage[]>;
  globalChannel: React.RefObject<WppClient | null>;
  chatsChannels: React.RefObject<Map<number, number>>;
  channels: WppClient[];
  loaded: boolean;
  selectedChannel: WppClient | null;
  setSelectedChannel: Dispatch<SetStateAction<WppClient | null>>;
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

export interface WppClient {
  id: number;
  name: string;
  type: "WWEBJS" | "WABA" | "GUPSHUP";
}

interface SectorData {
  defaultClientId: number;
  id: number;
  instance: string;
  name: string;
  receiveChats: boolean;
  startChats: boolean;
}

export const WPP_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";
export const FILES_BASE_URL = process.env["NEXT_PUBLIC_FILES_URL"] || "http://localhost:8003";
export const NOTIFICATIONS_PER_PAGE = 15;
export const WhatsappContext = createContext({} as IWhatsappContext);

export default function WhatsappProvider({ children }: WhatsappProviderProps) {
  const { token, instance, user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [channels, setChannels] = useState<WppClient[]>([]);
  const globalChannel = useRef<WppClient | null>(null);
  const chatsChannels = useRef(new Map<number, number>());
  const userInitiatedChatContactId = useRef<number | null>(null);
  const [chats, setChats] = useState<DetailedChat[]>([]);
  const [chat, setChat] = useState<WppChatWithDetailsAndMessages | undefined>();
  const [currentChat, setCurrentChat] = useState<DetailedChat | DetailedInternalChat | null>(null);
  const currentChatRef = useRef<DetailedChat | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<WppMessage[]>([]);
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({});
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const api = useRef(new WhatsappClient(WPP_BASE_URL));
  const [monitorChats, setMonitorChats] = useState<DetailedChat[]>([]);
  const [monitorSchedules, setMonitorSchedules] = useState<DetailedSchedule[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [templates, setTemplates] = useState<Array<MessageTemplate>>([]);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [selectedChannel, setSelectedChannel] = useState<WppClient | null>(null);

  const [loaded, setLoaded] = useState(false);

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
    (chat: DetailedChat, preloadedMessages?: WppMessage[]) => {
      setCurrentChat(chat);
      // Se há mensagens pré-carregadas, usa elas; senão, pega do estado messages

      const messagesToUse =
        preloadedMessages !== undefined ? preloadedMessages : messages[chat.contactId || 0] || [];

      setUniqueCurrentChatMessages(messagesToUse);
      currentChatRef.current = chat;

      if (chat.contactId && globalChannel.current) {
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
    (chatId: number, resultId: number, scheduleDate?: Date | null) => {
      api.current.setAuth(token || "");

      console.log("scheduleDate", scheduleDate);
      api.current.finishChatById(chatId, resultId, scheduleDate);
      setMonitorChats((prev) => prev.filter((c) => c.id !== chatId));
    },
    [api, token],
  );

  const transferAttendance = useCallback(
    async (chatId: number, selectedUser: number) => {
      api.current.setAuth(token || "");
      await api.current.transferAttendance(chatId, selectedUser).then(() => {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));
        getChatsMonitor();
      });
    },
    [api, token],
  );

  const sendMessage = useCallback(
    async (to: string, data: SendMessageOptions) => {
      try {
        Logger.debug("sendMessage called", {
          to,
          hasFile: !!data.file,
          contactId: data.contactId,
          chatId: data.chatId,
          selectedChannelId: selectedChannel?.id,
          instance,
        });

        if (!instance) {
          Logger.debug("sendMessage aborted: instance not found");
          toast.error("Instância não encontrada. Recarregue a página e tente novamente.");
          return;
        }
        if (!selectedChannel) {
          Logger.debug("sendMessage aborted: selected channel not found");
          toast.error("Nenhum canal selecionado para enviar a mensagem.");
          return;
        }

        if (!data.file) {
          Logger.debug("sendMessage without file", {
            channelId: selectedChannel.id,
            to,
          });
          await api.current.sendMessage(String(selectedChannel.id), to, data);
          Logger.debug("sendMessage without file completed", {
            channelId: selectedChannel.id,
            to,
          });
          return;
        }

        Logger.debug("sendMessage with file: generating sha256", {
          fileName: data.file.name,
          fileType: data.file.type,
          fileSize: data.file.size,
        });
        const sha256 = await getFileSHA256(data.file);
        Logger.debug("sendMessage file hash generated", { sha256 });

        const res = await filesService.getFileByHash(instance, sha256);
        Logger.debug("sendMessage file lookup result", res);

        if (!!res.file) {
          const sendFileData = {
            contactId: data.contactId,
            text: data.text,
            chatId: data.chatId,
            fileId: res.file.id,
            quotedId: data.quotedId,
            sendAsAudio: !data.sendAsAudio,
            sendAsChatOwner: !data.sendAsChatOwner,
            sendAsDocument: !data.sendAsDocument,
          };
          Logger.debug("sendMessage using existing uploaded file", {
            channelId: selectedChannel.id,
            to,
            fileId: res.file.id,
          });
          await api.current.sendMessage(String(selectedChannel.id), to, sendFileData);
          Logger.debug("sendMessage with existing file completed", {
            channelId: selectedChannel.id,
            to,
            fileId: res.file.id,
          });

          return;
        }

        Logger.debug("sendMessage uploading new file", {
          fileName: data.file.name,
          fileType: data.file.type,
          fileSize: data.file.size,
        });

        const uploadFormData = new FormData();
        uploadFormData.append("instance", instance);
        uploadFormData.append("dirType", FileDirType.PUBLIC);
        uploadFormData.append("file", data.file, data.file.name);

        const { data: uploadResponse } = await api.current.ax.post(`${FILES_BASE_URL}/api/files`, uploadFormData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const uploadedFile = uploadResponse.data;
        Logger.debug("sendMessage file uploaded", {
          uploadedFileId: uploadedFile.id,
        });

        await api.current.sendMessage(String(selectedChannel.id), to, {
          contactId: data.contactId,
          text: data.text,
          chatId: data.chatId,
          fileId: uploadedFile.id,
          quotedId: data.quotedId,
          sendAsAudio: !data.sendAsAudio,
          sendAsChatOwner: !data.sendAsChatOwner,
          sendAsDocument: !data.sendAsDocument,
        });
        Logger.debug("sendMessage with uploaded file completed", {
          channelId: selectedChannel.id,
          to,
          uploadedFileId: uploadedFile.id,
        });
      } catch (err) {
        Logger.debug("sendMessage failed", {
          error: sanitizeErrorMessage(err),
          to,
          selectedChannelId: selectedChannel?.id,
          instance,
        });
        toast.error(sanitizeErrorMessage(err));
      }
    },
    [channels, selectedChannel],
  );

  const editMessage = useCallback(
    async (messageId: string, newText: string, isInternal: boolean = false) => {
      api.current.editMessage(String(globalChannel.current!.id), messageId, newText, isInternal);
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

      const response = await api.current.getNotifications({
        page,
        pageSize,
      });

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

  const createSchedule = useCallback(
    async (chat: WppChat, date: Date) => {
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
    },
    [user],
  );

  const loadChatMessages = useCallback(async (chat: DetailedChat) => {
    if (!chat.id) return [];

    if (chat.contactId) {
      const res = await api.current.getChatById(chat.id);
      const loadedMessages = res.messages || [];
      setMessages((prev) => ({ ...prev, [chat.contactId || 0]: loadedMessages }));
      return loadedMessages;
    }
    return [];
  }, []);

  const getChatById = useCallback(async (chatId: number) => {
    if (!chatId) return;
    const res = await api.current.getChatById(chatId);
    setChat(res);
    return res;
  }, []);

  const forwardMessages = useCallback(
    async (data: ForwardMessagesData) => {
      try {
        api.current.setAuth(token || "");
        await api.current.forwardMessages(String(globalChannel.current!.id), data);
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
        Logger.debug("Fetched chats ", { chats });
        const { chatsMessages, detailedChats } = processChatsAndMessages(chats, messages);

        setChats(detailedChats);
        setMessages(chatsMessages);
      });
    } else {
      setChats([]);
      setMessages({});
    }
  }, [token, api.current]);

  const startChatByContactId = useCallback(
    async (contactId: number, template?: SendTemplateData) => {
      api.current.setAuth(token || "");
      // Marca que o usuário iniciou este chat manualmente
      userInitiatedChatContactId.current = contactId;
      return api.current.startChatByContactId(contactId, template);
    },
    [api, token],
  );

  useEffect(() => {
    if (token?.length && api.current && user) {
      api.current.setAuth(token);
      api.current.getSectors().then((res) => {
        setSectors(res as SectorData[]);

        const secs = res as SectorData[];

        api.current.getChatsBySession(true, true).then(({ chats, messages }) => {
          const { chatsMessages, detailedChats } = processChatsAndMessages(chats, messages);
          Logger.debug("Initial fetch of chats ", { detailedChats });
          setChats(detailedChats);
          setMessages(chatsMessages);
        });

        const sector = secs.find((s) => s.id === user.SETOR);

        api.current.ax.get(`/api/whatsapp/sector/${user.SETOR}/clients`).then((res) => {
          const channelsData: WppClient[] = res.data.data;
          const defaultChannel = channelsData.find((ch) => ch.id === sector?.defaultClientId);
          globalChannel.current = defaultChannel || channelsData[0] || null;

          api.current.ax.get("/api/whatsapp/session/parameters").then(async (res) => {
            const parameters: Record<string, string> = res.data["parameters"];
            if (parameters["is_official"] === "true") {
              const templatesResponse = await api.current.ax.get(
                `/api/whatsapp/${globalChannel.current?.id}/templates`,
              );
              setTemplates(templatesResponse.data.templates);
            }
            setParameters(parameters);
          });

          setChannels(res.data.data);
          setLoaded(true);
        });

        getNotifications({ page: 1, pageSize: NOTIFICATIONS_PER_PAGE });
      });

      return () => {
        setChats([]);
        setMessages([]);
        setTemplates([]);
        setParameters({});
        setNotifications([]);
        setLoaded(false);
      };
    }
    // Removendo api.current das dependências para evitar loop infinito
  }, [token, instance, user]);

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
          userInitiatedChatContactId,
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
      const handleMessage = ReceiveMessageHandler(
        api.current,
        setMessages,
        setUniqueCurrentChatMessages,
        setChats,
        currentChatRef,
        chats,
      );
      socket.on(SocketEventType.WppMessage, (data: { message: WppMessage }) => {
        handleMessage(data);

        // Auto-update per-chat channel based on incoming message
        const { message } = data;
        if (message.clientId) {
          const matchedChat = chats.find((c) => c.contactId === message.contactId);
          if (matchedChat) {
            chatsChannels.current.set(matchedChat.id, message.clientId);
          }

          const current = currentChatRef.current;
          if (current && current.chatType === "wpp" && current.contactId === message.contactId) {
            const channel = channels.find((ch) => ch.id === message.clientId);
            if (channel) {
              setSelectedChannel(channel);
            }
          }
        }
      });

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
        channels,
        globalChannel,
        chatsChannels,
        loaded,
        selectedChannel,
        setSelectedChannel,
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
