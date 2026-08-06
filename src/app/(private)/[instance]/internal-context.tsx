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
  openInternalChat: (chat: DetailedInternalChat, markAsRead?: boolean) => void;
  startDirectChat: (userId: number) => void;
  setCurrentChat: (chat: DetailedChat | DetailedInternalChat | null) => void;
  monitorInternalChats: DetailedInternalChat[];
  currentInternalChatMessages: InternalMessage[];
  getInternalChatsMonitor: () => void;
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
  const historyPrependRef = useRef(false);
  const api = useRef(new InternalChatClient(INTENAL_BASE_URL));
  const userInitiatedInternalChat = useRef<boolean>(false);
  const { token, user, instance } = useContext(AuthContext);
  const cacheScope = user ? createCacheScope(instance, user.CODIGO) : null;
  const usersRef = useRef<User[]>([]);
  const contactsRef = useRef<WppContact[]>([]);
  const internalChatsRef = useRef<DetailedInternalChat[]>([]);
  const phoneNameMapRef = useRef(phoneNameMap);
  const notificationPreferencesRef = useRef(notificationPreferences);
  const whatsappSenderNameMapRef = useRef(whatsappSenderNameMap);
  usersRef.current = users;
  contactsRef.current = contacts;
  internalChatsRef.current = internalChats;
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

  const openInternalChat = useCallback(
    (chat: DetailedInternalChat, markAsRead: boolean = true) => {
      setCurrentChat(chat);
      const cachedMessages = activeMessagesCacheRef.current.get(chat.id);
      setCurrentChatMessages(cachedMessages ?? []);
      setWppCurrMsgs([]);
      currentChatRef.current = chat as unknown as DetailedChat;
      if (cachedMessages) {
        const cachedCursor = messageCursorCacheRef.current.get(chat.id) ?? null;
        currentMessagesCursorRef.current = cachedCursor;
        setHasOlderInternalMessages(cachedCursor !== null);
      } else {
        setHasOlderInternalMessages(false);
        void api.current
          .getChatMessagesPage(chat.id, 50)
          .then((page) => {
            const lookupMessages = [...page.messages, ...page.quotedMessages];
            setMessages((previous) => ({ ...previous, [chat.id]: lookupMessages }));
            activeMessagesCacheRef.current.set(chat.id, page.messages);
            const evicted: number[] = [];
            while (activeMessagesCacheRef.current.size > 3) {
              const oldestKey = activeMessagesCacheRef.current.keys().next().value as
                | number
                | undefined;
              if (oldestKey === undefined) break;
              activeMessagesCacheRef.current.delete(oldestKey);
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
            messageCursorCacheRef.current.set(chat.id, page.nextCursor);
            currentMessagesCursorRef.current = page.nextCursor;
            setHasOlderInternalMessages(page.nextCursor !== null);
            if (
              currentChatRef.current?.chatType === "internal" &&
              currentChatRef.current.id === chat.id
            ) {
              setCurrentChatMessages(page.messages);
            }
          })
          .catch(() => toast.error("Falha ao carregar mensagens internas."));
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
    [setCurrentChat, setWppCurrMsgs, currentChatRef],
  );

  const loadOlderInternalMessages = useCallback(async () => {
    const chat = currentChatRef.current;
    const cursor = currentMessagesCursorRef.current;
    if (!chat || chat.chatType !== "internal" || !cursor) return 0;
    const page = await api.current.getChatMessagesPage(chat.id, 50, cursor);
    historyPrependRef.current = true;
    setCurrentChatMessages((current) => [...page.messages, ...current]);
    setMessages((previous) => ({
      ...previous,
      [chat.id]: [...page.messages, ...page.quotedMessages, ...(previous[chat.id] ?? [])],
    }));
    const combined = [...page.messages, ...(activeMessagesCacheRef.current.get(chat.id) ?? [])];
    activeMessagesCacheRef.current.delete(chat.id);
    activeMessagesCacheRef.current.set(chat.id, combined);
    currentMessagesCursorRef.current = page.nextCursor;
    messageCursorCacheRef.current.set(chat.id, page.nextCursor);
    setHasOlderInternalMessages(page.nextCursor !== null);
    return page.messages.length;
  }, [currentChatRef]);
  const openInternalChatRef = useRef(openInternalChat);
  openInternalChatRef.current = openInternalChat;

  useEffect(() => {
    const chat = currentChatRef.current;
    if (!chat || chat.chatType !== "internal") return;
    activeMessagesCacheRef.current.delete(chat.id);
    activeMessagesCacheRef.current.set(chat.id, currentInternalChatMessages);
  }, [currentChatRef, currentInternalChatMessages]);
  const deleteInternalChat = async (id: number) => {
    if (api.current) {
      try {
        await api.current.deleteInternalChat(id);
        toast.success("Chat deletado com sucesso!");
        setInternalChats((prev) => prev.filter((chat) => chat.id !== id));
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

      toast.success("Chat finalizado com sucesso!");

      setMessages((prev) => {
        if (prev[id]) {
          delete prev[id];
        }
        return { ...prev };
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
            await api.current.ax.post(`/api/internal/chats/${data.chatId}/messages`, formData, {
              headers: {
                "Content-Type": "multipart/form-data",
                "x-upload-trace-id": traceId,
              },
              timeout: INTERNAL_UPLOAD_TIMEOUT_MS,
              maxBodyLength: Infinity,
              maxContentLength: Infinity,
            });

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

        await api.current.sendMessageToInternalChat(data);
      }
    },
    [token],
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

  useEffect(() => {
    if (token && user && usersLoaded && users.length > 0) {
      api.current.setAuth(token);
      let active = true;
      if (cacheScope) {
        void hybridCache.get<WppContact[]>(cacheScope, "contacts").then((cachedContacts) => {
          if (active && cachedContacts) setContacts(cachedContacts);
        });
      }
      wppApi.current.getContacts().then((res) => {
        const loadedContacts = Array.isArray(res) ? res.map(projectDirectoryContact) : [];
        if (active) setContacts(loadedContacts);
        if (cacheScope) void hybridCache.set(cacheScope, "contacts", loadedContacts);
      });
      api.current.getInternalChatsBySession(null, !isHybridCacheEnabled()).then((payload) => {
        const chats = Array.isArray(payload?.chats) ? payload.chats : [];
        const messages = Array.isArray(payload?.messages) ? payload.messages : [];

        const { chatsMessages, detailedChats } = processInternalChatsAndMessages(
          user!.CODIGO,
          users,
          chats,
          messages,
        );

        setInternalChats(detailedChats || []);
        setMessages(chatsMessages || []);
      });
      return () => {
        active = false;
      };
    }

    setInternalChats([]);
    setMessages({});
  }, [cacheScope, token, user, usersLoaded, users, wppApi]);

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

  useEffect(() => {
    if (socket && user && users.length > 0) {
      const unsubscribers: Array<() => void> = [];
      // Evento de nova conversa
      unsubscribers.push(
        socket.subscribe(SocketEventType.InternalChatStarted, (data: any) =>
          InternalChatStartedHandler(
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
          )(data),
        ),
      );

      unsubscribers.push(
        socket.subscribe(SocketEventType.InternalChatFinished, (data: any) =>
          InternalChatFinishedHandler(
            socket,
            internalChatsRef.current,
            currentChatRef,
            setMessages,
            setInternalChats,
            setCurrentChat,
            setCurrentChatMessages,
          )(data),
        ),
      );

      // Evento de nova mensagem
      unsubscribers.push(
        socket.subscribe(SocketEventType.InternalMessage, (data: any) =>
          InternalReceiveMessageHandler(
            api.current,
            setMessages,
            setCurrentChatMessages,
            setInternalChats,
            currentChatRef,
            usersRef.current,
            contactsRef.current,
            user!,
            phoneNameMapRef.current,
            whatsappSenderNameMapRef.current,
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
          )(data),
        ),
      );

      // Evento de edição de mensagem
      unsubscribers.push(
        socket.subscribe(
          SocketEventType.InternalMessageEdit,
          InternalMessageEditHandler(setMessages, setCurrentChatMessages, currentChatRef),
        ),
      );

      unsubscribers.push(
        socket.subscribe(
          SocketEventType.WppMessageReaction,
          InternalMessageReactionHandler(setMessages, setCurrentChatMessages),
        ),
      );

      unsubscribers.push(
        socket.subscribe(
          SocketEventType.InternalMessageDelete,
          InternalMessageDeleteHandler(setMessages, setCurrentChatMessages),
        ),
      );

      // Evento de status de mensagem
      unsubscribers.push(
        socket.subscribe(
          SocketEventType.InternalMessageStatus,
          InternalMessageStatusHandler(setMessages, setCurrentChatMessages, currentChatRef),
        ),
      );

      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    }
  }, [socket, user, users.length]);

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
