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
import {
  PendingSendChecks,
  PendingSendVerifier,
} from "@/lib/utils/pending-send-verification";

interface IChatContext {
  state: SendMessageDataState;
  dispatch: React.Dispatch<ChangeMessageDataAction>;
  sendMessage: () => Promise<boolean>;
  isSending: boolean;
  pendingSends: PendingChatSend[];
  pendingSendChecks: PendingSendChecks;
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
  const { instance, user, token } = useContext(AuthContext);
  const scope = JSON.stringify([instance, user?.CODIGO, currentChat?.chatType, currentChat?.id]);
  const sessionScope = JSON.stringify([instance, user?.CODIGO]);
  return (
    <ScopedChatProvider
      key={`${sessionScope}:${!!token}`}
      scope={scope}
      sessionScope={sessionScope}
    >
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
  const { token, user } = useContext(AuthContext);
  const activeSession = !!token && !!user;
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const activeScopeRef = useRef(scope);
  const [isSending, setSending] = useState(false);
  const sendingScopes = useRef(new Set<string>());
  const queuedHere = useRef(new Set<string>());
  const dispatchingScopes = useRef(new Set<string>());
  const [queueVersion, setQueueVersion] = useState(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Strict Mode remounts immediately; a real unmount cancels only jobs
      // accepted here that have never started, without replaying an active POST.
      queueMicrotask(() => {
        if (mounted.current) return;
        updatePendingChatSends(sessionScope, (entries) =>
          entries.map((entry) =>
            queuedHere.current.has(entry.id) && entry.status === "queued"
              ? {
                  ...entry,
                  status: "failed",
                  error:
                    "O envio foi interrompido antes de iniciar. Recupere a mensagem para enviar.",
                }
              : entry,
          ),
        );
      });
    };
  }, [sessionScope]);
  const allPendingSends = useSyncExternalStore(
    subscribePendingChatSends,
    () => getPendingChatSends(sessionScope),
    () => EMPTY_PENDING_SENDS,
  );
  const pendingSends = allPendingSends.filter((attempt) => attempt.scope === scope);
  const verifier = useRef<PendingSendVerifier | null>(null);
  const [pendingSendChecks, setPendingSendChecks] = useState<PendingSendChecks>({});
  const lookupMessageAttemptRef = useRef(lookupMessageAttempt);
  lookupMessageAttemptRef.current = lookupMessageAttempt;
  const updateAttempt = (id: string, patch: Partial<PendingChatSend>) =>
    updatePendingChatSends(sessionScope, (entries) =>
      entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  const removeAttempt = (id: string) =>
    updatePendingChatSends(sessionScope, (entries) => entries.filter((entry) => entry.id !== id));
  const settleAttempt = (id: string, message: WppMessage) => {
    if (message.status === "PENDING") {
      const current = getPendingChatSends(sessionScope).find((entry) => entry.id === id);
      // A late read cannot replace an already observed uncertain terminal state.
      if (current?.status === "unconfirmed" && current.messageId) return;
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
        error: "Ainda não foi possível confirmar o envio.",
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
            error: "Ainda não foi possível confirmar o envio.",
          });
      } else removeAttempt(attempt.id);
    }
  }, [allPendingSends, whatsappMsgs, sessionScope]);

  useEffect(() => {
    if (!activeSession || !mounted.current) return;
    for (const attempt of allPendingSends) {
      if (attempt.status !== "queued" || dispatchingScopes.current.has(attempt.scope)) continue;
      const entries = getPendingChatSends(sessionScope);
      const position = entries.findIndex((entry) => entry.id === attempt.id);
      if (position < 0 || entries[position].status !== "queued") continue;
      const busy = entries.some(
        (entry, index) =>
          entry.scope === attempt.scope &&
          (entry.status === "sending" || (index < position && entry.status === "queued")),
      );
      if (busy) continue;
      if (!attempt.chatId || (attempt.clientId && (!attempt.contactId || !attempt.to))) {
        updateAttempt(attempt.id, {
          status: "failed",
          error: "O destino do envio não está disponível. Recupere a mensagem.",
        });
        continue;
      }

      dispatchingScopes.current.add(attempt.scope);
      queuedHere.current.delete(attempt.id);
      updateAttempt(attempt.id, { status: "sending" });
      const submit = async () => {
        try {
          const result = attempt.clientId
            ? await sendMessage(attempt.to!, {
                ...attempt.snapshot,
                idempotencyKey: attempt.id,
                clientId: attempt.clientId,
                contactId: attempt.contactId!,
                chatId: attempt.chatId!,
              })
            : await sendInternalMessage({ ...attempt.snapshot, chatId: attempt.chatId! });
          if (result) settleAttempt(attempt.id, result);
          else removeAttempt(attempt.id);
        } catch (error) {
          // Internal HTTP 400 can occur after persistence and is not safe to replay.
          const definitelyRejected = !!attempt.clientId && isDefinitiveSendFailure(error);
          updateAttempt(attempt.id, {
            status: definitelyRejected ? "failed" : "unconfirmed",
            error: definitelyRejected
              ? error instanceof Error
                ? error.message
                : "O envio foi recusado."
              : attempt.clientId
                ? "Não foi possível confirmar o envio. A mensagem pode ter sido enviada."
                : "Confirme na conversa se esta mensagem chegou antes de enviar novamente.",
          });
        } finally {
          dispatchingScopes.current.delete(attempt.scope);
          if (mounted.current) setQueueVersion((version) => version + 1);
        }
      };
      void submit();
    }
  }, [
    activeSession,
    allPendingSends,
    queueVersion,
    sendMessage,
    sendInternalMessage,
    sessionScope,
  ]);
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
    if (!mounted.current || !activeSession || activeScopeRef.current !== scope) return false;
    if (sendingScopes.current.has(scope) || !currentChat) return false;
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
        toast.info("Esta mensagem ainda está sem confirmação. Verifique o envio na conversa.");
        return false;
      }
      if (!editingMessage) attemptId = createMessageAttemptKey();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar o envio.");
      return false;
    }

    if (editingMessage) {
      sendingScopes.current.add(scope);
      setSending(true);
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
      status: "queued",
      clientId,
      chatId: currentChat.id,
      contactId: currentChat.chatType === "wpp" ? currentChat.contact!.id : undefined,
      to: contactAddress ?? undefined,
      fileName: snapshot.file?.name,
    };
    queuedHere.current.add(attempt.id);
    updatePendingChatSends(sessionScope, (entries) => [...entries, attempt]);
    // Detach the accepted draft synchronously, before any upload or HTTP wait.
    dispatch({ type: "reset" });
    setQuotedMessage(null);

    return true;
  };

  const checkPendingSend = async (id: string) => {
    if (!mounted.current || !activeSession) return;
    await verifier.current?.check(id);
  };

  useEffect(() => {
    if (!activeSession) return;
    const currentVerifier = new PendingSendVerifier({
      getAttempts: () => getPendingChatSends(sessionScope),
      updateAttempt,
      lookup: (clientId, id) => lookupMessageAttemptRef.current(clientId, id),
      settle: settleAttempt,
      onChange: setPendingSendChecks,
    });
    verifier.current = currentVerifier;
    currentVerifier.tick();
    // Keep the timer stable across messages and token refreshes. Reads recover
    // missing socket events, with a persisted limit and no automatic resend.
    const timer = setInterval(() => currentVerifier.tick(), 1_000);
    return () => {
      clearInterval(timer);
      currentVerifier.stop();
      if (verifier.current === currentVerifier) verifier.current = null;
    };
  }, [activeSession, sessionScope]);

  useEffect(() => {
    verifier.current?.tick();
  }, [allPendingSends]);

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
        isSending,
        pendingSends,
        pendingSendChecks,
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
