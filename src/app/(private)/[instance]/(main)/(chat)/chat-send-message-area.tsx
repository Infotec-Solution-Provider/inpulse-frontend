import { IconButton, Menu, TextField } from "@mui/material";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import MicIcon from "@mui/icons-material/Mic";
import SendIcon from "@mui/icons-material/Send";
import { useContext, useRef, useEffect, useState, useCallback } from "react";
import { WhatsappContext } from "../../whatsapp-context";
import { ChatContext } from "./chat-context";
import EmojiPicker, {
  EmojiClickData,
  Theme,
  EmojiStyle,
  SuggestionMode,
  Categories,
} from "emoji-picker-react";
import AudioRecorder from "./audio-recorder";
import { Close } from "@mui/icons-material";

export default function ChatSendMessageArea() {
  const { currentChat } = useContext(WhatsappContext);
  const { sendMessage, state, dispatch } = useContext(ChatContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDisabled = !currentChat;

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

    setTimeout(() => {
      document.dispatchEvent(new Event("scroll-to-bottom"));
    }, 100);
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

  return (
    <div className="flex max-h-36 items-center gap-2 bg-slate-950 bg-opacity-20 px-2 py-2 text-indigo-300">
      <input
        type="file"
        className="hidden"
        id="file-input"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <div className="flex items-center gap-2">
        <IconButton size="small" color="inherit">
          <ChatBubbleIcon />
        </IconButton>
        <IconButton size="small" color="inherit" onClick={openAttachFile}>
          <AttachFileIcon />
        </IconButton>
        <div className="relative">
          <IconButton size="small" color="inherit" onClick={toggleEmojiPicker}>
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
      {state.sendAsAudio && state.file ? (
        <div className="flex w-full items-center gap-2 justify-center">
          <audio controls src={URL.createObjectURL(state.file!)} className="flex-grow max-w-[35rem] h-8"/>
          <IconButton

            color="inherit"
            onClick={() => dispatch({ type: "remove-file" })}
          >
            <Close />
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
      <IconButton
        size="small"
        color="inherit"
        aria-hidden={state?.text.length === 0 && !state.sendAsAudio}
        className="aria-hidden:hidden"
        disabled={isDisabled}
        onClick={sendMessages}
      >
        <SendIcon />
      </IconButton>
      <div className="aria-hidden:hidden" aria-hidden={state?.text.length > 0 || state.sendAsAudio}>
        <AudioRecorder onAudioRecorded={handleAudioRecord} />
      </div>
    </div>
  );
}
