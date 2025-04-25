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
  SendMessageData,
  SocketEventType,
  WhatsappClient,
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

export interface DetailedChat extends WppChatWithDetails {
  isUnread: boolean;
  lastMessage: WppMessage | null;
}
interface IWhatsappContext {
  wppApi: React.RefObject<WhatsappClient>;
  chats: DetailedChat[];
  messages: Record<number, WppMessage[]>;
  currentChat: DetailedChat | null;
  currentChatMessages: WppMessage[];
  openChat: (chat: DetailedChat) => void;
  sendMessage: (to: string, data: SendMessageData) => void;
  chatFilters: ChatsFiltersState;
  changeChatFilters: ActionDispatch<[ChangeFiltersAction]>;
  finishChat: (chatId: number, resultId: number) => void;
  startChatByContactId: (contactId: number) => void;
  updateChatContact: (contactId: number, newName: string) => void;
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
  const [currentChat, setCurrentChat] = useState<DetailedChat | null>(null); // Conversa que está aberta
  const currentChatRef = useRef<DetailedChat>(null); // Referência para a conversa atual
  const [currentChatMessages, setCurrentChatMessages] = useState<WppMessage[]>([]); // Mensagens da conversa aberta
  const [messages, setMessages] = useState<Record<number, WppMessage[]>>({}); // Mensagens de todas as conversas
  const api = useRef(new WhatsappClient(WPP_BASE_URL)); // Instância do cliente do whatsapp

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

      if (currentChat && currentChat.contactId === contactId && currentChat.contact) {
        setCurrentChat((prev) => {
          prev!.contact!.name = newName;
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
      console.log(token);
      api.current.finishChatById(chatId, resultId).then(() => {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      });
    },
    [api, token],
  );

  const startChatByContactId = useCallback(
    (contactId: number) => {
      api.current.startChatByContactId(contactId).then(() => {
        api.current.getChatsBySession(token || "", true, true).then(({ chats, messages }) => {
          const { chatsMessages, detailedChats } = processChatsAndMessages(chats, messages);

          setChats(detailedChats);
          setMessages(chatsMessages);
        });
      });
    },
    [api, token],
  );

  // Envia mensagem
  const sendMessage = useCallback(async (to: string, data: SendMessageData) => {
    api.current.sendMessage(to, data);
  }, []);

  // Carregamento inicial das conversas e mensagens
  useEffect(() => {
    api.current.setAuth(token || "");

    if (token) {
      api.current.getChatsBySession(token, true, true).then(({ chats, messages }) => {
        const { chatsMessages, detailedChats } = processChatsAndMessages(chats, messages);

        setChats(detailedChats);
        setMessages(chatsMessages);
      });
    } else {
      setChats([]);
      setMessages({});
    }
  }, [token]);

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
        finishChat,
        startChatByContactId,
        sendMessage,
        wppApi: api,
        chatFilters,
        changeChatFilters,
        updateChatContact,
      }}
    >
      {children}
    </WhatsappContext.Provider>
  );
}
