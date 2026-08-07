"use client";

import { AuthContext } from "@/app/auth-context";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import InternalChatFinishedHandler from "@/lib/event-handlers/internal-chat-finished";
import InternalChatStartedHandler from "@/lib/event-handlers/internal-chat-started";
import InternalReceiveMessageHandler from "@/lib/event-handlers/internal-message";
import InternalMessageEditHandler from "@/lib/event-handlers/internal-message-edit";
import InternalMessageDeleteHandler from "@/lib/event-handlers/internal-message-delete";
import InternalMessageReactionHandler from "@/lib/event-handlers/internal-message-reaction";
import InternalMessageStatusHandler from "@/lib/event-handlers/internal-message-status";
import processInternalChatsAndMessages from "@/lib/process-internal-chats-and-messages";
import usersService from "@/lib/services/users.service";
import {
  InternalChat,
  InternalChatClient,
  InternalChatMember,
  InternalMessage,
  InternalSendMessageData,
  SocketEventType,
  User,
  WppContact,
} from "@/lib/sdk-local";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { SocketContext } from "./socket-context";
import { DetailedChat } from "./whatsapp-context";
import { useWhatsappInternalBridge } from "./whatsapp-internal-bridge-context";
import {
  createFileUploadTraceId,
  logFileUploadTrace,
  logFileUploadTraceError,
} from "../../../lib/utils/file-upload-trace";
import { dispatchConfiguredNotification } from "../../../lib/utils/notification-dispatch";
import { shouldDispatchNotification } from "../../../lib/utils/notification-preferences";
import { createCacheScope } from "@/lib/cache/cache-scope";
import { hybridCache } from "@/lib/cache/hybrid-cache";
import isHybridCacheEnabled from "@/lib/cache/hybrid-cache-flag";
import projectDirectoryContact from "@/lib/cache/project-directory-contact";
import projectDirectoryUser from "@/lib/cache/project-directory-user";
import { InternalChatListContext } from "./internal-chat-list-context";
import mergeMessagesById from "@/lib/merge-messages-by-id";
import mergeMessageUpdate from "@/lib/merge-message-update";

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
  sendInternalMessage: (data: InternalSendMessageData) => Promise<void>;
  openInternalChat: (
    chat: DetailedInternalChat,
    markAsRead?: boolean,
    preloadedMessages?: InternalMessage[],
  ) => void;
  startDirectChat: (userId: number) => void;
  setCurrentChat: (chat: DetailedChat | DetailedInternalChat | null) => void;
  monitorInternalChats: DetailedInternalChat[];
  currentInternalChatMessages: InternalMessage[];
  getInternalChatsMonitor: () => void;
  loadInternalMonitorMessages: (chatId: number) => Promise<InternalMessage[]>;
  monitorMessages: Record<number, InternalMessage[]>;
  deleteInternalChat: (id: number) => Promise<void>;
  finishInternalChat: (id: number) => Promise<void>;
  phoneNameMap: Map<string, string>;
  whatsappSenderNameMap: Map<string, string>;
  refreshWhatsappSenderNames: () => Promise<void>;

  users: User[];
  contacts: WppContact[];
  hasOlderInternalMessages: boolean;
  loadOlderInternalMessages: () => Promise<number>;
  historyPrependRef: React.RefObject<boolean>;
}

const INTENAL_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";
const INTERNAL_UPLOAD_TIMEOUT_MS = Number(process.env["NEXT_PUBLIC_UPLOAD_TIMEOUT_MS"] || "300000");

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
    wppApi,
    notificationPreferences,
    unreadCount: wppUnreadCount,
  } = useWhatsappInternalBridge();

  const [internalChats, setInternalChats] = useState<DetailedInternalChat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [messages, setMessages] = useState<Record<number, InternalMessage[]>>({});
  const [monitorInternalChats, setMonitorInternalChats] = useState<DetailedInternalChat[]>([]);
  const [monitorMessages, setMonitorMessages] = useState<Record<number, InternalMessage[]>>({});
  const [contacts, setContacts] = useState<WppContact[]>([]);
  const [whatsappSenderNameMap, setWhatsappSenderNameMap] = useState<Map<string, string>>(
    new Map(),
  );

  const phoneNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const safeContacts = Array.isArray(contacts) ? contacts : [];
    const safeUsers = Array.isArray(users) ? users : [];

    safeContacts.forEach((contact) => {
      const phone = contact.phone?.replace(/\D/g, "");
      if (phone && contact.name) map.set(phone, contact.name);
    });

    safeUsers.forEach((u) => {
      const phone = u.WHATSAPP?.replace(/\D/g, "");
      if (phone && u.NOME) map.set(phone, u.NOME);
    });

    return map;
  }, [users, contacts]);

  const [currentInternalChatMessages, setCurrentChatMessages] = useState<InternalMessage[]>([]);
  const [hasOlderInternalMessages, setHasOlderInternalMessages] = useState(false);
  const currentMessagesCursorRef = useRef<number | null>(null);
  const messageCursorCacheRef = useRef(new Map<number, number | null>());
  const activeMessagesCacheRef = useRef(new Map<number, InternalMessage[]>());
  const loadedInternalChatIdsRef = useRef(new Set<number>());
  const removedInternalChatIdsRef = useRef(new Set<number>());
  const realtimeStartedInternalChatIdsRef = useRef(new Set<number>());
  const internalChatsRequestRef = useRef(0);
  const internalScopeGenerationRef = useRef(0);
  const internalCacheEpochRef = useRef(0);
  const internalCacheVersionsRef = useRef(new Map<number, number>());
  const historyPrependRef = useRef(false);
  const api = useRef(new InternalChatClient(INTENAL_BASE_URL));
  const userInitiatedInternalChat = useRef<boolean>(false);
  const { token, user, instance } = useContext(AuthContext);
  const cacheScope = user ? createCacheScope(instance, user.CODIGO) : null;
  const usersRef = useRef<User[]>([]);
  const contactsRef = useRef<WppContact[]>([]);
  const phoneNameMapRef = useRef(phoneNameMap);
  const notificationPreferencesRef = useRef(notificationPreferences);
  const whatsappSenderNameMapRef = useRef(whatsappSenderNameMap);
  usersRef.current = users;
  contactsRef.current = contacts;
  phoneNameMapRef.current = phoneNameMap;
  notificationPreferencesRef.current = notificationPreferences;
  whatsappSenderNameMapRef.current = whatsappSenderNameMap;

  const refreshWhatsappSenderNames = useCallback(async () => {
    if (!token) {
      setWhatsappSenderNameMap(new Map());
      return;
    }

    api.current.setAuth(token);
    const names = await api.current.getWhatsappSenderNames();
    setWhatsappSenderNameMap(
      new Map(
        names
          .filter((sender) => sender.displayName)
          .map((sender) => [sender.senderId, sender.displayName]),
      ),
    );
  }, [token]);

  useEffect(() => {
    void refreshWhatsappSenderNames().catch(() => {
      setWhatsappSenderNameMap(new Map());
    });
  }, [refreshWhatsappSenderNames]);

  useEffect(() => {
    const originalTitle = "InPulse";
    const unreadChats = [
      ...internalChats.filter((chat) => chat.isUnread),
      ...Array.from({ length: wppUnreadCount }),
    ];

    if (unreadChats.length > 0) {
      document.title = `🔔 InPulse (${unreadChats.length})`;
    } else {
      document.title = originalTitle;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [internalChats, wppUnreadCount]);

  const bumpInternalCacheVersion = useCallback((chatId: number) => {
    internalCacheVersionsRef.current.set(
      chatId,
      (internalCacheVersionsRef.current.get(chatId) ?? 0) + 1,
    );
  }, []);

  const cacheInternalMessages = useCallback(
    (chatId: number, loadedMessages: InternalMessage[]) => {
      const cache = activeMessagesCacheRef.current;
      cache.delete(chatId);
      cache.set(chatId, loadedMessages);
      const evicted: number[] = [];

      while (cache.size > 3) {
        const oldestKey = cache.keys().next().value as number | undefined;
        if (oldestKey === undefined) break;
        cache.delete(oldestKey);
        messageCursorCacheRef.current.delete(oldestKey);
        loadedInternalChatIdsRef.current.delete(oldestKey);
        bumpInternalCacheVersion(oldestKey);
        evicted.push(oldestKey);
      }

      if (evicted.length) {
        setMessages((previous) => {
          const next = { ...previous };
          for (const key of evicted) delete next[key];
          return next;
        });
      }
    },
    [bumpInternalCacheVersion],
  );

  const invalidateInternalMessageCache = useCallback(
    (chatId: number) => {
      activeMessagesCacheRef.current.delete(chatId);
      messageCursorCacheRef.current.delete(chatId);
      loadedInternalChatIdsRef.current.delete(chatId);
      bumpInternalCacheVersion(chatId);
    },
    [bumpInternalCacheVersion],
  );

  const invalidateAllInternalMessageCaches = useCallback(() => {
    internalCacheEpochRef.current += 1;
    activeMessagesCacheRef.current.clear();
    messageCursorCacheRef.current.clear();
    loadedInternalChatIdsRef.current.clear();
  }, []);

  const invalidateInternalCacheByMessage = useCallback(
    (messageId: number) => {
      for (const [chatId, cachedMessages] of activeMessagesCacheRef.current) {
        if (!cachedMessages.some((message) => message.id === messageId)) continue;
        activeMessagesCacheRef.current.delete(chatId);
        messageCursorCacheRef.current.delete(chatId);
        loadedInternalChatIdsRef.current.delete(chatId);
        bumpInternalCacheVersion(chatId);
      }
    },
    [bumpInternalCacheVersion],
  );

  const loadFirstInternalMessagePage = useCallback(
    async (chat: DetailedInternalChat) => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const scopeGeneration = internalScopeGenerationRef.current;
        const cacheEpoch = internalCacheEpochRef.current;
        const cacheVersion = internalCacheVersionsRef.current.get(chat.id) ?? 0;
        const page = await api.current.getChatMessagesPage(chat.id, 50);

        if (scopeGeneration !== internalScopeGenerationRef.current) return [];
        if (removedInternalChatIdsRef.current.has(chat.id)) return [];
        if (
          cacheEpoch !== internalCacheEpochRef.current ||
          cacheVersion !== (internalCacheVersionsRef.current.get(chat.id) ?? 0)
        ) {
          continue;
        }

        const lookupMessages = [...page.messages, ...page.quotedMessages];
        setMessages((previous) => ({
          ...previous,
          [chat.id]: mergeMessagesById(lookupMessages, previous[chat.id] ?? []),
        }));
        loadedInternalChatIdsRef.current.add(chat.id);
        cacheInternalMessages(
          chat.id,
          mergeMessagesById(page.messages, activeMessagesCacheRef.current.get(chat.id) ?? []),
        );
        messageCursorCacheRef.current.set(chat.id, page.nextCursor);

        if (
          currentChatRef.current?.chatType === "internal" &&
          currentChatRef.current.id === chat.id
        ) {
          currentMessagesCursorRef.current = page.nextCursor;
          setHasOlderInternalMessages(page.nextCursor !== null);
          setCurrentChatMessages((current) => mergeMessagesById(page.messages, current));
        }

        return page.messages;
      }

      return [];
    },
    [cacheInternalMessages, currentChatRef],
  );

  const upsertInternalMessage = useCallback(
    (message: InternalMessage) => {
      if (!user) return;

      InternalReceiveMessageHandler(
        api.current,
        setMessages,
        setCurrentChatMessages,
        setInternalChats,
        currentChatRef,
        usersRef.current,
        contactsRef.current,
        user,
        phoneNameMapRef.current,
        whatsappSenderNameMapRef.current,
        ({ event, title, body, isChatFocused }) => {
          const preferences = notificationPreferencesRef.current;
          if (!shouldDispatchNotification(preferences, { event, isChatFocused })) return;

          dispatchConfiguredNotification(preferences, event, {
            title,
            body,
            icon: HorizontalLogo.src,
          });
        },
      )({ message });

      const cachedMessages = activeMessagesCacheRef.current.get(message.internalChatId);
      const isCurrentChat =
        currentChatRef.current?.chatType === "internal" &&
        currentChatRef.current.id === message.internalChatId;

      if (cachedMessages || isCurrentChat) {
        cacheInternalMessages(
          message.internalChatId,
          mergeMessagesById(cachedMessages ?? [], [message], mergeMessageUpdate),
        );
      }
    },
    [cacheInternalMessages, currentChatRef, user],
  );

  const reconcileInternalMessageSend = useCallback(
    async (
      chatId: number,
      sentMessage: InternalMessage | null | undefined,
      scopeGeneration: number,
    ) => {
      if (scopeGeneration !== internalScopeGenerationRef.current) return;
      if (sentMessage?.id != null) {
        upsertInternalMessage(sentMessage);
        return;
      }

      invalidateInternalMessageCache(chatId);
      const activeChat = currentChatRef.current;
      if (activeChat?.chatType !== "internal" || activeChat.id !== chatId) return;

      try {
        await loadFirstInternalMessagePage(activeChat);
      } catch (error) {
        console.error("Falha ao reconciliar mensagem interna enviada", error);
      }
    },
    [
      currentChatRef,
      invalidateInternalMessageCache,
      loadFirstInternalMessagePage,
      upsertInternalMessage,
    ],
  );

  useLayoutEffect(() => {
    internalScopeGenerationRef.current += 1;
    invalidateAllInternalMessageCaches();
    internalCacheVersionsRef.current.clear();
    removedInternalChatIdsRef.current.clear();
    realtimeStartedInternalChatIdsRef.current.clear();
    internalChatsRequestRef.current += 1;
    currentMessagesCursorRef.current = null;
    historyPrependRef.current = false;
    setCurrentChatMessages([]);
    setHasOlderInternalMessages(false);
    setMessages({});
  }, [cacheScope, invalidateAllInternalMessageCaches]);

  const openInternalChat = useCallback(
    (
      chat: DetailedInternalChat,
      markAsRead: boolean = true,
      preloadedMessages?: InternalMessage[],
    ) => {
      setCurrentChat(chat);
      if (preloadedMessages !== undefined) {
        loadedInternalChatIdsRef.current.add(chat.id);
        cacheInternalMessages(chat.id, preloadedMessages);
        messageCursorCacheRef.current.set(chat.id, null);
        setMessages((previous) => ({
          ...previous,
          [chat.id]: mergeMessagesById(previous[chat.id] ?? [], preloadedMessages),
        }));
      }

      const cachedMessages = preloadedMessages ?? activeMessagesCacheRef.current.get(chat.id);
      const hasLoadedCache =
        preloadedMessages !== undefined || loadedInternalChatIdsRef.current.has(chat.id);
      setCurrentChatMessages(cachedMessages ?? []);
      setWppCurrMsgs([]);
      currentChatRef.current = chat as unknown as DetailedChat;
      if (cachedMessages && hasLoadedCache) {
        const cachedCursor = messageCursorCacheRef.current.get(chat.id) ?? null;
        currentMessagesCursorRef.current = cachedCursor;
        setHasOlderInternalMessages(cachedCursor !== null);
      } else {
        currentMessagesCursorRef.current = null;
        setHasOlderInternalMessages(false);
        void loadFirstInternalMessagePage(chat).catch(() => {
          invalidateInternalMessageCache(chat.id);
          toast.error("Falha ao carregar mensagens internas.");
        });
      }

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
    [
      cacheInternalMessages,
      invalidateInternalMessageCache,
      loadFirstInternalMessagePage,
      setCurrentChat,
      setWppCurrMsgs,
      currentChatRef,
    ],
  );

  const loadOlderInternalMessages = useCallback(async () => {
    const chat = currentChatRef.current;
    const cursor = currentMessagesCursorRef.current;
    if (!chat || chat.chatType !== "internal" || !cursor) return 0;
    const scopeGeneration = internalScopeGenerationRef.current;
    const cacheEpoch = internalCacheEpochRef.current;
    const cacheVersion = internalCacheVersionsRef.current.get(chat.id) ?? 0;
    const page = await api.current.getChatMessagesPage(chat.id, 50, cursor);
    if (
      scopeGeneration !== internalScopeGenerationRef.current ||
      cacheEpoch !== internalCacheEpochRef.current ||
      cacheVersion !== (internalCacheVersionsRef.current.get(chat.id) ?? 0) ||
      removedInternalChatIdsRef.current.has(chat.id)
    ) {
      return 0;
    }
    setMessages((previous) => ({
      ...previous,
      [chat.id]: mergeMessagesById(
        [...page.messages, ...page.quotedMessages],
        previous[chat.id] ?? [],
      ),
    }));
    const combined = mergeMessagesById(
      page.messages,
      activeMessagesCacheRef.current.get(chat.id) ?? [],
    );
    loadedInternalChatIdsRef.current.add(chat.id);
    cacheInternalMessages(chat.id, combined);
    messageCursorCacheRef.current.set(chat.id, page.nextCursor);

    if (currentChatRef.current?.chatType !== "internal" || currentChatRef.current.id !== chat.id) {
      return 0;
    }

    historyPrependRef.current = true;
    setCurrentChatMessages((current) => mergeMessagesById(page.messages, current));
    currentMessagesCursorRef.current = page.nextCursor;
    setHasOlderInternalMessages(page.nextCursor !== null);
    return page.messages.length;
  }, [cacheInternalMessages, currentChatRef]);
  const openInternalChatRef = useRef(openInternalChat);
  openInternalChatRef.current = openInternalChat;

  const deleteInternalChat = async (id: number) => {
    if (api.current) {
      try {
        await api.current.deleteInternalChat(id);
        removedInternalChatIdsRef.current.add(id);
        realtimeStartedInternalChatIdsRef.current.delete(id);
        invalidateInternalMessageCache(id);
        toast.success("Chat deletado com sucesso!");
        setInternalChats((prev) => prev.filter((chat) => chat.id !== id));
        setMessages((previous) => {
          const next = { ...previous };
          delete next[id];
          return next;
        });
        if (currentChatRef.current?.chatType === "internal" && currentChatRef.current.id === id) {
          setCurrentChat(null);
          setCurrentChatMessages([]);
        }
      } catch {
        toast.error("Erro ao deletar Chat");
      }
    }
  };
  const finishInternalChat = async (id: number) => {
    try {
      if (!token) return;
      api.current.setAuth(token);
      await api.current.ax.post(`/api/internal/chats/${id}/finish`);
      removedInternalChatIdsRef.current.add(id);
      realtimeStartedInternalChatIdsRef.current.delete(id);
      invalidateInternalMessageCache(id);

      toast.success("Chat finalizado com sucesso!");

      setMessages((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });

      if (currentChatRef.current?.chatType === "internal" && currentChatRef.current.id === id) {
        setCurrentChat(null);
        setCurrentChatMessages([]);
      }
    } catch {
      toast.error("Erro ao finalizar chat interno");
    }
  };
  const sendInternalMessage = useCallback(
    async (data: InternalSendMessageData) => {
      if (token) {
        const scopeGeneration = internalScopeGenerationRef.current;
        api.current.setAuth(token);

        if (data.file) {
          const traceId = createFileUploadTraceId("internal-send-file");
          const requestStartedAt = Date.now();
          const formData = new FormData();

          formData.append("chatId", data.chatId.toString());
          formData.append("text", data.text);
          data.quotedId && formData.append("quotedId", data.quotedId.toString());
          data.sendAsAudio && formData.append("sendAsAudio", "true");
          data.sendAsDocument && formData.append("sendAsDocument", "true");
          formData.append("file", data.file);
          data.fileId && formData.append("fileId", data.fileId.toString());
          formData.append("traceId", traceId);

          if (data.mentions && data.mentions.length > 0) {
            formData.append("mentions", JSON.stringify(data.mentions));
          }

          logFileUploadTrace(traceId, "frontend.internal.send-file.start", {
            chatId: data.chatId,
            fileName: data.file.name,
            fileSize: data.file.size,
            fileType: data.file.type,
            sendAsAudio: data.sendAsAudio,
            sendAsDocument: data.sendAsDocument,
          });

          try {
            const response = await api.current.ax.post(
              `/api/internal/chats/${data.chatId}/messages`,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                  "x-upload-trace-id": traceId,
                },
                timeout: INTERNAL_UPLOAD_TIMEOUT_MS,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
              },
            );

            const sentMessage = response.data?.data ?? response.data;
            await reconcileInternalMessageSend(
              data.chatId,
              sentMessage as InternalMessage,
              scopeGeneration,
            );

            logFileUploadTrace(traceId, "frontend.internal.send-file.success", {
              elapsedMs: Date.now() - requestStartedAt,
              chatId: data.chatId,
            });
          } catch (error) {
            logFileUploadTraceError(traceId, "frontend.internal.send-file.error", error, {
              elapsedMs: Date.now() - requestStartedAt,
              chatId: data.chatId,
            });
            throw error;
          }

          return;
        }

        const sentMessage = await api.current.sendMessageToInternalChat(data);
        await reconcileInternalMessageSend(data.chatId, sentMessage, scopeGeneration);
      }
    },
    [reconcileInternalMessageSend, token],
  );

  useEffect(() => {
    if (!token) {
      setUsers([]);
      setUsersLoaded(false);
      return;
    }

    usersService.setAuth(token);
    setUsersLoaded(false);
    let active = true;
    if (cacheScope) {
      void hybridCache.get<User[]>(cacheScope, "users").then((cachedUsers) => {
        if (active && cachedUsers?.length) {
          setUsers(cachedUsers);
          setUsersLoaded(true);
        }
      });
    }

    usersService
      .getUsers({ perPage: "999" })
      .then((res) => {
        const loadedUsers = Array.isArray(res?.data) ? res.data.map(projectDirectoryUser) : [];
        if (active) setUsers(loadedUsers);
        if (cacheScope) void hybridCache.set(cacheScope, "users", loadedUsers);
      })
      .catch((err) => {
        console.error("Falha ao carregar usuários internos", err);
        setUsers([]);
      })
      .finally(() => {
        if (active) setUsersLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [cacheScope, token]);

  const loadInternalChats = useCallback(async () => {
    if (!token || !user || !usersLoaded || users.length === 0) return;

    removedInternalChatIdsRef.current.clear();
    const requestId = ++internalChatsRequestRef.current;
    api.current.setAuth(token);
    const payload = await api.current.getInternalChatsBySession(null, !isHybridCacheEnabled());
    if (requestId !== internalChatsRequestRef.current) return;

    const chats = Array.isArray(payload?.chats) ? payload.chats : [];
    const loadedMessages = Array.isArray(payload?.messages) ? payload.messages : [];
    const { chatsMessages, detailedChats } = processInternalChatsAndMessages(
      user.CODIGO,
      users,
      chats,
      loadedMessages,
    );
    const availableChats = detailedChats.filter(
      (chat) => !removedInternalChatIdsRef.current.has(chat.id),
    );

    setInternalChats((currentChats) => {
      const snapshotIds = new Set(availableChats.map((chat) => chat.id));
      const mergedSnapshot = availableChats.map((snapshotChat) => {
        realtimeStartedInternalChatIdsRef.current.delete(snapshotChat.id);
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
      const realtimeOnlyChats = currentChats.filter(
        (chat) =>
          realtimeStartedInternalChatIdsRef.current.has(chat.id) &&
          !snapshotIds.has(chat.id) &&
          !removedInternalChatIdsRef.current.has(chat.id),
      );
      return [...realtimeOnlyChats, ...mergedSnapshot];
    });
    setMessages((currentMessages) => {
      const mergedMessages = { ...chatsMessages };
      for (const [chatId, realtimeMessages] of Object.entries(currentMessages)) {
        const numericChatId = Number(chatId);
        const shouldKeepMessages =
          availableChats.some((chat) => chat.id === numericChatId) ||
          realtimeStartedInternalChatIdsRef.current.has(numericChatId);
        if (!shouldKeepMessages) continue;
        mergedMessages[numericChatId] = mergeMessagesById(
          mergedMessages[numericChatId] ?? [],
          realtimeMessages,
        );
      }
      return mergedMessages;
    });
  }, [token, user, users, usersLoaded]);

  useEffect(() => {
    if (token && user && usersLoaded && users.length > 0) {
      api.current.setAuth(token);
      let active = true;
      if (cacheScope) {
        void hybridCache.get<WppContact[]>(cacheScope, "contacts").then((cachedContacts) => {
          if (active && cachedContacts) setContacts(cachedContacts);
        });
      }
      void wppApi.current
        .getContacts()
        .then((res) => {
          const loadedContacts = Array.isArray(res) ? res.map(projectDirectoryContact) : [];
          if (active) setContacts(loadedContacts);
          if (cacheScope) void hybridCache.set(cacheScope, "contacts", loadedContacts);
        })
        .catch(() => {
          if (active) setContacts([]);
        });
      void loadInternalChats().catch((error) => {
        console.error("Falha ao carregar conversas internas", error);
      });
      return () => {
        active = false;
      };
    }

    setInternalChats([]);
    setMessages({});
  }, [cacheScope, loadInternalChats, token, user, usersLoaded, users, wppApi]);

  const startDirectChat = useCallback(
    (userId: number) => {
      if (!token || !user) return;
      // Marca que o usuário iniciou este chat manualmente
      userInitiatedInternalChat.current = true;
      api.current.createInternalChat([userId, user!.CODIGO], false, "");
    },
    [api, token, user],
  );
  // Carregamento monitoria das conversas
  const getInternalChatsMonitor = useCallback(() => {
    if (token && user && users.length > 0) {
      api.current.setAuth(token);

      api.current.getInternalChatsMonitor().then(({ chats, messages }) => {
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
      setMonitorInternalChats([]);
      setMonitorMessages({});
    }
  }, [token, api.current, user, users]);

  const loadInternalMonitorMessages = useCallback(
    async (chatId: number) => {
      if (!token) return [];
      api.current.setAuth(token);
      const { messages: loadedMessages } = await api.current.getInternalChatsMonitor();
      return (loadedMessages ?? []).filter((message) => message.internalChatId === chatId);
    },
    [token],
  );

  useEffect(() => {
    if (socket && user) {
      const unsubscribers: Array<() => void> = [];
      // Evento de nova conversa
      unsubscribers.push(
        socket.subscribe(SocketEventType.InternalChatStarted, (data: any) => {
          removedInternalChatIdsRef.current.delete(data.chat.id);
          realtimeStartedInternalChatIdsRef.current.add(data.chat.id);
          return InternalChatStartedHandler(
            socket,
            usersRef.current,
            setInternalChats,
            setMessages,
            user,
            openInternalChatRef.current,
            userInitiatedInternalChat,
            ({ event, title, body, isChatFocused }) => {
              const preferences = notificationPreferencesRef.current;
              if (
                !shouldDispatchNotification(preferences, {
                  event,
                  isChatFocused,
                })
              ) {
                return;
              }

              dispatchConfiguredNotification(preferences, event, {
                title,
                body,
                icon: HorizontalLogo.src,
              });
            },
          )(data);
        }),
      );

      unsubscribers.push(
        socket.subscribe(SocketEventType.InternalChatFinished, (data: { chatId: number }) => {
          realtimeStartedInternalChatIdsRef.current.delete(data.chatId);
          removedInternalChatIdsRef.current.add(data.chatId);
          invalidateInternalMessageCache(data.chatId);
          return InternalChatFinishedHandler(
            socket,
            currentChatRef,
            setMessages,
            setInternalChats,
            setCurrentChat,
            setCurrentChatMessages,
          )(data);
        }),
      );

      // Evento de nova mensagem
      unsubscribers.push(
        socket.subscribe(SocketEventType.InternalMessage, (data: { message: InternalMessage }) => {
          upsertInternalMessage(data.message);
        }),
      );

      unsubscribers.push(
        socket.subscribe("connect", () => {
          invalidateAllInternalMessageCaches();
          void loadInternalChats().catch((error) => {
            console.error("Falha ao reconciliar conversas internas", error);
          });

          const activeChat = currentChatRef.current;
          if (activeChat?.chatType === "internal") {
            void loadFirstInternalMessagePage(activeChat).catch(() => {
              invalidateInternalMessageCache(activeChat.id);
            });
          }
        }),
      );

      // Evento de edição de mensagem
      unsubscribers.push(
        socket.subscribe(
          SocketEventType.InternalMessageEdit,
          (data: { internalMessageId: number; newText: string; chatId: number }) => {
            InternalMessageEditHandler(setMessages, setCurrentChatMessages, currentChatRef)(data);
            invalidateInternalMessageCache(data.chatId);
          },
        ),
      );

      unsubscribers.push(
        socket.subscribe(
          SocketEventType.WppMessageReaction,
          (data: { messageId: number; reaction: string }) => {
            InternalMessageReactionHandler(setMessages, setCurrentChatMessages)(data);
            invalidateInternalCacheByMessage(data.messageId);
          },
        ),
      );

      unsubscribers.push(
        socket.subscribe(
          SocketEventType.InternalMessageDelete,
          (data: { internalMessageId: number; chatId: number }) => {
            InternalMessageDeleteHandler(setMessages, setCurrentChatMessages)(data);
            invalidateInternalMessageCache(data.chatId);
          },
        ),
      );

      // Evento de status de mensagem
      unsubscribers.push(
        socket.subscribe(
          SocketEventType.InternalMessageStatus,
          (data: {
            internalMessageId: number;
            chatId: number;
            status: InternalMessage["status"];
          }) => {
            InternalMessageStatusHandler(setMessages, setCurrentChatMessages, currentChatRef)(data);
            invalidateInternalMessageCache(data.chatId);
          },
        ),
      );

      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    }
  }, [
    socket,
    user,
    invalidateInternalCacheByMessage,
    invalidateAllInternalMessageCaches,
    invalidateInternalMessageCache,
    loadFirstInternalMessagePage,
    loadInternalChats,
    upsertInternalMessage,
  ]);

  const chatListValue = useMemo(
    () => ({
      internalChats,
      users,
      openInternalChat,
    }),
    [internalChats, openInternalChat, users],
  );

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
        contacts,
        monitorInternalChats,
        getInternalChatsMonitor,
        loadInternalMonitorMessages,
        monitorMessages,
        deleteInternalChat,
        finishInternalChat,
        phoneNameMap,
        whatsappSenderNameMap,
        refreshWhatsappSenderNames,
        hasOlderInternalMessages,
        loadOlderInternalMessages,
        historyPrependRef,
      }}
    >
      <InternalChatListContext.Provider value={chatListValue}>
        {children}
      </InternalChatListContext.Provider>
    </InternalChatContext.Provider>
  );
}
