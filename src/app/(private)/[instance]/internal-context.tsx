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
import { DetailedChat, useWhatsappContext } from "./whatsapp-context";
import {
  createFileUploadTraceId,
  logFileUploadTrace,
  logFileUploadTraceError,
} from "../../../lib/utils/file-upload-trace";
import { dispatchConfiguredNotification } from "../../../lib/utils/notification-dispatch";
import { shouldDispatchNotification } from "../../../lib/utils/notification-preferences";

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

  users: User[];
  contacts: WppContact[];
}

const INTENAL_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";
const INTERNAL_UPLOAD_TIMEOUT_MS = Number(
  process.env["NEXT_PUBLIC_UPLOAD_TIMEOUT_MS"] || "300000",
);

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
  } = useWhatsappContext();

  const [internalChats, setInternalChats] = useState<DetailedInternalChat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [messages, setMessages] = useState<Record<number, InternalMessage[]>>({});
  const [monitorInternalChats, setMonitorInternalChats] = useState<DetailedInternalChat[]>([]);
  const [monitorMessages, setMonitorMessages] = useState<Record<number, InternalMessage[]>>({});
  const [contacts, setContacts] = useState<WppContact[]>([]);

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
  const api = useRef(new InternalChatClient(INTENAL_BASE_URL));
  const userInitiatedInternalChat = useRef<boolean>(false);
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
        await api.current.ax.post(
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

    usersService
      .getUsers({ perPage: "999" })
      .then((res) => setUsers(Array.isArray(res?.data) ? res.data : []))
      .catch((err) => {
        console.error("Falha ao carregar usuários internos", err);
        setUsers([]);
      })
      .finally(() => setUsersLoaded(true));
  }, [token]);

  useEffect(() => {
    if (token && user && usersLoaded && users.length > 0) {
      api.current.setAuth(token);
      wppApi.current.getContacts().then((res) => {
        setContacts(Array.isArray(res) ? res : []);
      });
      api.current.getInternalChatsBySession().then((payload) => {
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
      return;
    }

    setInternalChats([]);
    setMessages({});
  }, [token, user, usersLoaded, users]);

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

      // Evento de edição de mensagem
      socket.on(
        SocketEventType.InternalMessageEdit,
        InternalMessageEditHandler(setMessages, setCurrentChatMessages, currentChatRef),
      );

      socket.on(
        SocketEventType.WppMessageReaction,
        InternalMessageReactionHandler(setMessages, setCurrentChatMessages),
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
        socket.off(SocketEventType.WppMessageReaction);
        socket.off(SocketEventType.InternalMessageDelete);
        socket.off(SocketEventType.InternalChatFinished);
      };
    }
  }, [socket, user, users, currentInternalChatMessages, notificationPreferences]);

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
      }}
    >
      {children}
    </InternalChatContext.Provider>
  );
}
