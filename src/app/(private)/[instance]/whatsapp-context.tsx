"use client";

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
  useLayoutEffect,
  useMemo,
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
import { WhatsappChatListContext } from "./whatsapp-chat-list-context";
import { WhatsappInternalBridgeContext } from "./whatsapp-internal-bridge-context";
import { WhatsappSelectionContext } from "./whatsapp-selection-context";
import { WhatsappSessionContext } from "./whatsapp-session-context";
import { createCacheScope } from "@/lib/cache/cache-scope";
import { hybridCache } from "@/lib/cache/hybrid-cache";
import isHybridCacheEnabled from "@/lib/cache/hybrid-cache-flag";
import mergeMessagesById from "@/lib/merge-messages-by-id";
import mergeMessageUpdate from "@/lib/merge-message-update";
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
  const renderStartedAt = Date.now();
  const { token, instance, user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const cacheScope = user ? createCacheScope(instance, user.CODIGO) : null;

  const [channels, setChannels] = useState<WppClient[]>([]);
  const globalChannel = useRef<WppClient | null>(null);
  const chatsChannels = useRef(new Map<number, number>());
  const userInitiatedChatContactId = useRef<number | null>(null);
  const [chats, setChats] = useState<DetailedChat[]>([]);
  const [chat, setChat] = useState<WppChatWithDetailsAndMessages | undefined>();
  const [currentChat, setCurrentChatState] = useState<DetailedChat | DetailedInternalChat | null>(
    null,
  );
  const currentChatRef = useRef<DetailedChat | DetailedInternalChat | null>(null);
  const setCurrentChat = useCallback<
    Dispatch<SetStateAction<DetailedChat | DetailedInternalChat | null>>
  >((nextChat) => {
    if (typeof nextChat !== "function") currentChatRef.current = nextChat;

    setCurrentChatState((previousChat) => {
      const resolvedChat = typeof nextChat === "function" ? nextChat(previousChat) : nextChat;
      currentChatRef.current = resolvedChat;
      return resolvedChat;
    });
  }, []);
  const [currentChatMessages, setCurrentChatMessages] = useState<WppMessage[]>([]);
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({});
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const currentMessagesCursorRef = useRef<number | null>(null);
  const messageCursorCacheRef = useRef(new Map<number, number | null>());
  const historyPrependRef = useRef(false);
  const activeMessagesCacheRef = useRef(new Map<number, WppMessage[]>());
  const loadedMessageChatIdsRef = useRef(new Set<number>());
  const removedChatIdsRef = useRef(new Set<number>());
  const realtimeStartedChatIdsRef = useRef(new Set<number>());
  const chatsRequestRef = useRef(0);
  const messageScopeGenerationRef = useRef(0);
  const messageCacheEpochRef = useRef(0);
  const messageCacheVersionsRef = useRef(new Map<number, number>());
  const getChatsRef = useRef<() => Promise<void>>(async () => undefined);
  const lastRealtimeReconcileAtRef = useRef(0);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const api = useRef(new WhatsappClient(WPP_BASE_URL));
  const [monitorChats, setMonitorChats] = useState<DetailedChat[]>([]);
  const [monitorSchedules, setMonitorSchedules] = useState<DetailedSchedule[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [templates, setTemplates] = useState<Array<MessageTemplate>>([]);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [selectedChannel, setSelectedChannel] = useState<WppClient | null>(null);
  const [notificationPreferences, setNotificationPreferences] =
    useState<UserNotificationPreferences>(createDefaultNotificationPreferences());
  const notificationPreferencesRef = useRef<UserNotificationPreferences>(
    createDefaultNotificationPreferences(),
  );

  const sendTracedFileMessage = useCallback(
    async (clientId: number, to: string, data: TracedSendMessageOptions, authToken?: string) => {
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

      const response = await api.current.ax.post(`/api/whatsapp/${clientId}/messages`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(data.traceId ? { "x-upload-trace-id": data.traceId } : {}),
        },
      });

      const sentMessage = response.data?.data ?? response.data;
      return sentMessage?.id != null ? (sentMessage as WppMessage) : null;
    },
    [],
  );
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);
  const isReadOnlyModeRef = useRef(false);
  const chatsRef = useRef<DetailedChat[]>([]);
  const channelsRef = useRef<WppClient[]>([]);
  const pendingReadOnlyOpenRef = useRef(false);

  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useLayoutEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useLayoutEffect(() => {
    isReadOnlyModeRef.current = isReadOnlyMode;
  }, [isReadOnlyMode]);

  useLayoutEffect(() => {
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

  const setUniqueCurrentChatMessages = useCallback((update: SetStateAction<WppMessage[]>) => {
    setCurrentChatMessages((prev) => {
      const next =
        typeof update === "function" ? (update as (p: WppMessage[]) => WppMessage[])(prev) : update;
      return mergeMessagesById([], next || [], mergeMessageUpdate);
    });
  }, []);

  const bumpMessageCacheVersion = useCallback((chatId: number) => {
    messageCacheVersionsRef.current.set(
      chatId,
      (messageCacheVersionsRef.current.get(chatId) ?? 0) + 1,
    );
  }, []);

  const cacheActiveMessages = useCallback(
    (chatId: number, loadedMessages: WppMessage[]) => {
      const cache = activeMessagesCacheRef.current;
      cache.delete(chatId);
      cache.set(chatId, loadedMessages);
      while (cache.size > 3) {
        const oldestKey = cache.keys().next().value as number | undefined;
        if (oldestKey === undefined) break;
        cache.delete(oldestKey);
        messageCursorCacheRef.current.delete(oldestKey);
        loadedMessageChatIdsRef.current.delete(oldestKey);
        bumpMessageCacheVersion(oldestKey);
      }
    },
    [bumpMessageCacheVersion],
  );

  const cacheRealtimeMessage = useCallback(
    (message: WppMessage) => {
      const chat =
        message.chatId != null
          ? chatsRef.current.find((item) => item.id === message.chatId)
          : chatsRef.current.find((item) => item.contactId === message.contactId);
      if (!chat) return;

      const cachedMessages = activeMessagesCacheRef.current.get(chat.id);
      const isCurrentChat =
        currentChatRef.current?.chatType === "wpp" && currentChatRef.current.id === chat.id;
      if (!cachedMessages && !isCurrentChat) return;

      cacheActiveMessages(
        chat.id,
        mergeMessagesById(cachedMessages ?? [], [message], mergeMessageUpdate),
      );
    },
    [cacheActiveMessages],
  );

  const invalidateCachedChat = useCallback(
    (chatId: number) => {
      activeMessagesCacheRef.current.delete(chatId);
      messageCursorCacheRef.current.delete(chatId);
      loadedMessageChatIdsRef.current.delete(chatId);
      bumpMessageCacheVersion(chatId);
    },
    [bumpMessageCacheVersion],
  );

  const invalidateAllMessageCaches = useCallback(() => {
    messageCacheEpochRef.current += 1;
    activeMessagesCacheRef.current.clear();
    messageCursorCacheRef.current.clear();
    loadedMessageChatIdsRef.current.clear();
  }, []);

  const invalidateCachedContact = useCallback(
    (contactId: number) => {
      for (const chat of chatsRef.current) {
        if (chat.contactId !== contactId) continue;
        activeMessagesCacheRef.current.delete(chat.id);
        messageCursorCacheRef.current.delete(chat.id);
        loadedMessageChatIdsRef.current.delete(chat.id);
        bumpMessageCacheVersion(chat.id);
      }
    },
    [bumpMessageCacheVersion],
  );

  const invalidateCachedMessage = useCallback(
    (messageId: number) => {
      for (const [chatId, cachedMessages] of activeMessagesCacheRef.current) {
        if (!cachedMessages.some((message) => message.id === messageId)) continue;
        activeMessagesCacheRef.current.delete(chatId);
        messageCursorCacheRef.current.delete(chatId);
        loadedMessageChatIdsRef.current.delete(chatId);
        bumpMessageCacheVersion(chatId);
      }
    },
    [bumpMessageCacheVersion],
  );

  const upsertWppMessage = useCallback(
    (message: WppMessage) => {
      ReceiveMessageHandler(
        api.current,
        setMessages,
        setUniqueCurrentChatMessages,
        setChats,
        currentChatRef,
        chatsRef.current,
        emitPolicyNotification,
      )({ message });
      cacheRealtimeMessage(message);

      if (!message.clientId) return;

      const matchedChat =
        message.chatId != null
          ? chatsRef.current.find((chat) => chat.id === message.chatId)
          : chatsRef.current.find((chat) => chat.contactId === message.contactId);
      if (matchedChat) chatsChannels.current.set(matchedChat.id, message.clientId);

      const activeChat = currentChatRef.current;
      const belongsToActiveChat =
        activeChat?.chatType === "wpp" &&
        (message.chatId != null
          ? activeChat.id === message.chatId
          : activeChat.contactId === message.contactId);
      if (!belongsToActiveChat) return;

      const channel = channelsRef.current.find((item) => item.id === message.clientId);
      if (channel) setSelectedChannel(channel);
    },
    [cacheRealtimeMessage, emitPolicyNotification, setUniqueCurrentChatMessages],
  );

  useLayoutEffect(() => {
    messageScopeGenerationRef.current += 1;
    invalidateAllMessageCaches();
    messageCacheVersionsRef.current.clear();
    removedChatIdsRef.current.clear();
    realtimeStartedChatIdsRef.current.clear();
    chatsRequestRef.current += 1;
    chatsChannels.current.clear();
    currentMessagesCursorRef.current = null;
    historyPrependRef.current = false;
    currentChatRef.current = null;
    setCurrentChat(null);
    setUniqueCurrentChatMessages([]);
    setHasOlderMessages(false);
    setMessages({});
    globalChannel.current = null;
    setSelectedChannel(null);
    setChannels([]);
    setSectors([]);
    setTemplates([]);
    setParameters({});
    setLoaded(false);
  }, [cacheScope, invalidateAllMessageCaches, setCurrentChat, setUniqueCurrentChatMessages]);

  const loadFirstMessagePage = useCallback(
    async (chat: DetailedChat) => {
      if (!chat.contactId) return [];

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const scopeGeneration = messageScopeGenerationRef.current;
        const cacheEpoch = messageCacheEpochRef.current;
        const cacheVersion = messageCacheVersionsRef.current.get(chat.id) ?? 0;
        const page = await api.current.getChatMessagesPage(chat.id, 50);

        if (scopeGeneration !== messageScopeGenerationRef.current) return [];
        if (removedChatIdsRef.current.has(chat.id)) return [];
        if (
          cacheEpoch !== messageCacheEpochRef.current ||
          cacheVersion !== (messageCacheVersionsRef.current.get(chat.id) ?? 0)
        ) {
          continue;
        }

        const lookupMessages = [...page.messages, ...page.quotedMessages];
        setMessages((previous) => ({
          ...previous,
          [chat.contactId!]: mergeMessagesById(lookupMessages, previous[chat.contactId!] ?? []),
        }));
        loadedMessageChatIdsRef.current.add(chat.id);
        cacheActiveMessages(
          chat.id,
          mergeMessagesById(page.messages, activeMessagesCacheRef.current.get(chat.id) ?? []),
        );
        messageCursorCacheRef.current.set(chat.id, page.nextCursor);
        if (currentChatRef.current?.chatType === "wpp" && currentChatRef.current.id === chat.id) {
          currentMessagesCursorRef.current = page.nextCursor;
          setHasOlderMessages(page.nextCursor !== null);
          setUniqueCurrentChatMessages((current) => mergeMessagesById(page.messages, current));
        }
        return page.messages;
      }

      return [];
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
      setCurrentChat(chat);
      // Se há mensagens pré-carregadas, usa elas; senão, pega do estado messages

      const cachedMessages = activeMessagesCacheRef.current.get(chat.id);
      const hasLoadedCache = loadedMessageChatIdsRef.current.has(chat.id);
      const messagesToUse = preloadedMessages ?? cachedMessages ?? [];

      setUniqueCurrentChatMessages(messagesToUse);
      currentChatRef.current = chat;
      if (preloadedMessages !== undefined) {
        loadedMessageChatIdsRef.current.add(chat.id);
        cacheActiveMessages(chat.id, preloadedMessages);
      }
      if (cachedMessages && hasLoadedCache) {
        const cachedCursor = messageCursorCacheRef.current.get(chat.id) ?? null;
        currentMessagesCursorRef.current = cachedCursor;
        setHasOlderMessages(cachedCursor !== null);
      } else {
        currentMessagesCursorRef.current = null;
        setHasOlderMessages(false);
      }
      if (preloadedMessages === undefined && !hasLoadedCache) {
        void loadFirstMessagePage(chat).catch((error) => {
          invalidateCachedChat(chat.id);
          Logger.error("Failed to load chat messages", error as Error);
          toast.error("Falha ao carregar mensagens da conversa.");
        });
      }

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
    [cacheActiveMessages, invalidateCachedChat, loadFirstMessagePage, setCurrentChat],
  );

  const loadOlderMessages = useCallback(async () => {
    const chat = currentChatRef.current;
    const cursor = currentMessagesCursorRef.current;
    if (!chat || chat.chatType !== "wpp" || !chat.contactId || !cursor) return 0;
    const scopeGeneration = messageScopeGenerationRef.current;
    const cacheEpoch = messageCacheEpochRef.current;
    const cacheVersion = messageCacheVersionsRef.current.get(chat.id) ?? 0;
    const page = await api.current.getChatMessagesPage(chat.id, 50, cursor);
    if (
      scopeGeneration !== messageScopeGenerationRef.current ||
      cacheEpoch !== messageCacheEpochRef.current ||
      cacheVersion !== (messageCacheVersionsRef.current.get(chat.id) ?? 0) ||
      removedChatIdsRef.current.has(chat.id)
    ) {
      return 0;
    }
    setMessages((previous) => ({
      ...previous,
      [chat.contactId!]: mergeMessagesById(
        [...page.messages, ...page.quotedMessages],
        previous[chat.contactId!] ?? [],
      ),
    }));
    const combined = mergeMessagesById(
      page.messages,
      activeMessagesCacheRef.current.get(chat.id) ?? [],
    );
    loadedMessageChatIdsRef.current.add(chat.id);
    cacheActiveMessages(chat.id, combined);
    messageCursorCacheRef.current.set(chat.id, page.nextCursor);

    if (currentChatRef.current?.chatType !== "wpp" || currentChatRef.current.id !== chat.id) {
      return 0;
    }

    historyPrependRef.current = true;
    setUniqueCurrentChatMessages((current) => mergeMessagesById(page.messages, current));
    currentMessagesCursorRef.current = page.nextCursor;
    setHasOlderMessages(page.nextCursor !== null);
    return page.messages.length;
  }, [cacheActiveMessages]);

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
      const scopeGeneration = messageScopeGenerationRef.current;
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
          api.current.setAuth(token || "");
          const sentMessage = await api.current.sendMessage(String(selectedChannel.id), to, data);
          if (scopeGeneration === messageScopeGenerationRef.current && sentMessage?.id != null) {
            upsertWppMessage(sentMessage);
          }
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
          const sentMessage = await sendTracedFileMessage(
            selectedChannel.id,
            to,
            sendFileData,
            token || undefined,
          );
          if (scopeGeneration === messageScopeGenerationRef.current && sentMessage) {
            upsertWppMessage(sentMessage);
          }
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
        const sentMessage = await sendTracedFileMessage(
          selectedChannel.id,
          to,
          {
            contactId: data.contactId,
            text: data.text,
            chatId: data.chatId,
            fileId: uploadedFile.id,
            quotedId: data.quotedId,
            sendAsAudio: !data.sendAsAudio,
            sendAsChatOwner: !data.sendAsChatOwner,
            sendAsDocument: !data.sendAsDocument,
            traceId,
          },
          token || undefined,
        );
        if (scopeGeneration === messageScopeGenerationRef.current && sentMessage) {
          upsertWppMessage(sentMessage);
        }
        logFileUploadTrace(traceId, "frontend.whatsapp.send-file.success", {
          elapsedMs: Date.now() - flowStartedAt,
          fileId: uploadedFile.id,
        });
      } catch (err) {
        traceId && logFileUploadTraceError(traceId, "frontend.whatsapp.send-file.error", err);
        toast.error(sanitizeErrorMessage(err));
      }
    },
    [instance, selectedChannel, sendTracedFileMessage, token, upsertWppMessage],
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
      if (!chat.id) return [];

      if (chat.contactId) {
        return loadFirstMessagePage(chat);
      }
      return [];
    },
    [loadFirstMessagePage],
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

  const getChats = useCallback(async () => {
    if (!(typeof token === "string" && token.length > 0)) {
      chatsRequestRef.current += 1;
      setChats([]);
      setMessages({});
      return;
    }

    removedChatIdsRef.current.clear();
    const requestId = ++chatsRequestRef.current;
    api.current.setAuth(token);

    try {
      const { chats: loadedChats, messages: loadedMessages } = await api.current.getChatsBySession(
        !isHybridCacheEnabled(),
        true,
      );
      if (requestId !== chatsRequestRef.current) return;

      const { chatsMessages, detailedChats } = processChatsAndMessages(loadedChats, loadedMessages);
      const availableChats = detailedChats.filter(
        (chat) => !removedChatIdsRef.current.has(chat.id),
      );
      const availableChatIds = new Set(availableChats.map((chat) => chat.id));
      const activeChat = currentChatRef.current;
      const activeChatWasRemoved =
        activeChat?.chatType === "wpp" &&
        !availableChatIds.has(activeChat.id) &&
        !realtimeStartedChatIdsRef.current.has(activeChat.id);

      if (activeChatWasRemoved && !isReadOnlyModeRef.current) {
        setCurrentChat(null);
        setUniqueCurrentChatMessages([]);
        currentMessagesCursorRef.current = null;
        setHasOlderMessages(false);
      }

      Logger.debug("Chats loaded for current session", {
        chatCount: availableChats.length,
        messageCount: loadedMessages.length,
        includesMessages: !isHybridCacheEnabled(),
      });

      setChats((currentChats) => {
        const snapshotIds = new Set(availableChats.map((chat) => chat.id));
        const mergedSnapshot = availableChats.map((snapshotChat) => {
          realtimeStartedChatIdsRef.current.delete(snapshotChat.id);
          const currentChat = currentChats.find((chat) => chat.id === snapshotChat.id);
          if (!currentChat) return snapshotChat;

          const currentTimestamp = Number(currentChat.lastMessage?.timestamp ?? 0);
          const snapshotTimestamp = Number(snapshotChat.lastMessage?.timestamp ?? 0);
          return currentTimestamp > snapshotTimestamp
            ? {
                ...snapshotChat,
                lastMessage: currentChat.lastMessage,
                isUnread: currentChat.isUnread,
              }
            : snapshotChat;
        });
        const justStartedChats = currentChats.filter(
          (chat) =>
            realtimeStartedChatIdsRef.current.has(chat.id) &&
            !snapshotIds.has(chat.id) &&
            !removedChatIdsRef.current.has(chat.id),
        );
        return [...justStartedChats, ...mergedSnapshot];
      });
      setMessages((currentMessages) => {
        const mergedMessages = { ...chatsMessages };
        for (const [contactId, realtimeMessages] of Object.entries(currentMessages)) {
          const numericContactId = Number(contactId);
          const shouldKeepMessages =
            availableChats.some((chat) => chat.contactId === numericContactId) ||
            chatsRef.current.some(
              (chat) =>
                realtimeStartedChatIdsRef.current.has(chat.id) &&
                chat.contactId === numericContactId,
            );
          if (!shouldKeepMessages) continue;
          mergedMessages[numericContactId] = mergeMessagesById(
            mergedMessages[numericContactId] ?? [],
            realtimeMessages,
          );
        }
        return mergedMessages;
      });
    } catch (error) {
      if (requestId !== chatsRequestRef.current) return;
      Logger.error("Failed to load chats", error as Error);
      toast.error("Falha ao carregar as conversas.");
    }
  }, [setCurrentChat, setUniqueCurrentChatMessages, token]);
  getChatsRef.current = getChats;

  const reconcileRealtimeState = useCallback(async () => {
    const now = Date.now();
    if (now - lastRealtimeReconcileAtRef.current < 2_000) return;
    lastRealtimeReconcileAtRef.current = now;

    invalidateAllMessageCaches();
    await getChatsRef.current();
    const activeChat = currentChatRef.current;
    if (activeChat?.chatType !== "wpp") return;

    try {
      await loadFirstMessagePage(activeChat);
    } catch (error) {
      invalidateCachedChat(activeChat.id);
      Logger.error("Failed to reconcile active chat messages", error as Error);
    }
  }, [invalidateAllMessageCaches, invalidateCachedChat, loadFirstMessagePage]);

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
      let active = true;
      const scopeGeneration = messageScopeGenerationRef.current;
      const isCurrentScope = () => active && scopeGeneration === messageScopeGenerationRef.current;

      api.current.setAuth(token);
      usersService.setAuth(token);
      void refreshNotificationPreferences();
      if (cacheScope) {
        void Promise.all([
          hybridCache.get<SectorData[]>(cacheScope, "sectors"),
          hybridCache.get<WppClient[]>(cacheScope, "channels"),
          hybridCache.get<Record<string, string>>(cacheScope, "parameters"),
        ]).then(([cachedSectors, cachedChannels, cachedParameters]) => {
          if (!isCurrentScope()) return;
          if (cachedSectors) setSectors(cachedSectors);
          if (cachedChannels) setChannels(cachedChannels);
          if (cachedParameters) setParameters(cachedParameters);
          if (cachedSectors && cachedChannels && cachedParameters) setLoaded(true);
        });
      }
      void getChats();
      void api.current
        .getSectors()
        .then(async (res) => {
          if (!isCurrentScope()) return;
          const secs = Array.isArray(res)
            ? (res as SectorData[])
            : Array.isArray((res as { data?: SectorData[] })?.data)
              ? ((res as { data: SectorData[] }).data ?? [])
              : [];

          setSectors(secs);
          if (cacheScope) void hybridCache.set(cacheScope, "sectors", secs);

          const sector = secs.find((item) => item.id === user.SETOR);
          const clientsResponse = await api.current.ax.get(
            `/api/whatsapp/sector/${user.SETOR}/clients`,
          );
          if (!isCurrentScope()) return;

          const channelsPayload = clientsResponse?.data;
          const channelsData: WppClient[] = Array.isArray(
            (channelsPayload as { data?: WppClient[] })?.data,
          )
            ? ((channelsPayload as { data: WppClient[] }).data ?? [])
            : Array.isArray(channelsPayload)
              ? (channelsPayload as WppClient[])
              : [];
          const defaultChannel = channelsData.find(
            (channel) => channel.id === sector?.defaultClientId,
          );
          const activeChannel = defaultChannel || channelsData[0] || null;

          globalChannel.current = activeChannel;
          setSelectedChannel((current) =>
            current && channelsData.some((channel) => channel.id === current.id)
              ? current
              : activeChannel,
          );

          const parametersResponse = await api.current.ax.get("/api/whatsapp/session/parameters");
          if (!isCurrentScope()) return;
          const loadedParameters: Record<string, string> = parametersResponse.data["parameters"];
          if (loadedParameters["is_official"] === "true" && activeChannel?.id) {
            const templatesResponse = await api.current.ax.get(
              `/api/whatsapp/${activeChannel.id}/templates`,
            );
            if (!isCurrentScope()) return;
            setTemplates(templatesResponse.data.templates);
          } else {
            setTemplates([]);
          }
          setParameters(loadedParameters);
          if (cacheScope) {
            void hybridCache.set(cacheScope, "parameters", loadedParameters);
            void hybridCache.set(cacheScope, "channels", channelsData);
          }

          setChannels(channelsData);
          setLoaded(true);
          await getNotifications({ page: 1, pageSize: NOTIFICATIONS_PER_PAGE });
        })
        .catch((error) => {
          if (isCurrentScope())
            Logger.error("Failed to load WhatsApp session data", error as Error);
        });

      return () => {
        active = false;
      };
    }
    // Removendo api.current das dependências para evitar loop infinito
  }, [cacheScope, token, instance, user, refreshNotificationPreferences, getChats]);

  useEffect(() => {
    if (socket) {
      const unsubscribers: Array<() => void> = [];
      unsubscribers.push(
        socket.subscribe(SocketEventType.WppContactMessagesRead, (data: { contactId: number }) => {
          ReadChatHandler(
            currentChatRef,
            setChats,
            setMessages,
            setUniqueCurrentChatMessages,
          )(data);
          invalidateCachedContact(data.contactId);
        }),
      );
      unsubscribers.push(
        socket.subscribe(SocketEventType.WppChatStarted, (data: { chatId: number }) => {
          const scopeGeneration = messageScopeGenerationRef.current;
          removedChatIdsRef.current.delete(data.chatId);
          realtimeStartedChatIdsRef.current.add(data.chatId);
          return ChatStartedHandler(
            api.current,
            socket,
            setMessages,
            setChats,
            openChat,
            userInitiatedChatContactId,
            emitPolicyNotification,
            (chatId) =>
              scopeGeneration === messageScopeGenerationRef.current &&
              !removedChatIdsRef.current.has(chatId),
          )(data);
        }),
      );
      unsubscribers.push(
        socket.subscribe(SocketEventType.WppChatFinished, (data: { chatId: number }) => {
          realtimeStartedChatIdsRef.current.delete(data.chatId);
          removedChatIdsRef.current.add(data.chatId);
          invalidateCachedChat(data.chatId);
          return ChatFinishedHandler(
            socket,
            chatsRef.current,
            currentChatRef.current,
            setMessages,
            setChats,
            setCurrentChat,
            setUniqueCurrentChatMessages,
            () => getNotifications({ page: 1, pageSize: NOTIFICATIONS_PER_PAGE }),
          )(data);
        }),
      );
      unsubscribers.push(
        socket.subscribe(SocketEventType.WppChatTransfer, (data: { chatId: number }) => {
          realtimeStartedChatIdsRef.current.delete(data.chatId);
          removedChatIdsRef.current.add(data.chatId);
          invalidateCachedChat(data.chatId);
          return ChatTransferHandler(
            api.current,
            socket,
            chatsRef.current,
            currentChatRef.current,
            setMessages,
            setChats,
            setCurrentChat,
            setUniqueCurrentChatMessages,
          )(data);
        }),
      );
      unsubscribers.push(
        socket.subscribe(SocketEventType.WppMessage, (data: { message: WppMessage }) => {
          upsertWppMessage(data.message);
        }),
      );

      unsubscribers.push(
        socket.subscribe("connect", () => {
          void reconcileRealtimeState();
        }),
      );

      unsubscribers.push(
        socket.subscribe(
          SocketEventType.WppMessageEdit,
          (data: { messageId: number; newText: string; contactId: number }) => {
            EditedMessageHandler(setMessages, setUniqueCurrentChatMessages, currentChatRef)(data);
            invalidateCachedContact(data.contactId);
          },
        ),
      );

      unsubscribers.push(
        socket.subscribe(
          SocketEventType.WppMessageReaction,
          (data: { messageId: number; reaction: string }) => {
            MessageReactionHandler(setMessages, setUniqueCurrentChatMessages)(data);
            invalidateCachedMessage(data.messageId);
          },
        ),
      );

      unsubscribers.push(
        socket.subscribe(
          SocketEventType.WppMessageDelete,
          (data: { messageId: number; contactId: number }) => {
            MessageDeleteHandler(setMessages, setUniqueCurrentChatMessages)(data);
            invalidateCachedContact(data.contactId);
          },
        ),
      );

      unsubscribers.push(
        socket.subscribe(
          SocketEventType.WppMessageStatus,
          (data: { messageId: number; contactId: number; status: WppMessage["status"] }) => {
            MessageStatusHandler(setMessages, setUniqueCurrentChatMessages, currentChatRef)(data);
            invalidateCachedContact(data.contactId);
          },
        ),
      );
      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    }
  }, [
    socket,
    emitPolicyNotification,
    getNotifications,
    invalidateCachedChat,
    invalidateCachedContact,
    invalidateCachedMessage,
    openChat,
    reconcileRealtimeState,
    upsertWppMessage,
  ]);

  useEffect(() => {
    const reconcileWhenVisible = () => {
      if (document.visibilityState === "visible") void reconcileRealtimeState();
    };
    const reconcileWhenOnline = () => void reconcileRealtimeState();

    document.addEventListener("visibilitychange", reconcileWhenVisible);
    window.addEventListener("online", reconcileWhenOnline);
    return () => {
      document.removeEventListener("visibilitychange", reconcileWhenVisible);
      window.removeEventListener("online", reconcileWhenOnline);
    };
  }, [reconcileRealtimeState]);

  const chatListValue = useMemo(
    () => ({
      chats,
      currentChat,
      chatFilters,
      changeChatFilters,
      openChat,
      parameters,
    }),
    [chats, currentChat, chatFilters, openChat, parameters],
  );
  const unreadCount = useMemo(() => chats.filter((item) => item.isUnread).length, [chats]);
  const internalBridgeValue = useMemo(
    () => ({
      setCurrentChat,
      currentChatRef,
      setCurrentChatMessages: setUniqueCurrentChatMessages,
      wppApi: api,
      notificationPreferences,
      unreadCount,
    }),
    [notificationPreferences, setUniqueCurrentChatMessages, unreadCount],
  );
  const sessionValue = useMemo(
    () => ({ parameters, channels, loaded }),
    [channels, loaded, parameters],
  );
  const selectionValue = useMemo(() => ({ currentChat, setCurrentChat }), [currentChat]);

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
      <WhatsappInternalBridgeContext.Provider value={internalBridgeValue}>
        <WhatsappSessionContext.Provider value={sessionValue}>
          <WhatsappSelectionContext.Provider value={selectionValue}>
            <WhatsappChatListContext.Provider value={chatListValue}>
              {children}
            </WhatsappChatListContext.Provider>
          </WhatsappSelectionContext.Provider>
        </WhatsappSessionContext.Provider>
      </WhatsappInternalBridgeContext.Provider>
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
