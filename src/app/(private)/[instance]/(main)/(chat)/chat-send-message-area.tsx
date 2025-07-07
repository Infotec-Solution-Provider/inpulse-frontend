import { useContext, useMemo, useRef, useState, useEffect, useCallback } from "react";
import { IconButton, Modal, TextField } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import { Close } from "@mui/icons-material";
import EmojiPicker, { EmojiClickData, EmojiStyle, SuggestionMode, Theme } from "emoji-picker-react";
import { WhatsappContext } from "../../whatsapp-context";
import { ChatContext } from "./chat-context";
import { AuthContext } from "@/app/auth-context";
import AudioRecorder from "./audio-recorder";
import { QuickMessage } from "../../(cruds)/ready-messages/QuickMessage";
import { InternalMessage } from "@in.pulse-crm/sdk";
import { getInternalMessageStyle } from "./render-internal-chat-messages";
import { InternalChatContext } from "../../internal-context";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";
import { useMentions } from "./mentions/useMentions";

export default function ChatSendMessageArea() {
  const { currentChat } = useContext(WhatsappContext);
  const {
    sendMessage: sendMessageContext,
    state,
    dispatch,
    quotedMessage,
    handleQuoteMessageRemove,
  } = useContext(ChatContext);
  const { user } = useContext(AuthContext);
  const { users } = useContext(InternalChatContext);
  const { contacts } = useContext(ContactsContext);

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
          if (file) {
            dispatch({ type: "attach-file", file });
          }
        }
      }
    };

    textarea.addEventListener("paste", handlePaste);
    return () => {
      textarea.removeEventListener("paste", handlePaste);
    };
  }, [textareaRef.current]);

  const openQuickMessages = () => setQuickMessageOpen(true);
  const openQuickTemplate = () => setQuickTemplateOpen(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) dispatch({ type: "attach-file", file });
  };

  const handleEmojiClick = useCallback(
    (data: EmojiClickData) => dispatch({ type: "add-emoji", emoji: data.emoji }),
    [dispatch]
  );

  const handleAudioRecord = (file: File) => dispatch({ type: "set-audio", file });

  const toggleEmojiPicker = () => dispatch({ type: "toggle-emoji-menu" });

  function sendMessages() {
    sendMessageContext();
    dispatch({ type: "change-text", text: "" });
    setTextWithNames("");
    handleQuoteMessageRemove();
    document.dispatchEvent(new Event("scroll-to-bottom"));
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAuxKeyPressed = e.shiftKey || e.altKey || e.ctrlKey;
      if (e.key !== "Enter") return;

      e.preventDefault();
      if (e.key === "Enter" && isAuxKeyPressed) {
            return dispatch({ type: "change-text", text: state?.text + "\n" });
          }
      if (e.key === "Enter" && !isDisabled && !isAuxKeyPressed) {
        dispatch({ type: "change-text", text: "" });
        return sendMessages();
      }
      if (!isDisabled) {
        sendMessages();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDisabled, state.text]);

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
    <div className="flex max-h-36 items-center gap-2 bg-slate-200 px-2 py-2 text-indigo-300 dark:bg-slate-800 dark:text-indigo-400 md:mb-0 mb-6">
      <input
        type="file"
        className="hidden"
        id="file-input"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <div className="flex items-center gap-2">
        <IconButton size="small" className="bg-white/20 dark:text-indigo-400" onClick={openQuickMessages}>
          <ChatBubbleIcon />
        </IconButton>
        <IconButton size="small" className="bg-white/20 dark:text-indigo-400" onClick={openAttachFile}>
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

      {/* Campo de texto + citação */}
      <div className="flex w-full flex-col gap-2">
        {quotedMessage && (
          <div className="flex w-full items-center justify-between gap-2 rounded-md bg-indigo-500/10 p-2 dark:bg-indigo-600/20">
            <div className="text-sm text-black dark:text-slate-300">
              {quotedMessage.body.split("\n").map((line, index) => (
                <p key={index} className="break-words text-sm">{line}</p>
              ))}
              {quotedMessage.fileId && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {quotedMessage.fileName || "Arquivo anexado"}
                </span>
              )}
            </div>
            <IconButton size="small" className="bg-white/20 dark:text-indigo-400" onClick={handleQuoteMessageRemove}>
              <Close />
            </IconButton>
          </div>
        )}

        {state.sendAsAudio && state.file ? (
          <div className="flex w-full items-center justify-center gap-2">
            <audio controls src={URL.createObjectURL(state.file)} className="h-8 max-w-[35rem] flex-grow" />
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
              <div className="absolute bottom-full mb-2 left-0 w-[20rem] max-h-40 overflow-auto rounded-md bg-white shadow-md z-50">
                {mentionCandidates.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">Nenhum contato</div>
                ) : (
                  mentionCandidates.map((user:any) => (
                    <div
                      key={user.userId}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-blue-100 cursor-pointer"
                      onClick={() => {
                        const result = selectMention(user, textWithNames, textareaRef.current?.selectionStart || 0);
                        setTimeout(() => {
                          textareaRef.current?.setSelectionRange(result.cursorPosition, result.cursorPosition);
                          textareaRef.current?.focus();
                        }, 0);
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-300 text-white text-xs flex items-center justify-center font-semibold">
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

      {/* Preview e gravação de áudio */}
      <div className="aria-hidden:hidden" aria-hidden={textWithNames.length > 0 || state.sendAsAudio}>
        <AudioRecorder onAudioRecorded={handleAudioRecord} />
      </div>

      {quickMessageOpen && (
        <Modal open onClose={() => setQuickMessageOpen(false)}>
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            {currentChat && <QuickMessage chat={currentChat} onClose={() => setQuickMessageOpen(false)} />}
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
