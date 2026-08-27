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
import { InternalMessage, WppMessage } from "@/lib/sdk-local";
import { toast } from "react-toastify";

interface IChatContext {
  state: SendMessageDataState;
  dispatch: React.Dispatch<ChangeMessageDataAction>;
  sendMessage: () => void;
  applySuggestedText: (text: string) => void;
  isReadOnlyMode: boolean;
  getMessageById: (
    chatId: number,
    id: number,
    isInternal?: boolean,
  ) => InternalMessage | WppMessage | null;
  handleQuoteMessage: (message: WppMessage | InternalMessage) => void;
  handleQuoteMessageRemove: () => void;
  quotedMessage: WppMessage | InternalMessage | null;
  handleEditMessage: (message: WppMessage | InternalMessage) => void;
  handleStopEditMessage: () => void;
  editingMessage: WppMessage | InternalMessage | null;
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
    isReadOnlyMode,
  } = useContext(WhatsappContext);
  const { sendInternalMessage, messages: internalMsgs } = useContext(InternalChatContext);
  const [state, dispatch] = useReducer(ChatReducer, initialState);
  const [quotedMessage, setQuotedMessage] = useState<WppMessage | InternalMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<WppMessage | InternalMessage | null>(null);

  const resolveContactAddress = useCallback(
    (contactId: number, fallbackPhone?: string | null): string | null => {
      const fromContactPhone = fallbackPhone?.trim() || "";
      if (fromContactPhone) {
        return fromContactPhone;
      }

      const history = whatsappMsgs[contactId] || [];
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (!msg) continue;

        if (!msg.from.startsWith("me:") && !msg.from.startsWith("system:")) {
          return msg.from.replace(/^me:/, "").split("@")[0] || null;
        }

        if (msg.to && !msg.to.startsWith("me:")) {
          return msg.to.replace(/^me:/, "").split("@")[0] || null;
        }
      }

      return null;
    },
    [whatsappMsgs],
  );

  const applySuggestedText = useCallback(
    (text: string) => {
      if (isReadOnlyMode) {
        toast.info("Esta conversa esta em modo somente leitura.");
        return;
      }

      setEditingMessage(null);
      dispatch({ type: "set-mentions", mentions: [] });
      dispatch({ type: "change-text", text });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chat:focus-composer"));
      }
    },
    [dispatch, isReadOnlyMode],
  );

  const handleSendMessage = async () => {
    if (isReadOnlyMode) {
      toast.info("Esta conversa esta em modo somente leitura.");
      return;
    }

    if (currentChat && currentChat.chatType === "wpp" && currentChat.contact && !editingMessage) {
      const contactAddress = resolveContactAddress(
        currentChat.contact.id,
        (currentChat.contact as unknown as { phone?: string | null; whatsappId?: string | null }).phone ||
          (currentChat.contact as unknown as { phone?: string | null; whatsappId?: string | null }).whatsappId ||
          null,
      );

      if (!contactAddress) {
        toast.error("Nao foi possivel identificar o destino do contato para envio.");
        return;
      }

      try {
        sendMessage(contactAddress, {
          ...state,
          contactId: currentChat.contact.id,
          chatId: currentChat.id,
          ...(state.file ? { file: state.file } : {}),
          sendAsDocument: state.sendAsDocument,
          sendAsAudio: state.sendAsAudio,
        });
      } catch (err) {
        toast.error("Falha inesperada ao enviar mensagem.\nRecarregue a página e tente novamente.");
        console.error("Erro inesperado ao chamar sendMessage", err);
      }
    }

    if (editingMessage && currentChat && currentChat.chatType === "wpp" && currentChat.contact) {
      try {
        await editMessage(String(editingMessage.id), state.text);
      } catch (err) {
        toast.error("Não foi possível editar esta mensagem.");
        console.error("Erro inesperado ao editar mensagem", err);
        return;
      }
    }

    if (currentChat && currentChat.chatType === "internal" && !editingMessage) {
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

    if (editingMessage && currentChat && currentChat.chatType === "internal") {
      try {
        await editMessage(String(editingMessage.id), state.text, true);
      } catch (err) {
        toast.error("Nao foi possivel editar esta mensagem.");
        console.error("Erro inesperado ao editar mensagem interna", err);
        return;
      }
    }

    dispatch({ type: "reset" });
    setEditingMessage(null);
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
      if (isReadOnlyMode) return;
      setQuotedMessage(message);
      dispatch({ type: "quote-message", id: message.id });
    },
    [dispatch, isReadOnlyMode],
  );

  const handleQuoteMessageRemove = useCallback(() => {
    setQuotedMessage(null);
    dispatch({ type: "remove-quoted-message" });
  }, [dispatch]);

  const handleEditMessage = useCallback(
    (message: WppMessage | InternalMessage) => {
      if (isReadOnlyMode) return;
      setQuotedMessage(null);
      setEditingMessage(message);
    },
    [isReadOnlyMode],
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
        isReadOnlyMode,
        sendMessage: handleSendMessage,
        applySuggestedText,
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
