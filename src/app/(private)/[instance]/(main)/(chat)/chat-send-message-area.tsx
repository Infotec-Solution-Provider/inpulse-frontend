import { useAuthContext } from "@/app/auth-context";
import { InternalMessage } from "@in.pulse-crm/sdk";
import { Close } from "@mui/icons-material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import SendIcon from "@mui/icons-material/Send";
import TryIcon from "@mui/icons-material/Try";
import { IconButton, Modal, TextField } from "@mui/material";
import EmojiPicker, { EmojiClickData, EmojiStyle, SuggestionMode, Theme } from "emoji-picker-react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useContactsContext } from "../../(cruds)/contacts/contacts-context";
import { QuickMessage } from "../../(cruds)/ready-messages/QuickMessage";
import useInternalChatContext from "../../internal-context";
import { useWhatsappContext } from "../../whatsapp-context";
import AudioRecorder from "./audio-recorder";
import { ChatContext } from "./chat-context";
import { useMentions } from "./mentions/useMentions";
import { getInternalMessageStyle } from "./render-internal-chat-messages";
import { useAppContext } from "../../app-context";
import SendTemplateModal from "@/lib/components/send-template-modal";

export default function ChatSendMessageArea() {
  const { currentChat, wppApi } = useWhatsappContext();
  const {
    sendMessage: sendMessageContext,
    state,
    dispatch,
    quotedMessage,
    handleQuoteMessageRemove,
  } = useContext(ChatContext);
  const { user } = useAuthContext();
  const { users } = useInternalChatContext();
  const { contacts } = useContactsContext();
  const { openModal, closeModal } = useAppContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isDisabled = !currentChat;

  const [quickMessageOpen, setQuickMessageOpen] = useState(false);
  const [quickTemplateOpen, setQuickTemplateOpen] = useState(false);

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
    contacts,
    dispatch,
  });

  const openAttachFile = () => {
    if (fileInputRef.current) fileInputRef.current.click();
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
          if (file) dispatch({ type: "attach-file", file });
        }
      }
    };

    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, []);

  const openQuickMessages = () => setQuickMessageOpen(true);
  const openQuickTemplate = () => {
    if (currentChat && currentChat.chatType === "wpp") {
      openModal(
        <SendTemplateModal
          onClose={closeModal}
          onSendTemplate={(data) => {
            wppApi.current.ax.post("/api/whatsapp/templates/send", {
              to: currentChat.contact?.phone,
              chatId: currentChat.id,
              contactId: currentChat.contactId,
              data,
            });
            closeModal();
          }}
        />,
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) dispatch({ type: "attach-file", file });
  };

  const handleEmojiClick = useCallback(
    (data: EmojiClickData) => dispatch({ type: "add-emoji", emoji: data.emoji }),
    [dispatch],
  );

  const handleAudioRecord = (file: File) => dispatch({ type: "set-audio", file });

  const toggleEmojiPicker = () => dispatch({ type: "toggle-emoji-menu" });

  function sendMessages() {
    const hasFile = !!state.file;
    const hasText = !!state.text?.trim();

    if (!hasText && !hasFile) return;
    sendMessageContext();
    dispatch({ type: "change-text", text: "" });
    dispatch({ type: "remove-file" });
    setTextWithNames("");
    handleQuoteMessageRemove();
    document.dispatchEvent(new Event("scroll-to-bottom"));
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAuxKeyPressed = e.shiftKey || e.altKey || e.ctrlKey;
      if (e.key !== "Enter") return;

      if (isAuxKeyPressed) {
        dispatch({ type: "change-text", text: state?.text + "\n" });
        return;
      }

      e.preventDefault();
      if (!isDisabled) sendMessages();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDisabled, state.text, state.file]);

  const quotedMessageStyle = useMemo(() => {
    const isInternalMessage = (msg: typeof quotedMessage): msg is InternalMessage =>
      !!msg && "internalChatId" in msg;

    if (quotedMessage?.from.includes("user:") && user && isInternalMessage(quotedMessage)) {
      return getInternalMessageStyle(quotedMessage, user.CODIGO);
    }
    if (quotedMessage?.from.includes("external:")) return "received";
    if (quotedMessage?.from.startsWith("me:")) return "sent";
    return "received";
  }, [quotedMessage, user]);

  return (
    <div className="mb-6 flex max-h-36 items-center gap-2 bg-slate-200 px-2 py-2 text-indigo-300 dark:bg-slate-800 dark:text-indigo-400 md:mb-0">
      <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      <div className="flex items-center gap-2">
        <IconButton
          size="small"
          onClick={openQuickTemplate}
          color="success"
          title="Enviar template"
        >
          <TryIcon />
        </IconButton>
        <IconButton
          size="small"
          onClick={openQuickMessages}
          color="info"
          title="Enviar mensagem rápida"
        >
          <ChatBubbleIcon />
        </IconButton>
        <IconButton size="small" onClick={openAttachFile} color="secondary" title="Anexar arquivo">
          <AttachFileIcon />
        </IconButton>
        <div className="relative hidden md:block">
          <IconButton
            size="small"
            className="bg-white/20 dark:text-indigo-400"
            onClick={toggleEmojiPicker}
          >
            <EmojiEmotionsOutlinedIcon />
          </IconButton>
          <div className="absolute bottom-full">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme={Theme.AUTO}
              emojiStyle={EmojiStyle.FACEBOOK}
              lazyLoadEmojis
              suggestedEmojisMode={SuggestionMode.FREQUENT}
              open={state.isEmojiMenuOpen}
              reactionsDefaultOpen={false}
            />
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        {quotedMessage && (
          <div className="flex w-full items-center justify-between gap-2 rounded-md bg-indigo-500/10 p-2 dark:bg-indigo-600/20">
            <div className="text-sm text-black dark:text-slate-300">
              {quotedMessage.body.split("\n").map((line, index) => (
                <p key={index} className="break-words text-sm">
                  {line}
                </p>
              ))}
              {quotedMessage.fileId && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {quotedMessage.fileName || "Arquivo anexado"}
                </span>
              )}
            </div>
            <IconButton
              size="small"
              className="bg-white/20 dark:text-indigo-400"
              onClick={handleQuoteMessageRemove}
            >
              <Close />
            </IconButton>
          </div>
        )}

        {state.sendAsAudio && state.file ? (
          <div className="flex w-full items-center justify-center gap-2">
            <audio
              controls
              src={URL.createObjectURL(state.file)}
              className="h-8 max-w-[35rem] flex-grow"
            />
            <IconButton color="inherit" onClick={() => dispatch({ type: "remove-file" })}>
              <Close />
            </IconButton>
          </div>
        ) : (
          <div className="relative w-full">
            <TextField
              multiline
              fullWidth
              maxRows={5}
              size="small"
              placeholder="Mensagem"
              value={textWithNames}
              onChange={(e) => handleTextChange(e.target.value)}
              inputRef={(ref) => {
                textareaRef.current = ref;
              }}
            />

            {showMentionList && (
              <div className="absolute bottom-full left-0 z-50 mb-2 max-h-40 w-[20rem] overflow-auto rounded-md bg-white shadow-md">
                {mentionCandidates.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">Nenhum contato</div>
                ) : (
                  mentionCandidates.map((user: any) => (
                    <div
                      key={user.userId}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-blue-100"
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
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-300 text-xs font-semibold text-white">
                        {user.name[0]}
                      </div>
                      <span className="text-sm text-gray-800">{user.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <IconButton
        size="small"
        aria-hidden={textWithNames.length === 0 && !state.sendAsAudio}
        className="bg-white/20 dark:text-indigo-400"
        disabled={isDisabled}
        onClick={sendMessages}
      >
        <SendIcon />
      </IconButton>

      <div
        className="aria-hidden:hidden"
        aria-hidden={textWithNames.length > 0 || state.sendAsAudio}
      >
        <AudioRecorder onAudioRecorded={handleAudioRecord} />
      </div>

      {quickMessageOpen && (
        <Modal open onClose={() => setQuickMessageOpen(false)}>
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            {currentChat && (
              <QuickMessage chat={currentChat} onClose={() => setQuickMessageOpen(false)} />
            )}
          </div>
        </Modal>
      )}
      {quickTemplateOpen && (
        <Modal open onClose={() => setQuickTemplateOpen(false)}>
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" />
        </Modal>
      )}
    </div>
  );
}
