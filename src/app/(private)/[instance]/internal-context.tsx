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
  SetStateAction,
} from "react";
import { toast } from "react-toastify";
import { SocketContext } from "./socket-context";
import { DetailedChat, useWhatsappContext } from "./whatsapp-context";
import {
  createFileUploadTraceId,
  logFileUploadTrace,
  logFileUploadTraceError,
} from "../../../lib/utils/file-upload-trace";
import { dispatchConfiguredNotification } from "../../../lib/utils/notification-dispatch";
import { shouldDispatchNotification } from "../../../lib/utils/notification-preferences";
import { useConfirmedReaction } from "@/lib/hooks/use-confirmed-reaction";
import {
  canReactToInternalMessage,
  MessageReactionTarget,
  preserveReactionHistory,
  preserveReactionHistoryCache,
} from "@/lib/utils/message-reactions";
import type { MessageReactionSnapshot } from "@/lib/sdk-local";
import { MentionDirectoryContext } from "@/lib/components/message-mention-text";
import { ContactsContext } from "./(cruds)/contacts/contacts-context";
import {
  createMentionDirectory,
  EMPTY_MENTION_DIRECTORY,
  MentionDirectory,
  preserveChatMentionHistory,
  preserveMentionHistory,
  preserveMentionHistoryCache,
} from "@/lib/utils/message-mentions";

export interface DetailedInternalChat extends InternalChat {
  lastMessage: InternalMessage | null;
  chatType: "internal";
  isUnread: boolean | true;
  users: User[];
  participants: InternalChatMember[];
}

interface InternalChatContextType {
  mentionDirectory: MentionDirectory;
  internalApi: React.RefObject<InternalChatClient>;
  internalChats: DetailedInternalChat[];
  messages: Record<number, InternalMessage[]>;
  sendInternalMessage: (data: InternalSendMessageData) => Promise<void>;
  reactToInternalMessage: (
    message: InternalMessage,
    emoji: string,
  ) => Promise<MessageReactionSnapshot>;
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
    chats: wppChats,
    wppApi,
    notificationPreferences,
    isReadOnlyMode,
    channels,
    mentionDirectoryRef,
  } = useWhatsappContext();
  const { token, user, instance } = useContext(AuthContext);
  const sessionScope = JSON.stringify([
    instance, user?.CODIGO, user?.SETOR, user?.NIVEL, user?.ATIVO, !!token,
  ]);
  const liveAuth = useRef({ token, user, scope: sessionScope });
  liveAuth.current = { token, user, scope: sessionScope };
  const { state: contactsState } = useContext(ContactsContext);
  const mentionScope = `${instance}:${user?.CODIGO ?? ""}`;
  const [directoryScope, setDirectoryScope] = useState(mentionScope);

  const [internalChats, setInternalChatsState] = useState<DetailedInternalChat[]>([]);
  const setInternalChats = useCallback((update: SetStateAction<DetailedInternalChat[]>) => {
    setInternalChatsState((previous) =>
      preserveChatMentionHistory(
        previous,
        typeof update === "function" ? update(previous) : update,
      ),
    );
  }, []);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersScope, setUsersScope] = useState<string | null>(null);
  const [messages, setMessagesState] = useState<Record<number, InternalMessage[]>>({});
  const [monitorInternalChats, setMonitorInternalChats] = useState<DetailedInternalChat[]>([]);
  const [monitorMessages, setMonitorMessagesState] = useState<Record<number, InternalMessage[]>>(
    {},
  );
  const knownMessagesRef = useRef({ messages, monitorMessages });
  knownMessagesRef.current = { messages, monitorMessages };
  const setMessages = useCallback((update: SetStateAction<Record<number, InternalMessage[]>>) => {
    setMessagesState((previous) =>
      preserveMentionHistoryCache(
        previous,
        preserveReactionHistoryCache(
          previous,
          typeof update === "function" ? update(previous) : update,
        ),
      ),
    );
  }, []);
  const setMonitorMessages = useCallback(
    (update: SetStateAction<Record<number, InternalMessage[]>>) => {
      setMonitorMessagesState((previous) =>
        preserveMentionHistoryCache(
          previous,
          preserveReactionHistoryCache(
            previous,
            typeof update === "function" ? update(previous) : update,
          ),
        ),
      );
    },
    [],
  );
  const [contacts, setContacts] = useState<WppContact[]>([]);
  const [whatsappSenderNameMap, setWhatsappSenderNameMap] = useState<Map<string, string>>(
    new Map(),
  );
  const mentionDirectory = useMemo(() => {
    if (!token || directoryScope !== mentionScope) return EMPTY_MENTION_DIRECTORY;
    const currentContacts = new Map(
      [...contacts, ...(contactsState?.contacts ?? [])]
        .filter((contact) => contact.instance === instance)
        .map((contact) => [contact.id, contact]),
    );
    return createMentionDirectory(users, [...currentContacts.values()], whatsappSenderNameMap);
  }, [
    users,
    contacts,
    contactsState?.contacts,
    whatsappSenderNameMap,
    directoryScope,
    mentionScope,
    instance,
    !!token,
  ]);
  useEffect(() => {
    mentionDirectoryRef.current = mentionDirectory;
    return () => {
      mentionDirectoryRef.current = EMPTY_MENTION_DIRECTORY;
    };
  }, [mentionDirectory, mentionDirectoryRef]);
  useEffect(() => {
    setUsers([]);
    setContacts([]);
    setWhatsappSenderNameMap(new Map());
    setDirectoryScope(mentionScope);
  }, [mentionScope, sessionScope]);

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

  const [currentInternalChatMessages, setCurrentChatMessagesState] = useState<InternalMessage[]>(
    [],
  );
  const setCurrentChatMessages = useCallback((update: SetStateAction<InternalMessage[]>) => {
    setCurrentChatMessagesState((previous) => {
      const incoming = typeof update === "function" ? update(previous) : update;
      const chats = new Set(incoming.map((message) => message.internalChatId));
      const known = [...chats].flatMap((id) => [
        ...(knownMessagesRef.current.messages[id] ?? []),
        ...(knownMessagesRef.current.monitorMessages[id] ?? []),
      ]);
      return preserveMentionHistory(
        preserveMentionHistory(previous, known),
        preserveMentionHistory(
          previous,
          preserveReactionHistory(
            preserveReactionHistory(previous, known),
            preserveReactionHistory(previous, incoming),
          ),
        ),
      );
    });
  }, []);
  const api = useRef(new InternalChatClient(INTENAL_BASE_URL));
  useEffect(() => {
    api.current.setAuth(token || "");
    if (token) usersService.setAuth(token);
  }, [token]);
  const userInitiatedInternalChat = useRef<boolean>(false);
  const applyConfirmedReaction = useCallback(
    (snapshot: MessageReactionSnapshot) => {
      InternalMessageReactionHandler(
        setMessages,
        setCurrentChatMessages,
        currentChatRef,
        setMonitorMessages,
        "http",
      )(snapshot);
    },
    [currentChatRef],
  );
  const requestReaction = useCallback(
    (target: MessageReactionTarget, emoji: string, signal: AbortSignal) => {
      if (isReadOnlyMode)
        return Promise.reject(new Error("Esta conversa está em modo somente leitura."));
      return api.current.setMessageReaction(target.messageId, emoji, signal);
    },
    [isReadOnlyMode],
  );
  const confirmReaction = useConfirmedReaction(requestReaction, applyConfirmedReaction);
  const reactToInternalMessage = useCallback(
    (message: InternalMessage, emoji: string) => {
      const activeChat = currentChatRef.current;
      const chat =
        activeChat?.chatType === "internal" && activeChat.id === message.internalChatId
          ? activeChat
          : [...internalChats, ...monitorInternalChats].find(
              (item) => item.id === message.internalChatId,
            );
      const channel = channels.find((item) => item.id === message.clientId);
      if (!canReactToInternalMessage(message, chat, channel?.type)) {
        return Promise.reject(
          new Error(
            "Reações estão disponíveis apenas para mensagens de grupos WhatsApp sincronizados.",
          ),
        );
      }
      return confirmReaction(
        { messageType: "internal", messageId: message.id, clientId: message.clientId },
        emoji,
      );
    },
    [channels, confirmReaction, currentChatRef, internalChats, monitorInternalChats],
  );

  useEffect(
    () =>
      socket.subscribe(
        SocketEventType.WppMessageReaction,
        InternalMessageReactionHandler(
          setMessages,
          setCurrentChatMessages,
          currentChatRef,
          setMonitorMessages,
        ),
      ),
    [socket, currentChatRef],
  );

  const refreshWhatsappSenderNames = useCallback(async () => {
    const session = liveAuth.current;
    if (session.scope !== sessionScope) return;
    if (!session.token) {
      setWhatsappSenderNameMap(new Map());
      return;
    }

    api.current.setAuth(session.token);
    const names = await api.current.getWhatsappSenderNames();
    if (liveAuth.current.scope !== sessionScope) return;
    setWhatsappSenderNameMap(
      new Map(
        names
          .filter((sender) => sender.displayName)
          .map((sender) => [sender.senderId, sender.displayName]),
      ),
    );
  }, [sessionScope]);

  useEffect(() => {
    void refreshWhatsappSenderNames().catch(() => {
      if (liveAuth.current.scope !== sessionScope) return;
      setWhatsappSenderNameMap(new Map());
    });
  }, [refreshWhatsappSenderNames, sessionScope]);

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
    const session = liveAuth.current;
    if (!session.token) {
      setUsers([]);
      setUsersLoaded(false);
      setUsersScope(null);
      return;
    }

    usersService.setAuth(session.token);
    setUsersLoaded(false);
    setUsersScope(null);
    let active = true;
    const isCurrent = () => active && liveAuth.current.scope === sessionScope;

    usersService
      .getUsers({ perPage: "999" })
      .then((res) => {
        if (isCurrent()) setUsers(Array.isArray(res?.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Falha ao carregar usuários internos", err);
        if (isCurrent()) setUsers([]);
      })
      .finally(() => {
        if (isCurrent()) {
          setUsersScope(sessionScope);
          setUsersLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [sessionScope]);

  useEffect(() => {
    const session = liveAuth.current;
    const sessionUser = session.user;
    let active = true;
    const isCurrent = () => active && liveAuth.current.scope === sessionScope;
    if (session.token && sessionUser && usersScope === sessionScope && usersLoaded && users.length > 0) {
      api.current.setAuth(session.token);
      wppApi.current.getContacts().then((res) => {
        if (!isCurrent()) return;
        setContacts(Array.isArray(res) ? res : []);
      }).catch((error) => {
        if (isCurrent()) console.error("Falha ao carregar contatos internos", error);
      });
      api.current.getInternalChatsBySession().then((payload) => {
        if (!isCurrent()) return;
        const chats = Array.isArray(payload?.chats) ? payload.chats : [];
        const messages = Array.isArray(payload?.messages) ? payload.messages : [];

        const { chatsMessages, detailedChats } = processInternalChatsAndMessages(
          sessionUser.CODIGO,
          users,
          chats,
          messages,
        );

        setInternalChats(detailedChats || []);
        setMessages(chatsMessages || []);
      }).catch((error) => {
        if (isCurrent()) console.error("Falha ao carregar conversas internas", error);
      });
      return () => {
        active = false;
      };
    }

    setInternalChats([]);
    setMessages({});
  }, [sessionScope, usersScope, usersLoaded, users, wppApi]);

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
          userInitiatedInternalChat,
          ({ event, title, body, isChatFocused }) => {
            if (
              !shouldDispatchNotification(notificationPreferences, {
                event,
                isChatFocused,
              })
            ) {
              return;
            }

            dispatchConfiguredNotification(notificationPreferences, event, {
              title,
              body,
              icon: HorizontalLogo.src,
            });
          },
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
          phoneNameMap,
          whatsappSenderNameMap,
          ({ event, title, body, isChatFocused }) => {
            if (
              !shouldDispatchNotification(notificationPreferences, {
                event,
                isChatFocused,
              })
            ) {
              return;
            }
            dispatchConfiguredNotification(notificationPreferences, event, {
              title,
              body,
              icon: HorizontalLogo.src,
            });
          },
          mentionDirectory,
        ),
      );

      // Evento de edição de mensagem
      socket.on(
        SocketEventType.InternalMessageEdit,
        InternalMessageEditHandler(setMessages, setCurrentChatMessages, currentChatRef),
      );

      socket.on(
        SocketEventType.InternalMessageDelete,
        InternalMessageDeleteHandler(setMessages, setCurrentChatMessages),
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
        socket.off(SocketEventType.InternalMessageEdit);
        socket.off(SocketEventType.InternalMessageDelete);
        socket.off(SocketEventType.InternalChatFinished);
      };
    }
  }, [
    socket,
    user,
    users,
    contacts,
    phoneNameMap,
    whatsappSenderNameMap,
    mentionDirectory,
    currentInternalChatMessages,
    notificationPreferences,
  ]);

  return (
    <InternalChatContext.Provider
      value={{
        mentionDirectory,
        internalApi: api,
        internalChats,
        messages,
        setCurrentChat,
        sendInternalMessage,
        reactToInternalMessage,
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
      }}
    >
      <MentionDirectoryContext.Provider value={mentionDirectory}>
        {children}
      </MentionDirectoryContext.Provider>
    </InternalChatContext.Provider>
  );
}
