import { AuthContext } from "@/app/auth-context";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import { SendTemplateData } from "@/lib/components/send-template-modal";
import ChatFinishedHandler from "@/lib/event-handlers/chat-finished";
import ChatStartedHandler from "@/lib/event-handlers/chat-started";
import ChatTransferHandler from "@/lib/event-handlers/chat-transfer";
import ReceiveMessageHandler from "@/lib/event-handlers/message";
import EditedMessageHandler from "@/lib/event-handlers/message-edit";
import MessageDeleteHandler from "@/lib/event-handlers/message-delete";
import MessageReactionHandler from "@/lib/event-handlers/message-reaction";
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
  UserNotificationPreferences,
  WhatsappClient,
  WppChat,
  WppChatWithDetails,
  WppChatWithDetailsAndMessages,
  WppMessage,
  WppSchedule,
} from "@/lib/sdk-local";
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
import usersService from "../../../lib/services/users.service";
import { dispatchConfiguredNotification } from "../../../lib/utils/notification-dispatch";
import {
  createDefaultNotificationPreferences,
  normalizeNotificationPreferences,
  shouldDispatchNotification,
} from "../../../lib/utils/notification-preferences";
import {
  createFileUploadTraceId,
  logFileUploadTrace,
  logFileUploadTraceError,
} from "../../../lib/utils/file-upload-trace";
import getFileSHA256 from "../../../lib/utils/get-file-sha256";
import FrontendPerformanceProvider from "@/lib/performance/frontend-performance-provider";
import { measureFrontendInteraction } from "@/lib/performance/frontend-performance";
import { useFrontendRenderMetric } from "@/lib/performance/use-frontend-render-metric";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
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
  readyMessageId?: number;
  sendAsDocument: boolean;
  sendAsAudio: boolean;
}

interface TracedSendMessageOptions extends SendMessageOptions {
  fileId?: number;
  traceId?: string;
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
  notificationPreferences: UserNotificationPreferences;
  updateNotificationPreferences: (payload: Partial<UserNotificationPreferences>) => Promise<void>;
  refreshNotificationPreferences: () => Promise<void>;
  templates: MessageTemplate[];
  parameters: Record<string, string>;
  loadChatMessages: (chat: DetailedChat) => Promise<WppMessage[]>;
  globalChannel: React.RefObject<WppClient | null>;
  chatsChannels: React.RefObject<Map<number, number>>;
  channels: WppClient[];
  loaded: boolean;
  selectedChannel: WppClient | null;
  setSelectedChannel: Dispatch<SetStateAction<WppClient | null>>;
  isReadOnlyMode: boolean;
  prepareReadOnlyOpen: (enabled: boolean) => void;
  hasOlderMessages: boolean;
  loadOlderMessages: () => Promise<number>;
  historyPrependRef: React.RefObject<boolean>;
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
export const FILES_BASE_URL =
  process.env["NEXT_PUBLIC_FILES_URL"] || "https://inpulse.infotecrs.inf.br";
export const NOTIFICATIONS_PER_PAGE = 15;
export const WhatsappContext = createContext({} as IWhatsappContext);

export default function WhatsappProvider({ children }: WhatsappProviderProps) {
  useFrontendRenderMetric("WhatsappProvider");
  const renderStartedAt = Date.now();
  const { token, instance, user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [channels, setChannels] = useState<WppClient[]>([]);
  const channelsRef = useRef<WppClient[]>([]);
  const globalChannel = useRef<WppClient | null>(null);
  const chatsChannels = useRef(new Map<number, number>());
  const userInitiatedChatContactId = useRef<number | null>(null);
  const [chats, setChats] = useState<DetailedChat[]>([]);
  const chatsRef = useRef<DetailedChat[]>([]);
  const [chat, setChat] = useState<WppChatWithDetailsAndMessages | undefined>();
  const [currentChat, setCurrentChat] = useState<DetailedChat | DetailedInternalChat | null>(null);
  const currentChatRef = useRef<DetailedChat | DetailedInternalChat | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<WppMessage[]>([]);
  const currentChatMessagesRef = useRef<WppMessage[]>([]);
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({});
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const currentMessagesCursorRef = useRef<number | null>(null);
  const messageCursorCacheRef = useRef(new Map<number, number | null>());
  const historyPrependRef = useRef(false);
  const activeMessagesCacheRef = useRef(new Map<number, WppMessage[]>());
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const api = useRef(new WhatsappClient(WPP_BASE_URL));
  const [monitorChats, setMonitorChats] = useState<DetailedChat[]>([]);
  const [monitorSchedules, setMonitorSchedules] = useState<DetailedSchedule[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [templates, setTemplates] = useState<Array<MessageTemplate>>([]);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const paginatedChatHistoryEnabled = isFeatureEnabled(
    parameters,
    FEATURE_FLAGS.paginatedChatHistory,
  );
  const stableSocketListenersEnabled = isFeatureEnabled(
    parameters,
    FEATURE_FLAGS.stableSocketListeners,
  );
  chatsRef.current = chats;
  channelsRef.current = channels;
  currentChatRef.current = currentChat;
  const [selectedChannel, setSelectedChannel] = useState<WppClient | null>(null);
  const [notificationPreferences, setNotificationPreferences] =
    useState<UserNotificationPreferences>(createDefaultNotificationPreferences());
  const notificationPreferencesRef = useRef<UserNotificationPreferences>(
    createDefaultNotificationPreferences(),
  );

  const sendTracedFileMessage = useCallback(
    async (clientId: number, to: string, data: TracedSendMessageOptions) => {
      const formData = new FormData();

      formData.append("to", to);
      formData.append("text", data.text);
      formData.append("contactId", String(data.contactId));
      data.quotedId && formData.append("quotedId", String(data.quotedId));
      data.chatId && formData.append("chatId", String(data.chatId));
      data.fileId && formData.append("fileId", String(data.fileId));
      data.sendAsAudio && formData.append("sendAsAudio", "true");
      data.sendAsDocument && formData.append("sendAsDocument", "true");
      data.sendAsChatOwner && formData.append("sendAsChatOwner", String(data.sendAsChatOwner));
      data.traceId && formData.append("traceId", data.traceId);

      await api.current.ax.post(`/api/whatsapp/${clientId}/messages`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(data.traceId ? { "x-upload-trace-id": data.traceId } : {}),
        },
      });
    },
    [],
  );
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);
  const pendingReadOnlyOpenRef = useRef(false);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    notificationPreferencesRef.current = notificationPreferences;
  }, [notificationPreferences]);

  const refreshNotificationPreferences = useCallback(async () => {
    if (!token || !user) {
      setNotificationPreferences(createDefaultNotificationPreferences());
      return;
    }

    usersService.setAuth(token);

    try {
      const data = await usersService.getUserNotificationPreferences(user.CODIGO);
      setNotificationPreferences(normalizeNotificationPreferences(data));
    } catch {
      setNotificationPreferences(createDefaultNotificationPreferences());
    }
  }, [token, user]);

  const updateNotificationPreferences = useCallback(
    async (payload: Partial<UserNotificationPreferences>) => {
      if (!token || !user) {
        throw new Error("Sessão indisponível para salvar preferências de notificação.");
      }

      usersService.setAuth(token);
      const updated = await usersService.upsertUserNotificationPreferences(user.CODIGO, payload);
      setNotificationPreferences(normalizeNotificationPreferences(updated));
    },
    [token, user],
  );

  const emitPolicyNotification = useCallback(
    (payload: {
      event: keyof UserNotificationPreferences["events"];
      title: string;
      body: string;
      isChatFocused: boolean;
    }) => {
      const prefs = notificationPreferencesRef.current;

      if (
        !shouldDispatchNotification(prefs, {
          event: payload.event,
          isChatFocused: payload.isChatFocused,
        })
      ) {
        return;
      }

      dispatchConfiguredNotification(prefs, payload.event, {
        title: payload.title,
        body: payload.body,
        icon: HorizontalLogo.src,
      });
    },
    [],
  );

  const prepareReadOnlyOpen = useCallback((enabled: boolean) => {
    pendingReadOnlyOpenRef.current = enabled;
  }, []);

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

      currentChatMessagesRef.current = deduped;
      return deduped;
    });
  }

  const cacheActiveMessages = useCallback(
    (contactId: number, loadedMessages: WppMessage[], cursor: number | null) => {
      const deduplicated = Array.from(
        new Map(loadedMessages.map((message) => [message.id, message])).values(),
      );
      const boundedMessages = deduplicated.slice(-300);
      const effectiveCursor =
        deduplicated.length > boundedMessages.length ? (boundedMessages[0]?.id ?? cursor) : cursor;
      const cache = activeMessagesCacheRef.current;

      cache.delete(contactId);
      cache.set(contactId, boundedMessages);
      messageCursorCacheRef.current.set(contactId, effectiveCursor);

      const evicted: number[] = [];
      while (cache.size > 5) {
        const oldestKey = cache.keys().next().value as number | undefined;
        if (oldestKey === undefined) break;
        cache.delete(oldestKey);
        messageCursorCacheRef.current.delete(oldestKey);
        evicted.push(oldestKey);
      }

      if (evicted.length) {
        setMessages((previous) => {
          const next = { ...previous };
          for (const key of evicted) delete next[key];
          return next;
        });
      }

      return effectiveCursor;
    },
    [],
  );

  const loadFirstMessagePage = useCallback(
    async (chat: DetailedChat) => {
      if (!chat.contactId) return [];
      const page = await api.current.getChatMessagesPage(chat.id, 50);
      const lookupMessages = Array.from(
        new Map(
          [...page.messages, ...page.quotedMessages].map((message) => [message.id, message]),
        ).values(),
      );
      setMessages((previous) => ({ ...previous, [chat.contactId!]: lookupMessages }));
      cacheActiveMessages(chat.contactId, page.messages, page.nextCursor);

      if (currentChatRef.current?.chatType === "wpp" && currentChatRef.current.id === chat.id) {
        currentMessagesCursorRef.current = page.nextCursor;
        setHasOlderMessages(page.nextCursor !== null);
        setUniqueCurrentChatMessages(page.messages);
      }
      return page.messages;
    },
    [cacheActiveMessages],
  );

  const [chatFilters, changeChatFilters] = useReducer(chatsFilterReducer, {
    search: "",
    showingType: "all",
    sortBy: "lastMessage",
    sortOrder: "desc",
  });

  const openChat = useCallback(
    (chat: DetailedChat, preloadedMessages?: WppMessage[]) => {
      return measureFrontendInteraction("open_chat", () => {
        setCurrentChat(chat);
        // Se há mensagens pré-carregadas, usa elas; senão, pega do estado messages

        currentChatRef.current = chat;

        if (!paginatedChatHistoryEnabled) {
          const messagesToUse =
            preloadedMessages !== undefined
              ? preloadedMessages
              : messages[chat.contactId || 0] || [];
          setUniqueCurrentChatMessages(messagesToUse);
        } else {
          const contactId = chat.contactId || 0;
          const cachedMessages = activeMessagesCacheRef.current.get(contactId);
          const messagesToUse = preloadedMessages ?? cachedMessages ?? [];
          setUniqueCurrentChatMessages(messagesToUse);

          if (preloadedMessages !== undefined) {
            const cachedCursor = messageCursorCacheRef.current.get(contactId) ?? null;
            const cursor = cacheActiveMessages(contactId, preloadedMessages, cachedCursor);
            currentMessagesCursorRef.current = cursor;
            setHasOlderMessages(cursor !== null);
          } else if (cachedMessages) {
            const cursor = messageCursorCacheRef.current.get(contactId) ?? null;
            currentMessagesCursorRef.current = cursor;
            setHasOlderMessages(cursor !== null);
          } else {
            currentMessagesCursorRef.current = null;
            setHasOlderMessages(false);
            void loadFirstMessagePage(chat).catch((error) => {
              Logger.error("Failed to load chat messages", error as Error);
              toast.error("Falha ao carregar mensagens da conversa.");
            });
          }
        }

        if (chat.contactId && globalChannel.current) {
          void api.current.markContactMessagesAsRead(chat.contactId);

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
      });
    },
    [cacheActiveMessages, loadFirstMessagePage, messages, paginatedChatHistoryEnabled],
  );

  const loadOlderMessages = useCallback(async () => {
    if (!paginatedChatHistoryEnabled) return 0;
    const activeChat = currentChatRef.current;
    const cursor = currentMessagesCursorRef.current;
    if (!activeChat || activeChat.chatType !== "wpp" || !activeChat.contactId || !cursor) return 0;

    const page = await api.current.getChatMessagesPage(activeChat.id, 50, cursor);
    if (currentChatRef.current?.id !== activeChat.id) return 0;

    historyPrependRef.current = true;
    const currentMessages = currentChatMessagesRef.current;
    setUniqueCurrentChatMessages([...page.messages, ...currentMessages]);
    setMessages((previous) => ({
      ...previous,
      [activeChat.contactId!]: Array.from(
        new Map(
          [
            ...page.messages,
            ...page.quotedMessages,
            ...(previous[activeChat.contactId!] ?? []),
          ].map((message) => [message.id, message]),
        ).values(),
      ),
    }));
    const combined = [...page.messages, ...currentMessages];
    cacheActiveMessages(activeChat.contactId, combined, page.nextCursor);
    currentMessagesCursorRef.current = page.nextCursor;
    setHasOlderMessages(page.nextCursor !== null);
    return page.messages.length;
  }, [cacheActiveMessages, paginatedChatHistoryEnabled]);

  const updateChatContact = useCallback(
    (contactId: number, newName: string, newCustomer: Customer | null, newPhone?: string) => {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.contact && chat.contactId === contactId) {
            return {
              ...chat,
              contact: {
                ...chat.contact,
                name: newName,
                ...(newPhone ? { phone: newPhone } : {}),
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
      let traceId: string | null = null;
      try {
        Logger.debug("Attempting to send message", { to, data });
        if (!instance) {
          toast.error("Instância não encontrada. Recarregue a página e tente novamente.");
          return;
        }
        if (!selectedChannel) {
          toast.error("Nenhum canal selecionado para enviar a mensagem.");
          return;
        }

        if (!data.file) {
          await api.current.sendMessage(String(selectedChannel.id), to, data);
          return;
        }

        traceId = createFileUploadTraceId("whatsapp-send-file");
        const flowStartedAt = Date.now();
        logFileUploadTrace(traceId, "frontend.whatsapp.send-file.start", {
          instance,
          channelId: selectedChannel.id,
          contactId: data.contactId,
          chatId: data.chatId,
          to,
          fileName: data.file.name,
          fileSize: data.file.size,
          fileType: data.file.type,
          sendAsAudio: data.sendAsAudio,
          sendAsDocument: data.sendAsDocument,
        });

        const hashStartedAt = Date.now();
        const sha256 = await getFileSHA256(data.file);
        logFileUploadTrace(traceId, "frontend.whatsapp.hash.ready", {
          elapsedMs: Date.now() - hashStartedAt,
          sha256,
        });

        const dedupeStartedAt = Date.now();
        const res = await filesService.getFileByHash(instance, sha256);
        logFileUploadTrace(traceId, "frontend.whatsapp.dedupe.checked", {
          elapsedMs: Date.now() - dedupeStartedAt,
          foundExistingFile: !!res.file,
          existingFileId: res.file?.id,
        });

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
            traceId,
          };

          logFileUploadTrace(traceId, "frontend.whatsapp.send-message.start", {
            mode: "dedupe-hit",
            fileId: res.file.id,
            elapsedMs: Date.now() - flowStartedAt,
          });
          await sendTracedFileMessage(selectedChannel.id, to, sendFileData);
          logFileUploadTrace(traceId, "frontend.whatsapp.send-message.success", {
            mode: "dedupe-hit",
            elapsedMs: Date.now() - flowStartedAt,
          });

          return;
        }

        const uploadedFile = await filesService.uploadBrowserFile({
          instance,
          dirType: FileDirType.PUBLIC,
          file: data.file,
          contentHash: sha256,
          traceId,
        });
        logFileUploadTrace(traceId, "frontend.whatsapp.upload.completed", {
          elapsedMs: Date.now() - flowStartedAt,
          uploadedFileId: uploadedFile.id,
          uploadedFileSize: uploadedFile.size,
        });

        logFileUploadTrace(traceId, "frontend.whatsapp.send-message.start", {
          mode: "uploaded",
          fileId: uploadedFile.id,
          elapsedMs: Date.now() - flowStartedAt,
        });
        await sendTracedFileMessage(selectedChannel.id, to, {
          contactId: data.contactId,
          text: data.text,
          chatId: data.chatId,
          fileId: uploadedFile.id,
          quotedId: data.quotedId,
          sendAsAudio: !data.sendAsAudio,
          sendAsChatOwner: !data.sendAsChatOwner,
          sendAsDocument: !data.sendAsDocument,
          traceId,
        });
        logFileUploadTrace(traceId, "frontend.whatsapp.send-file.success", {
          elapsedMs: Date.now() - flowStartedAt,
          fileId: uploadedFile.id,
        });
      } catch (err) {
        traceId && logFileUploadTraceError(traceId, "frontend.whatsapp.send-file.error", err);
        toast.error(sanitizeErrorMessage(err));
      }
    },
    [channels, selectedChannel, sendTracedFileMessage],
  );

  const editMessage = useCallback(
    async (messageId: string, newText: string, isInternal: boolean = false) => {
      const channelId = selectedChannel?.id ?? globalChannel.current?.id;

      if (!channelId) {
        toast.error("Nenhum canal WhatsApp disponível para editar a mensagem.");
        return;
      }

      api.current.editMessage(String(channelId), messageId, newText, isInternal);
    },
    [selectedChannel],
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

      const notificationsData = response?.data;
      const newNotifications = Array.isArray(notificationsData?.notifications)
        ? notificationsData.notifications
        : [];
      const totalCount =
        typeof notificationsData?.totalCount === "number" ? notificationsData.totalCount : 0;

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

  const loadChatMessages = useCallback(
    async (chat: DetailedChat) => {
      if (!chat.id || !chat.contactId) return [];
      if (paginatedChatHistoryEnabled) return loadFirstMessagePage(chat);

      const res = await api.current.getChatById(chat.id);
      const loadedMessages = res.messages || [];
      setMessages((prev) => ({ ...prev, [chat.contactId || 0]: loadedMessages }));
      return loadedMessages;
    },
    [loadFirstMessagePage, paginatedChatHistoryEnabled],
  );

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
        const channelId = selectedChannel?.id ?? globalChannel.current?.id;

        if (!channelId) {
          toast.error("Nenhum canal WhatsApp disponível para encaminhar mensagens.");
          return;
        }

        await api.current.forwardMessages(String(channelId), data);
        toast.success("Mensagens encaminhadas com sucesso!");
      } catch (err) {
        const errorMessage = sanitizeErrorMessage(err);
        toast.error(`Falha ao encaminhar mensagens: ${errorMessage}`);
        console.error("Falha ao encaminhar mensagens", err);
      }
    },
    [selectedChannel, token],
  );

  const getChats = useCallback(() => {
    if (typeof token === "string" && token.length > 0 && api.current) {
      api.current.setAuth(token);
      api.current
        .getChatsBySession(!paginatedChatHistoryEnabled, true)
        .then(({ chats, messages }) => {
          const { chatsMessages, detailedChats } = processChatsAndMessages(chats, messages);

          setChats(detailedChats);
          setMessages(chatsMessages);
        });
    } else {
      setChats([]);
      setMessages({});
    }
  }, [paginatedChatHistoryEnabled, token]);

  const startChatByContactId = useCallback(
    async (contactId: number, template?: SendTemplateData) => {
      api.current.setAuth(token || "");
      pendingReadOnlyOpenRef.current = false;
      // Marca que o usuário iniciou este chat manualmente
      userInitiatedChatContactId.current = contactId;
      return api.current.startChatByContactId(contactId, template);
    },
    [api, token],
  );

  useEffect(() => {
    if (!currentChat) {
      setIsReadOnlyMode(false);
      pendingReadOnlyOpenRef.current = false;
      return;
    }

    setIsReadOnlyMode(pendingReadOnlyOpenRef.current);
    pendingReadOnlyOpenRef.current = false;
  }, [currentChat]);

  useEffect(() => {
    if (token?.length && api.current && user) {
      api.current.setAuth(token);
      usersService.setAuth(token);
      refreshNotificationPreferences();
      api.current.getSectors().then(async (res) => {
        const secs = Array.isArray(res)
          ? (res as SectorData[])
          : Array.isArray((res as { data?: SectorData[] })?.data)
            ? ((res as { data: SectorData[] }).data ?? [])
            : [];

        setSectors(secs);

        const parametersResponse = await api.current.ax.get("/api/whatsapp/session/parameters");
        const loadedParameters: Record<string, string> = parametersResponse.data["parameters"];
        const paginationEnabled = isFeatureEnabled(
          loadedParameters,
          FEATURE_FLAGS.paginatedChatHistory,
        );
        setParameters(loadedParameters);

        api.current.getChatsBySession(!paginationEnabled, true).then((payload) => {
          const chats = Array.isArray(payload?.chats) ? payload.chats : [];
          const messages = Array.isArray(payload?.messages) ? payload.messages : [];

          const { chatsMessages, detailedChats } = processChatsAndMessages(chats, messages);
          setChats(detailedChats);
          setMessages(chatsMessages);
        });

        const sector = secs.find((s) => s.id === user.SETOR);

        api.current.ax.get(`/api/whatsapp/sector/${user.SETOR}/clients`).then(async (res) => {
          const channelsPayload = res?.data;
          const channelsData: WppClient[] = Array.isArray(
            (channelsPayload as { data?: WppClient[] })?.data,
          )
            ? ((channelsPayload as { data: WppClient[] }).data ?? [])
            : Array.isArray(channelsPayload)
              ? (channelsPayload as WppClient[])
              : [];
          const defaultChannel = channelsData.find((ch) => ch.id === sector?.defaultClientId);
          const activeChannel = defaultChannel || channelsData[0] || null;

          globalChannel.current = activeChannel;
          setSelectedChannel((current) => current ?? activeChannel);

          if (loadedParameters["is_official"] === "true" && activeChannel?.id) {
            const templatesResponse = await api.current.ax.get(
              `/api/whatsapp/${activeChannel.id}/templates`,
            );
            setTemplates(templatesResponse.data.templates);
          } else {
            setTemplates([]);
          }
          console.log("Loaded parameters:", loadedParameters);

          setChannels(channelsData);
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
        setNotificationPreferences(createDefaultNotificationPreferences());
        setLoaded(false);
      };
    }
    // Removendo api.current das dependências para evitar loop infinito
  }, [token, instance, user, refreshNotificationPreferences]);

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
          emitPolicyNotification,
        ),
      );
      socket.on(
        SocketEventType.WppChatFinished,
        ChatFinishedHandler(
          socket,
          stableSocketListenersEnabled ? chatsRef : chats,
          stableSocketListenersEnabled ? currentChatRef : currentChat,
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
          stableSocketListenersEnabled ? chatsRef : chats,
          stableSocketListenersEnabled ? currentChatRef : currentChat,
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
        stableSocketListenersEnabled ? chatsRef : chats,
        emitPolicyNotification,
        stableSocketListenersEnabled,
      );
      socket.on(SocketEventType.WppMessage, (data: { message: WppMessage }) => {
        handleMessage(data);
        // Auto-update per-chat channel based on incoming message
        const { message } = data;
        if (message.clientId) {
          const currentChats = stableSocketListenersEnabled ? chatsRef.current : chats;
          const matchedChat = currentChats.find((c) => c.contactId === message.contactId);
          if (matchedChat) {
            chatsChannels.current.set(matchedChat.id, message.clientId);
          }

          const current = currentChatRef.current;
          if (current && current.chatType === "wpp" && current.contactId === message.contactId) {
            const currentChannels = stableSocketListenersEnabled ? channelsRef.current : channels;
            const channel = currentChannels.find((ch) => ch.id === message.clientId);
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
        SocketEventType.WppMessageReaction,
        MessageReactionHandler(setMessages, setUniqueCurrentChatMessages),
      );

      socket.on(
        SocketEventType.WppMessageDelete,
        MessageDeleteHandler(setMessages, setUniqueCurrentChatMessages),
      );

      socket.on(
        SocketEventType.WppMessageStatus,
        MessageStatusHandler(setMessages, setUniqueCurrentChatMessages, currentChatRef),
      );
      return () => {
        socket.off(SocketEventType.WppMessage);
        socket.off(SocketEventType.WppChatStarted);
        socket.off(SocketEventType.WppContactMessagesRead);
        socket.off(SocketEventType.WppMessageEdit);
        socket.off(SocketEventType.WppMessageReaction);
        socket.off(SocketEventType.WppMessageDelete);
        socket.off(SocketEventType.WppChatFinished);
        socket.off(SocketEventType.WppChatTransfer);
        socket.off(SocketEventType.WppMessageStatus);
      };
    }
  }, [
    socket,
    stableSocketListenersEnabled ? null : chats,
    stableSocketListenersEnabled ? null : currentChat,
    stableSocketListenersEnabled,
    emitPolicyNotification,
  ]);

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
        notificationPreferences,
        updateNotificationPreferences,
        refreshNotificationPreferences,
        markAsReadNotificationById,
        getChatById,
        chat,
        channels,
        globalChannel,
        chatsChannels,
        loaded,
        selectedChannel,
        setSelectedChannel,
        isReadOnlyMode,
        prepareReadOnlyOpen,
        hasOlderMessages,
        loadOlderMessages,
        historyPrependRef,
      }}
    >
      <FrontendPerformanceProvider
        enabled={parameters["feature_frontend_performance_telemetry_enabled"] === "true"}
        token={token || ""}
        endpoint={WPP_BASE_URL}
      />
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
