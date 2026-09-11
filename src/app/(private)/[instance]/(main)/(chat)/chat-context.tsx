import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
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
import {
  createMessageAttemptKey,
  isDefinitiveSendFailure,
} from "@/lib/utils/reliable-message-send";
import {
  EMPTY_PENDING_SENDS,
  getPendingChatSends,
  PendingChatSend,
  samePendingContent,
  subscribePendingChatSends,
  updatePendingChatSends,
} from "@/lib/utils/pending-chat-sends";

interface IChatContext {
  state: SendMessageDataState;
  dispatch: React.Dispatch<ChangeMessageDataAction>;
  sendMessage: () => Promise<boolean>;
  isSending: boolean;
  pendingSends: PendingChatSend[];
  checkPendingSend: (id: string) => Promise<void>;
  restoreFailedSend: (id: string) => void;
  discardFailedSend: (id: string) => void;
  acknowledgeInternalSend: (id: string) => void;
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
  const sessionScope = JSON.stringify([instance, user?.CODIGO]);
  return (
    <ScopedChatProvider key={sessionScope} scope={scope} sessionScope={sessionScope}>
      {children}
    </ScopedChatProvider>
  );
}

function ScopedChatProvider({
  children,
  scope,
  sessionScope,
}: ChatProviderProps & { scope: string; sessionScope: string }) {
  const {
    sendMessage,
    currentChat,
    messages: whatsappMsgs,
    editMessage,
    isReadOnlyMode,
    selectedChannel,
    lookupMessageAttempt,
  } = useContext(WhatsappContext);
  const { sendInternalMessage, messages: internalMsgs } = useContext(InternalChatContext);
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const activeScopeRef = useRef(scope);
  const [isSending, setSending] = useState(false);
  const sendingScopes = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const allPendingSends = useSyncExternalStore(
    subscribePendingChatSends,
    () => getPendingChatSends(sessionScope),
    () => EMPTY_PENDING_SENDS,
  );
  const pendingSends = allPendingSends.filter((attempt) => attempt.scope === scope);
  const hasSendingAttempt = pendingSends.some((attempt) => attempt.status === "sending");
  const checkingAttempts = useRef(new Set<string>());
  const updateAttempt = (id: string, patch: Partial<PendingChatSend>) =>
    updatePendingChatSends(sessionScope, (entries) =>
      entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  const removeAttempt = (id: string) =>
    updatePendingChatSends(sessionScope, (entries) => entries.filter((entry) => entry.id !== id));
  const settleAttempt = (id: string, message: WppMessage) => {
    if (message.status === "PENDING") {
      updateAttempt(id, {
        status: "sending",
        messageId: message.id,
        contactId: message.contactId ?? undefined,
        error: undefined,
      });
    } else if (message.status === "UNKNOWN" || message.status === "ERROR") {
      updateAttempt(id, {
        status: "unconfirmed",
        messageId: message.id,
        contactId: message.contactId ?? undefined,
        error: "O envio ainda não tem confirmação. Consulte antes de reenviar.",
      });
    } else {
      removeAttempt(id);
    }
  };

  useEffect(() => {
    for (const attempt of allPendingSends) {
      if (!attempt.messageId || !attempt.contactId) continue;
      const message = whatsappMsgs[attempt.contactId]?.find(
        (item) => item.id === attempt.messageId,
      );
      if (!message || message.status === "PENDING") continue;
      if (message.status === "UNKNOWN" || message.status === "ERROR") {
        if (attempt.status !== "unconfirmed")
          updateAttempt(attempt.id, {
            status: "unconfirmed",
            error: "O envio ainda não tem confirmação. Consulte antes de reenviar.",
          });
      } else removeAttempt(attempt.id);
    }
  }, [allPendingSends, whatsappMsgs, sessionScope]);
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
    if (!mounted.current || activeScopeRef.current !== scope) return false;
    if (
      sendingScopes.current.has(scope) ||
      !currentChat ||
      getPendingChatSends(sessionScope).some(
        (attempt) => attempt.scope === scope && attempt.status === "sending",
      )
    )
      return false;
    if (isReadOnlyMode) {
      toast.info("Esta conversa esta em modo somente leitura.");
      return false;
    }
    if (!stateRef.current.text.trim() && !stateRef.current.file && !stateRef.current.fileId)
      return false;
    const snapshot = stateRef.current;
    const sentEditingMessage = editingMessage;
    let attemptId = "";
    let contactAddress: string | null = null;
    const clientId = currentChat.chatType === "wpp" ? selectedChannel?.id : undefined;
    try {
      if (!editingMessage && currentChat.chatType === "wpp") {
        if (!currentChat.contact) throw new Error("Contato não encontrado para envio.");
        if (!clientId) throw new Error("Nenhum canal selecionado para enviar a mensagem.");
        contactAddress = resolveContactAddress(
          currentChat.contact.id,
          currentChat.contact.phone || (currentChat.contact as { whatsappId?: string }).whatsappId,
        );
        if (!contactAddress) throw new Error("Não foi possível identificar o destino do contato.");
      }
      if (
        !editingMessage &&
        getPendingChatSends(sessionScope).some((attempt) =>
          samePendingContent(attempt, scope, clientId, snapshot),
        )
      ) {
        toast.info(
          "Esta mensagem já está em envio ou aguardando confirmação. Consulte a tentativa pendente.",
        );
        return false;
      }
      if (!editingMessage) attemptId = createMessageAttemptKey();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar o envio.");
      return false;
    }

    sendingScopes.current.add(scope);
    setSending(true);
    if (editingMessage) {
      try {
        await editMessage(
          String(editingMessage.id),
          snapshot.text,
          currentChat.chatType === "internal",
        );
        if (mounted.current && activeScopeRef.current === scope) {
          if (stateRef.current === snapshot) dispatch({ type: "reset" });
          setEditingMessage((current) => (current === sentEditingMessage ? null : current));
        }
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível confirmar a edição.",
        );
        return false;
      } finally {
        sendingScopes.current.delete(scope);
        if (mounted.current && activeScopeRef.current === scope) setSending(false);
      }
    }

    const attempt: PendingChatSend = {
      id: attemptId,
      scope,
      snapshot,
      status: "sending",
      clientId,
      fileName: snapshot.file?.name,
    };
    updatePendingChatSends(sessionScope, (entries) => [...entries, attempt]);
    // Detach the accepted draft synchronously, before any upload or HTTP wait.
    dispatch({ type: "reset" });
    setQuotedMessage(null);

    const submit = async () => {
      try {
        const result =
          currentChat.chatType === "wpp"
            ? await sendMessage(contactAddress!, {
                ...snapshot,
                idempotencyKey: attempt.id,
                clientId,
                contactId: currentChat.contact!.id,
                chatId: currentChat.id,
              })
            : await sendInternalMessage({ ...snapshot, chatId: currentChat.id });
        if (result) settleAttempt(attempt.id, result);
        else removeAttempt(attempt.id);
      } catch (error) {
        // Internal endpoints can report 400 after persistence, so HTTP status
        // alone cannot prove that an internal message was never sent.
        const definitelyRejected = currentChat.chatType === "wpp" && isDefinitiveSendFailure(error);
        updateAttempt(attempt.id, {
          status: definitelyRejected ? "failed" : "unconfirmed",
          error: definitelyRejected
            ? error instanceof Error
              ? error.message
              : "O envio foi recusado."
            : currentChat.chatType === "internal"
              ? "Confirme na conversa se esta mensagem chegou antes de enviar novamente."
              : "Não foi possível confirmar o envio. A mensagem pode ter sido enviada.",
        });
      } finally {
        sendingScopes.current.delete(scope);
        if (mounted.current && activeScopeRef.current === scope) setSending(false);
      }
    };
    void submit();
    return true;
  };

  const checkPendingSend = async (id: string) => {
    const attempt = getPendingChatSends(sessionScope).find(
      (entry) => entry.id === id && entry.scope === scope,
    );
    if (
      !attempt?.clientId ||
      (attempt.status !== "unconfirmed" && !attempt.messageId) ||
      checkingAttempts.current.has(id)
    )
      return;
    checkingAttempts.current.add(id);
    try {
      const message = await lookupMessageAttempt(attempt.clientId, attempt.id);
      if (!mounted.current) return;
      if (message) settleAttempt(id, message);
      else
        updateAttempt(id, {
          status: attempt.messageId ? attempt.status : "unconfirmed",
          error:
            "A tentativa não foi localizada nesta consulta. Consulte novamente antes de reenviar.",
        });
    } catch {
      if (mounted.current)
        updateAttempt(id, {
          status: attempt.messageId ? attempt.status : "unconfirmed",
          error: "Não foi possível consultar o envio. Tente consultar novamente.",
        });
    } finally {
      checkingAttempts.current.delete(id);
    }
  };

  useEffect(() => {
    const waiting = pendingSends.filter(
      (attempt) => attempt.messageId && attempt.status === "sending",
    );
    if (!waiting.length) return;
    // Socket events normally settle the attempt; reads also recover a missed event.
    const timer = setInterval(() => {
      for (const attempt of waiting) void checkPendingSend(attempt.id);
    }, 5_000);
    return () => clearInterval(timer);
  }, [scope, allPendingSends, lookupMessageAttempt]);

  const restoreFailedSend = (id: string) => {
    if (!mounted.current || activeScopeRef.current !== scope || isReadOnlyMode) return;
    const attempt = getPendingChatSends(sessionScope).find(
      (entry) => entry.id === id && entry.scope === scope && entry.status === "failed",
    );
    if (!attempt) return;
    const draft = stateRef.current;
    if (draft.text || draft.file || draft.fileId || draft.quotedId || editingMessage) {
      toast.info(
        "O campo já contém um rascunho. Finalize ou limpe esse texto antes de recuperar a mensagem.",
      );
      return;
    }
    stateRef.current = { ...attempt.snapshot };
    setState(stateRef.current);
    if (attempt.snapshot.quotedId) {
      const contextId = currentChat?.chatType === "wpp" ? currentChat.contactId : currentChat?.id;
      setQuotedMessage(
        contextId
          ? getMessageById(
              contextId,
              attempt.snapshot.quotedId,
              currentChat?.chatType === "internal",
            )
          : null,
      );
    }
    removeAttempt(id);
    if (attempt.fileName && !attempt.snapshot.file && !attempt.snapshot.fileId)
      toast.info("Anexe o arquivo novamente antes de enviar.");
    window.dispatchEvent(new CustomEvent("chat:focus-composer"));
  };

  const discardFailedSend = (id: string) => {
    if (
      getPendingChatSends(sessionScope).some(
        (entry) => entry.id === id && entry.scope === scope && entry.status === "failed",
      )
    )
      removeAttempt(id);
  };

  const acknowledgeInternalSend = (id: string) => {
    if (
      getPendingChatSends(sessionScope).some(
        (entry) =>
          entry.id === id &&
          entry.scope === scope &&
          !entry.clientId &&
          entry.status === "unconfirmed",
      )
    )
      removeAttempt(id);
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
        isSending: isSending || hasSendingAttempt,
        pendingSends,
        checkPendingSend,
        restoreFailedSend,
        discardFailedSend,
        acknowledgeInternalSend,
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
