import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
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
import { AuthContext } from "@/app/auth-context";
import { createMessageAttemptKey } from "@/lib/utils/reliable-message-send";

interface IChatContext {
  state: SendMessageDataState;
  dispatch: React.Dispatch<ChangeMessageDataAction>;
  sendMessage: () => Promise<boolean>;
  isSending: boolean;
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
  const { currentChat } = useContext(WhatsappContext);
  const { instance, user } = useContext(AuthContext);
  const scope = JSON.stringify([instance, user?.CODIGO, currentChat?.chatType, currentChat?.id]);
  return <ScopedChatProvider scope={scope}>{children}</ScopedChatProvider>;
}

function ScopedChatProvider({ children, scope }: ChatProviderProps & { scope: string }) {
  const {
    sendMessage,
    currentChat,
    messages: whatsappMsgs,
    editMessage,
    isReadOnlyMode,
    selectedChannel,
  } = useContext(WhatsappContext);
  const { sendInternalMessage, messages: internalMsgs } = useContext(InternalChatContext);
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const activeScopeRef = useRef(scope);
  const [isSending, setSending] = useState(false);
  const sendingScopes = useRef(new Set<string>());
  const dispatch = useCallback(
    (action: ChangeMessageDataAction) => {
      if (activeScopeRef.current !== scope) return;
      const next = ChatReducer(stateRef.current, action);
      stateRef.current = next;
      setState(next);
    },
    [scope],
  );

  const [quotedMessage, setQuotedMessage] = useState<WppMessage | InternalMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<WppMessage | InternalMessage | null>(null);
  if (activeScopeRef.current !== scope) {
    activeScopeRef.current = scope;
    stateRef.current = { ...initialState };
    setState(stateRef.current);
    setSending(sendingScopes.current.has(scope));
    setQuotedMessage(null);
    setEditingMessage(null);
  }

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
    if (sendingScopes.current.has(scope) || !currentChat) return false;
    if (isReadOnlyMode) {
      toast.info("Esta conversa esta em modo somente leitura.");
      return false;
    }
    if (!stateRef.current.text.trim() && !stateRef.current.file && !stateRef.current.fileId)
      return false;
    sendingScopes.current.add(scope);
    setSending(true);
    const snapshot = stateRef.current;
    const sentEditingMessage = editingMessage;
    try {
      if (!editingMessage && currentChat.chatType === "wpp") {
        if (!currentChat.contact) throw new Error("Contato não encontrado para envio.");
        const clientId = selectedChannel?.id;
        if (!clientId) throw new Error("Nenhum canal selecionado para enviar a mensagem.");
        const contactAddress = resolveContactAddress(
          currentChat.contact.id,
          currentChat.contact.phone || (currentChat.contact as { whatsappId?: string }).whatsappId,
        );
        if (!contactAddress) throw new Error("Não foi possível identificar o destino do contato.");
        await sendMessage(contactAddress, {
          ...snapshot,
          idempotencyKey: createMessageAttemptKey(),
          clientId,
          contactId: currentChat.contact.id,
          chatId: currentChat.id,
        });
      } else if (editingMessage) {
        await editMessage(
          String(editingMessage.id),
          snapshot.text,
          currentChat.chatType === "internal",
        );
      } else {
        await sendInternalMessage({
          ...snapshot,
          chatId: currentChat.id,
        });
      }
      if (activeScopeRef.current === scope && stateRef.current === snapshot) {
        dispatch({ type: "reset" });
      }
      if (activeScopeRef.current === scope) {
        if (stateRef.current.quotedId !== snapshot.quotedId)
          setQuotedMessage((current) => (current?.id === snapshot.quotedId ? null : current));
        setEditingMessage((current) => (current === sentEditingMessage ? null : current));
      }
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível confirmar o envio.",
      );
      return false;
    } finally {
      sendingScopes.current.delete(scope);
      if (activeScopeRef.current === scope) setSending(false);
    }
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

  return (
    <ChatContext.Provider
      value={{
        state,
        quotedMessage,
        dispatch,
        isReadOnlyMode,
        isSending,
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
