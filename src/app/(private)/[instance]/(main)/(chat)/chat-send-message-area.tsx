import SendTemplateModal from "@/lib/components/send-template-modal";
import { WppMessage } from "@/lib/sdk-local";
import { Button, CircularProgress, Modal, Popover, TextField } from "@mui/material";
import { FileText, Paperclip, Send, Smile } from "lucide-react";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import { UiIcon } from "@/lib/ui-system/icons";
import type { EmojiClickData, EmojiStyle, SuggestionMode, Theme } from "emoji-picker-react";
import dynamic from "next/dynamic";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useContactsContext } from "../../(cruds)/contacts/contacts-context";
import { QuickMessage } from "../../(cruds)/ready-messages/QuickMessage";
import { useAppContext } from "../../app-context";
import useInternalChatContext from "../../internal-context";
import MessageMentionText from "@/lib/components/message-mention-text";
import { useWhatsappContext, WppClient } from "../../whatsapp-context";
import AudioRecorder from "./audio-recorder";
import ChannelSelect from "./channels-select";
import { ChatContext } from "./chat-context";
import { useMentions } from "./mentions/useMentions";
import "./attendance-composer.css";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => null,
});
const EMOJI_THEME = "auto" as Theme;
const EMOJI_STYLE = "facebook" as EmojiStyle;
const EMOJI_SUGGESTION_MODE = "frequent" as SuggestionMode;

function getDefaultSelectedChannel(currentChatMessages: WppMessage[], channels: WppClient[]) {
  const lastMessage = currentChatMessages.findLast((msg) => msg.clientId)!!;

  if (lastMessage?.clientId) {
    return channels.find((ch) => ch.id === lastMessage.clientId) || null;
  }

  return null;
}

export default function ChatSendMessageArea() {
  const {
    currentChat,
    wppApi,
    parameters,
    globalChannel,
    channels,
    loaded,
    currentChatMessages,
    selectedChannel,
    setSelectedChannel,
    chatsChannels,
  } = useWhatsappContext();

  const {
    sendMessage: sendMessageContext,
    state,
    dispatch,
    quotedMessage,
    handleQuoteMessageRemove,
    handleStopEditMessage,
    editingMessage,
    isReadOnlyMode,
    isSending,
  } = useContext(ChatContext);

  const { users } = useInternalChatContext();
  const { state: contactsState } = useContactsContext();
  const { openModal, closeModal } = useAppContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const isDisabled = !currentChat || isReadOnlyMode;

  const [quickMessageOpen, setQuickMessageOpen] = useState(false);
  const [quickTemplateOpen, setQuickTemplateOpen] = useState(false);
  const recordedAudioUrl = useMemo(
    () => (state.sendAsAudio && state.file ? URL.createObjectURL(state.file) : undefined),
    [state.sendAsAudio, state.file],
  );
  useEffect(
    () => () => {
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    },
    [recordedAudioUrl],
  );

  useEffect(() => {
    if (currentChat && currentChat.chatType === "wpp" && channels.length > 0) {
      // Check if there's a stored channel for this chat
      const storedChannelId = chatsChannels.current.get(currentChat.id);
      if (storedChannelId) {
        const stored = channels.find((ch) => ch.id === storedChannelId);
        if (stored) {
          setSelectedChannel(stored);
          return;
        }
      }
      // Fall back to deriving from last message's clientId
      const channel = getDefaultSelectedChannel(currentChatMessages, channels);
      if (channel) {
        setSelectedChannel(channel);
        chatsChannels.current.set(currentChat.id, channel.id);
      }
    }
  }, [currentChat, loaded]);

  const {
    textWithNames,
    setTextWithNames,
    handleTextChange,
    selectMention,
    mentionCandidates,
    showMentionList,
  } = useMentions({
    stateText: state.text,
    mentions: state.mentions || [],
    participants: (currentChat as any)?.participants || [],
    users,
    contacts: contactsState.contacts,
    dispatch,
  });

  const onChangeChannel = useCallback(
    (s: WppClient) => {
      setSelectedChannel(s);
      if (currentChat) {
        chatsChannels.current.set(currentChat.id, s.id);
      }
    },
    [currentChat, chatsChannels],
  );

  const openAttachFile = () => {
    if (isDisabled) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && !isDisabled) dispatch({ type: "attach-file", file });
        }
      }
    };

    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, [isDisabled]);

  useEffect(() => {
    const handleFocusComposer = () => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      requestAnimationFrame(() => {
        textarea.focus();
        const nextLength = textarea.value.length;
        textarea.setSelectionRange(nextLength, nextLength);
      });
    };

    window.addEventListener("chat:focus-composer", handleFocusComposer);

    return () => {
      window.removeEventListener("chat:focus-composer", handleFocusComposer);
    };
  }, []);

  const openQuickMessages = () => setQuickMessageOpen(true);
  const openQuickTemplate = () => {
    if (isDisabled) return;
    if (currentChat && currentChat.chatType === "wpp") {
      openModal(
        <SendTemplateModal
          onClose={closeModal}
          onSendTemplate={async (data) => {
            const channelId = selectedChannel?.id ?? globalChannel.current?.id;

            if (!channelId) {
              toast.error("Nenhum canal WhatsApp disponível para enviar template.");
              return;
            }

            await wppApi.current.ax.post(`/api/whatsapp/${channelId}/templates/send`, {
              to: currentChat.contact?.phone,
              chatId: currentChat.id,
              contactId: currentChat.contactId,
              data,
            });
            closeModal();
          }}
          contact={currentChat.contact}
          customer={(currentChat as any)?.customer || null}
        />,
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    const file = e.target.files?.[0];
    if (file) dispatch({ type: "attach-file", file });
  };

  const handleEmojiClick = useCallback(
    (data: EmojiClickData) => dispatch({ type: "add-emoji", emoji: data.emoji }),
    [dispatch],
  );

  const handleAudioRecord = (file: File) => {
    if (isDisabled) return;
    dispatch({ type: "set-audio", file });
  };

  const toggleEmojiPicker = () => {
    if (isDisabled) return;
    dispatch({ type: "toggle-emoji-menu" });
  };

  async function sendMessages() {
    if (isDisabled || isSending) return;

    const hasFile = !!state.file || !!state.fileId;
    const hasText = !!state.text?.trim();

    if (!hasText && !hasFile) return;

    if (await sendMessageContext()) document.dispatchEvent(new Event("scroll-to-bottom"));
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== textareaRef.current || e.isComposing) return;
      const isAuxKeyPressed = e.shiftKey || e.altKey || e.ctrlKey;
      if (e.key !== "Enter") return;
      e.preventDefault();

      if (isAuxKeyPressed) {
        dispatch({ type: "change-text", text: state?.text + "\n" });
        return;
      }

      if (!isDisabled) sendMessages();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDisabled, isSending, state.text, state.file, state.fileId, sendMessageContext]);

  const refMessage = isReadOnlyMode ? null : quotedMessage || editingMessage || null;
  const mentionCount = state.mentions?.length || 0;

  useEffect(() => {
    if (editingMessage) {
      dispatch({ type: "change-text", text: editingMessage.body || "" });
      setTextWithNames(editingMessage.body || "");
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(state.text.length, state.text.length);
    }
  }, [editingMessage]);

  return (
    <section className="ip-attendance-composer" aria-label="Responder conversa">
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        aria-label="Selecionar anexo"
      />

      {refMessage && (
        <div className="ip-composer-reference">
          <div className="ip-composer-reference-copy">
            <strong>{editingMessage ? "Editando mensagem" : "Respondendo à mensagem"}</strong>
            <div className="ip-composer-reference-body">
              <MessageMentionText
                text={refMessage.body}
                mentionEntities={refMessage.mentionEntities}
              />
            </div>
            {refMessage.fileId && <span>{refMessage.fileName || "Arquivo anexado"}</span>}
          </div>
          <OperationalIconButton
            label={editingMessage ? "Cancelar edição" : "Remover citação"}
            onClick={editingMessage ? handleStopEditMessage : handleQuoteMessageRemove}
          >
            <UiIcon name="close" scale="toolbar" />
          </OperationalIconButton>
        </div>
      )}

      {currentChat?.chatType === "internal" && mentionCount > 0 && (
        <p className="ip-composer-help">
          Menções ativas: {mentionCount}. Usuários mencionados receberão notificação via WhatsApp.
        </p>
      )}

      <div className="ip-composer-input-row">
        <div className="ip-composer-field">
          {state.sendAsAudio && state.file ? (
            <div className="ip-composer-audio-preview">
              <audio controls src={recordedAudioUrl} aria-label="Prévia do áudio gravado" />
              <OperationalIconButton
                label="Remover áudio"
                onClick={() => dispatch({ type: "remove-file" })}
              >
                <UiIcon name="close" scale="toolbar" />
              </OperationalIconButton>
            </div>
          ) : (
            <>
              <TextField
                multiline
                fullWidth
                maxRows={5}
                size="small"
                placeholder={editingMessage ? "Edite a mensagem" : "Escreva uma mensagem…"}
                value={textWithNames}
                onChange={(e) => handleTextChange(e.target.value)}
                disabled={isDisabled}
                inputProps={{ "aria-label": editingMessage ? "Editar mensagem" : "Mensagem" }}
                inputRef={(ref) => {
                  textareaRef.current = ref;
                }}
              />
              {showMentionList && (
                <div className="ip-composer-mentions" aria-label="Pessoas para mencionar">
                  {mentionCandidates.length === 0 ? (
                    <p className="ip-composer-help">Nenhum contato</p>
                  ) : (
                    mentionCandidates.map((user) => (
                      <button
                        type="button"
                        key={user.userId}
                        className="ip-composer-mention"
                        onClick={() => {
                          const result = selectMention(
                            user,
                            textWithNames,
                            textareaRef.current?.selectionStart || 0,
                          );
                          setTimeout(() => {
                            textareaRef.current?.setSelectionRange(
                              result.cursorPosition,
                              result.cursorPosition,
                            );
                            textareaRef.current?.focus();
                          }, 0);
                        }}
                      >
                        <span className="ip-composer-mention-avatar" aria-hidden="true">
                          {user.name[0]}
                        </span>
                        <span>{user.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <Button
          className="ip-composer-send"
          variant="contained"
          disableElevation
          disabled={
            isDisabled || isSending || (!state.text?.trim() && !state.file && !state.fileId)
          }
          aria-label={
            isSending
              ? "Registrando mensagem"
              : editingMessage
                ? "Salvar edição da mensagem"
                : "Enviar mensagem"
          }
          onClick={sendMessages}
          startIcon={
            isSending ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <UiIcon icon={Send} scale="row" />
            )
          }
        >
          {isSending ? "Registrando…" : editingMessage ? "Salvar" : "Enviar"}
        </Button>
      </div>

      <div className="ip-composer-toolbar">
        <div className="ip-composer-tools" role="group" aria-label="Recursos da mensagem">
          {parameters["is_official"] === "true" && (
            <OperationalIconButton
              label="Enviar template"
              onClick={openQuickTemplate}
              disabled={isDisabled}
            >
              <UiIcon icon={FileText} scale="toolbar" />
            </OperationalIconButton>
          )}
          <OperationalIconButton
            label="Enviar mensagem rápida"
            onClick={openQuickMessages}
            disabled={isDisabled}
          >
            <UiIcon name="conversations" scale="toolbar" />
          </OperationalIconButton>
          <OperationalIconButton
            label="Anexar arquivo"
            onClick={openAttachFile}
            disabled={isDisabled}
          >
            <UiIcon icon={Paperclip} scale="toolbar" />
          </OperationalIconButton>
          <OperationalIconButton
            ref={emojiButtonRef}
            label="Emojis"
            aria-expanded={state.isEmojiMenuOpen}
            aria-haspopup="dialog"
            onClick={toggleEmojiPicker}
            disabled={isDisabled}
          >
            <UiIcon icon={Smile} scale="toolbar" />
          </OperationalIconButton>
          <div
            hidden={isDisabled || textWithNames.length > 0 || state.sendAsAudio || !!editingMessage}
          >
            <AudioRecorder onAudioRecorded={handleAudioRecord} />
          </div>
        </div>
        {currentChat?.chatType === "wpp" && channels.length > 0 && (
          <ChannelSelect
            channels={channels}
            selectedChannel={selectedChannel}
            onChange={onChangeChannel}
            disabled={isDisabled}
          />
        )}
      </div>
      <p
        className="ip-composer-help ip-composer-keyboard-hint"
        aria-live="polite"
        role={isSending ? "status" : undefined}
      >
        {isSending ? "Registrando mensagem…" : "Enter para enviar · Shift + Enter para nova linha"}
      </p>

      <Popover
        open={state.isEmojiMenuOpen && !isDisabled}
        anchorEl={emojiButtonRef.current}
        onClose={() => {
          if (state.isEmojiMenuOpen) toggleEmojiPicker();
        }}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            className: "ip-composer-emoji-picker",
            role: "dialog",
            "aria-label": "Escolher emoji",
          },
        }}
      >
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          theme={EMOJI_THEME}
          emojiStyle={EMOJI_STYLE}
          lazyLoadEmojis
          suggestedEmojisMode={EMOJI_SUGGESTION_MODE}
          reactionsDefaultOpen={false}
          width="100%"
          height="min(360px, 55dvh)"
        />
      </Popover>
      {quickMessageOpen && !isDisabled && (
        <Modal open onClose={() => setQuickMessageOpen(false)}>
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            {currentChat && (
              <QuickMessage chat={currentChat} onClose={() => setQuickMessageOpen(false)} />
            )}
          </div>
        </Modal>
      )}
      {quickTemplateOpen && !isDisabled && (
        <Modal open onClose={() => setQuickTemplateOpen(false)}>
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" />
        </Modal>
      )}
    </section>
  );
}
