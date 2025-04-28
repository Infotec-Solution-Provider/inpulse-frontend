import { createContext, useState, useEffect, useRef, useCallback, useContext } from "react";
import { InternalChatClient, InternalChat, InternalMessage, SocketEventType, InternalChatWithDetails } from "@in.pulse-crm/sdk";
import { AuthContext } from "@/app/auth-context";
import { SocketContext } from "./socket-context";
import InternalChatStartedHandler from "@/lib/event-handlers/internal-chat-started";
import InternalMessageStatusHandler from "@/lib/event-handlers/internal-message-status";
import InternalReceiveMessageHandler from "@/lib/event-handlers/internal-message";
import processChatsAndMessages from "@/lib/process-chats-and-messages";
import processInternalChatsAndMessages from "@/lib/process-internal-chats-and-messages";

export interface DetailedChat extends InternalChatWithDetails {
  lastMessage: InternalMessage | null;
  chatType: 'internal'
  isUnread: boolean|true;

}

interface InternalChatContextType {
  internalApi: React.RefObject<InternalChatClient>;
  internalChats: DetailedChat[];
  messages: Record<number, InternalMessage[]>;
  sendMessageInternal: (to: number,userId:any, content: string) => void;
  openInternalChat: (chat: DetailedChat) => void;
  currentInternalChat: DetailedChat | null;
  startInternalChatByContactId: (contactId: number) => void;
  currentInternalChatMessages: InternalMessage[];
}
const INTENAL_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";

export const InternalChatContext = createContext({} as InternalChatContextType);

export function InternalChatProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useContext(SocketContext);

  const [internalChats, setInternalChats] = useState<DetailedChat[]>([]);
  const [messages, setMessages] = useState<Record<number, InternalMessage[]>>({});
  const [currentInternalChat, setCurrentChat] = useState<DetailedChat | null>(null);
  const currentChatRef = useRef<DetailedChat | null>(null);
  
  const [currentInternalChatMessages, setCurrentChatMessages] = useState<InternalMessage[]>([]);
  const api = useRef(new InternalChatClient(INTENAL_BASE_URL));
  const { token, user, instance } = useContext(AuthContext);


  const openInternalChat = useCallback(
    (chat: DetailedChat) => {
      setCurrentChat(chat);
      setCurrentChatMessages(messages[chat.internalcontactId || 0] || []);
      currentChatRef.current = chat;
      if (chat.internalcontactId) {
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
  const sendMessageInternal = useCallback((chatId: any, userId:any, content: string) => {
    if(token){
      api.current.setAuth(token);
      api.current.sendMessageToChat(chatId, userId.CODIGO, content);
    }

  }, []);

  useEffect(() => {

    if (token) {
      api.current.setAuth(token);
      api.current.getChatsBySession(true, true).then(( { chats, messages }) => {
        const { chatsMessages, detailedChats } = processInternalChatsAndMessages(chats, messages);

        setInternalChats(detailedChats);
        setMessages(chatsMessages);

      });
    
    }else {
      setInternalChats([]);
      setMessages({});
    }
  }, [token,api.current]);
  
  const startInternalChatByContactId = useCallback(
    (contactId: number) => {
      api.current.startChatByContactId(contactId);
    },
    [api, token],
  );

  useEffect(() => {
    if (socket) {
          // Evento de nova conversa
          socket.on(
            SocketEventType.InternalChatStarted,
            InternalChatStartedHandler(api.current, socket, setMessages, setInternalChats),
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
            ),
          );
    
          // Evento de status de mensagem
          socket.on(
            SocketEventType.InternalMessageStatus,
            InternalMessageStatusHandler(setMessages, setCurrentChatMessages, currentChatRef),
          );
          
    }
  }, [socket, currentInternalChat]);
  

  return (
    <InternalChatContext.Provider value={{
      internalApi: api,
      internalChats,
      messages,
      sendMessageInternal,
      startInternalChatByContactId,
      openInternalChat,
      currentInternalChat,
      currentInternalChatMessages
    }}>
      {children}
    </InternalChatContext.Provider>
  );
}
