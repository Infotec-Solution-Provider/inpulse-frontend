import { IconButton, Modal, TextField } from "@mui/material";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import SendIcon from "@mui/icons-material/Send";
import { useContext, useRef, useEffect, useCallback, useMemo } from "react";
import { WhatsappContext } from "../../whatsapp-context";
import { ChatContext } from "./chat-context";
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle, SuggestionMode } from "emoji-picker-react";
import AudioRecorder from "./audio-recorder";
import { Close } from "@mui/icons-material";
import { QuickMessage } from "../../(cruds)/ready-messages/QuickMessage";
import { useState } from "react";
import { getInternalMessageStyle } from "./render-internal-chat-messages";
import { InternalMessage } from "@in.pulse-crm/sdk";
import { AuthContext } from "@/app/auth-context";

export default function ChatSendMessageArea() {
  const { currentChat } = useContext(WhatsappContext);
  const { sendMessage, state, dispatch, quotedMessage, handleQuoteMessageRemove } =
    useContext(ChatContext);
  const { user } = useContext(AuthContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDisabled = !currentChat;
  const [quickMessageOpen, setQuickMessageOpen] = useState(false);
  const [quickTemplateOpen, setQuickTemplateOpen] = useState(false);
  const openQuickMessages = () => setQuickMessageOpen(true);
  const openQuickTemplate = () => setQuickTemplateOpen(true);

  console.log('[ChatSendMessageArea] currentChat:', currentChat);

  const openAttachFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: "change-text", text: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      dispatch({ type: "attach-file", file });
    }
  };

  const handleEmojiClick = useCallback(
    (data: EmojiClickData) => {
      dispatch({ type: "add-emoji", emoji: data.emoji });
    },
    [dispatch],
  );

  const handleAudioRecord = (file: File) => {
    dispatch({ type: "set-audio", file });
  };

  const toggleEmojiPicker = () => {
    dispatch({ type: "toggle-emoji-menu" });
  };

  function sendMessages() {
    sendMessage();
    dispatch({ type: "change-text", text: "" });
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
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDisabled, state?.text]);

  useEffect(() => {
    const handleNativeAudio = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'audioRecorded' && event.data.payload) {
        const { uri, mimeType, fileName } = event.data.payload;
        
        try {
          // A URI é uma string base64, então precisamos decodificá-la
          const fetchRes = await fetch(uri);
          const blob = await fetchRes.blob();
          
          // Criar um objeto File a partir do Blob
          const audioFile = new File([blob], fileName || 'audio.m4a', { type: mimeType });

          // Despachar a ação para o reducer
          dispatch({ type: "set-audio", file: audioFile });
        } catch (error) {
          console.error("Erro ao processar o áudio nativo:", error);
        }
      }
    };

    window.addEventListener('message', handleNativeAudio);

    return () => {
      window.removeEventListener('message', handleNativeAudio);
    };
  }, [dispatch]);

  const quotedMessageStyle = useMemo(() => {
    if (quotedMessage?.from.includes("user:") && user) {
      return getInternalMessageStyle(quotedMessage as InternalMessage, user.CODIGO);
    }
    if (quotedMessage?.from.includes("external:")) {
      return "received";
    }
    if (quotedMessage?.from.startsWith("me:")) {
      return "sent";
    }

    return "received";
  }, [quotedMessage]);

  return (
    <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 py-1 bg-white dark:dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 w-full overflow-hidden">
      <input
        type="file"
        className="hidden"
        id="file-input"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <div className="flex items-center gap-2">
        <IconButton
          size="small"
          className="bg-white/20 dark:text-indigo-400"
          onClick={openQuickMessages}
        >
          <ChatBubbleIcon />
        </IconButton>
        <IconButton
          size="small"
          className="bg-white/20 dark:text-indigo-400"
          onClick={openAttachFile}
        >
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
      <div className="flex w-full flex-col gap-2 overflow-hidden">
        {quotedMessage && (
          <div
            className="flex w-full items-center justify-between gap-2 rounded-md bg-indigo-500/10 p-2 dark:bg-indigo-600/20"
            onClick={handleQuoteMessageRemove}
          >
            <div className="text-sm text-black dark:text-slate-300">
              {quotedMessage.body.split("\n").map((line, index) => (
                <p key={index} className="max-w-[100%] break-words text-sm">
                  {line}
                </p>
              ))}
              {quotedMessage.fileId && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {quotedMessage.fileName || "Arquivo anexado"}
                </span>
              )}
            </div>
            <IconButton size="small" className="bg-white/20 dark:text-indigo-400">
              <Close />
            </IconButton>
          </div>
        )}

        {state.sendAsAudio && state.file ? (
          <div className="flex w-full items-center gap-2 overflow-hidden">
            <div className="flex-1 min-w-0">
              <audio
                controls
                src={URL.createObjectURL(state.file!)}
                className="h-8 w-full max-w-full"
                style={{ maxWidth: 'calc(100vw - 120px)' }}
              />
            </div>
            <IconButton 
              color="inherit" 
              onClick={() => dispatch({ type: "remove-file" })}
              size="small"
              className="flex-shrink-0"
            >
              <Close fontSize="small" />
            </IconButton>
          </div>
        ) : (
          <TextField
            multiline
            fullWidth
            maxRows={5}
            size="small"
            placeholder="Mensagem"
            value={state?.text}
            onChange={handleTextChange}
          />
        )}
      </div>
      <IconButton
        size="small"
        aria-hidden={state?.text.length === 0 && !state.sendAsAudio}
        className="bg-white/20 dark:text-indigo-400 flex-shrink-0"
        disabled={isDisabled}
        onClick={sendMessages}
      >
        <SendIcon fontSize="small" />
      </IconButton>
      <div className="aria-hidden:hidden flex-shrink-0" aria-hidden={state?.text.length > 0 || state.sendAsAudio}>
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
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"></div>
        </Modal>
      )}
    </div>
  );
}
