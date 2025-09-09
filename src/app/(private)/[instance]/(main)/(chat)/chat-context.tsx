import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
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
import { toast } from "react-toastify";

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
  handleEditMessage: (message: WppMessage) => void;
  handleStopEditMessage: () => void;
  editingMessage: WppMessage | null;
}

interface ChatProviderProps {
  children: ReactNode;
}

const initialState: SendMessageDataState = {
  text: "",
  sendAsAudio: false,
  sendAsDocument: false,
  isEmojiMenuOpen: false,
  forwardMode: false,
  selectedMessages: [],
};

export const ChatContext = createContext({} as IChatContext);

export default function ChatProvider({ children }: ChatProviderProps) {
  const {
    sendMessage,
    currentChat,
    messages: whatsappMsgs,
    editMessage,
  } = useContext(WhatsappContext);
  const { sendInternalMessage, messages: internalMsgs } = useContext(InternalChatContext);
  const [state, dispatch] = useReducer(ChatReducer, initialState);
  const [quotedMessage, setQuotedMessage] = useState<WppMessage | InternalMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<WppMessage | null>(null);

  const handleSendMessage = () => {
    if (currentChat && currentChat.chatType === "wpp" && currentChat.contact && !editingMessage) {
      try {
        sendMessage(currentChat.contact.phone, {
          ...state,
          contactId: currentChat.contact.id,
          chatId: currentChat.id,
          file: state.file,
        });
      } catch (err) {
        toast.error("Falha inesperada ao enviar mensagem.\nRecarregue a página e tente novamente.");
        console.error("Erro inesperado ao chamar sendMessage", err);
      }
    }

    if (editingMessage && currentChat && currentChat.chatType === "wpp" && currentChat.contact) {
      try {
        editMessage(String(editingMessage.id), state.text);
      } catch (err) {
        toast.error("Falha inesperada ao editar mensagem.\nRecarregue a página e tente novamente.");
        console.error("Erro inesperado ao chamar sendMessage para editar", err);
      }
    }

    if (currentChat && currentChat.chatType === "internal") {
      sendInternalMessage({
        chatId: currentChat.id,
        text: state.text,
        sendAsAudio: state.sendAsAudio,
        sendAsDocument: state.sendAsDocument,
        quotedId: state.quotedId,
        file: state.file,
        fileId: state.fileId,
        mentions: state.mentions,
      });
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

  const handleEditMessage = useCallback(
    (message: WppMessage) => {
      setQuotedMessage(null);
      setEditingMessage(message);
    },
    [editingMessage],
  );

  const handleStopEditMessage = useCallback(() => {
    setEditingMessage(null);
  }, [setEditingMessage]);

  useEffect(() => {
    return () => {
      dispatch({ type: "reset" });
      setEditingMessage(null);
      setQuotedMessage(null);
    };
  }, [currentChat, setQuotedMessage, setEditingMessage, dispatch]);

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
        editingMessage,
        handleEditMessage,
        handleStopEditMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
