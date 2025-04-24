import { IconButton, TextField } from "@mui/material";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import MicIcon from "@mui/icons-material/Mic";
import SendIcon from "@mui/icons-material/Send";
import { useContext, useRef } from "react";
import { WhatsappContext } from "../../whatsapp-context";
import { ChatContext } from "./chat-context";

export default function ChatSendMessageArea() {
  const { currentChat } = useContext(WhatsappContext);
  const { sendMessage, state, dispatch } = useContext(ChatContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDisabled = !currentChat || !currentChat.contact || !currentChat.contact?.phone;

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

  const handleAudioChange = (blob: Blob) => {
    const file = new File([blob], "audio.webm", { type: blob.type });

    dispatch({ type: "set-audio", file });
  };

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
        <IconButton size="small" color="inherit">
          <EmojiEmotionsOutlinedIcon />
        </IconButton>
      </div>
      <TextField
        multiline
        fullWidth
        size="small"
        placeholder="Mensagem"
        value={state.text}
        onChange={handleTextChange}
      />
      <IconButton
        size="small"
        color="inherit"
        aria-hidden={state.text.length === 0}
        className="aria-hidden:hidden"
        disabled={isDisabled}
        onClick={sendMessage}
      >
        <SendIcon />
      </IconButton>
      <IconButton
        size="small"
        color="inherit"
        aria-hidden={state.text.length > 0}
        className="aria-hidden:hidden"
      >
        <MicIcon />
      </IconButton>
    </div>
  );
}
