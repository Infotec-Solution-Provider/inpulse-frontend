import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { WhatsappContext } from "../../whatsapp-context";
import ChatReducer, {
  ChangeMessageDataAction,
  SendMessageDataState,
} from "@/app/(private)/[instance]/(main)/(chat)/chat-reducer";
import { InternalChatContext } from "../../internal-context";
import { InternalMessage, WppMessage } from "@in.pulse-crm/sdk";

interface IChatContext {
  state: SendMessageDataState;
  dispatch: React.Dispatch<ChangeMessageDataAction>;
  sendMessage: () => void;
  getMessageById: (
    chatId: number,
    id: number,
    isInternal?: boolean,
  ) => InternalMessage | WppMessage | null;
  handleQuoteMessage: (message: WppMessage | InternalMessage) => void;
  handleQuoteMessageRemove: () => void;
  quotedMessage: WppMessage | InternalMessage | null;
}

interface ChatProviderProps {
  children: ReactNode;
}

const initialState: SendMessageDataState = {
  text: "",
  sendAsAudio: false,
  sendAsDocument: false,
  isEmojiMenuOpen: false,
};

export const ChatContext = createContext({} as IChatContext);

export default function ChatProvider({ children }: ChatProviderProps) {
  const { sendMessage, currentChat, messages: whatsappMsgs } = useContext(WhatsappContext);
  const { sendInternalMessage, messages: internalMsgs } = useContext(InternalChatContext);
  const [state, dispatch] = useReducer(ChatReducer, initialState);
  const [quotedMessage, setQuotedMessage] = useState<WppMessage | InternalMessage | null>(null);

  const handleSendMessage = () => {
    if (currentChat && currentChat.chatType === "wpp" && currentChat.contact) {
      try {
        sendMessage(currentChat.contact.phone, {
          ...state,
          contactId: currentChat.contact.id,
          chatId: currentChat.id,
        });
      } catch (err) {
        console.error("Erro inesperado ao chamar sendMessage", err);
      }
    }

    if (currentChat && currentChat.chatType === "internal") {
      sendInternalMessage({ ...state, chatId: currentChat.id });
    }

    dispatch({ type: "reset" });
  };

  const getMessageById = useCallback(
    (
      contextId: number,
      id: number,
      isInternal: boolean = false,
    ): InternalMessage | WppMessage | null => {
      if (isInternal) {
        return internalMsgs[contextId]?.find((msg) => msg.id === id) || null;
      }

      return whatsappMsgs[contextId]?.find((msg) => msg.id === id) || null;
    },
    [whatsappMsgs, internalMsgs],
  );

  const handleQuoteMessage = useCallback(
    (message: WppMessage | InternalMessage) => {
      setQuotedMessage(message);
      dispatch({ type: "quote-message", id: message.id });
    },
    [dispatch],
  );

  const handleQuoteMessageRemove = useCallback(() => {
    setQuotedMessage(null);
    dispatch({ type: "remove-quoted-message" });
  }, [dispatch]);

  useEffect(() => {
    dispatch({ type: "reset" });
  }, [currentChat]);

  return (
    <ChatContext.Provider
      value={{
        state,
        quotedMessage,
        dispatch,
        sendMessage: handleSendMessage,
        getMessageById,
        handleQuoteMessage,
        handleQuoteMessageRemove,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
