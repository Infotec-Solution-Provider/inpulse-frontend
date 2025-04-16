import { IconButton, TextField } from "@mui/material";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import MicIcon from "@mui/icons-material/Mic";
import SendIcon from "@mui/icons-material/Send";
import { useRef, useState } from "react";

export default function ChatSendMessageArea() {
  const [text, setText] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAttachFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  return (
    <div className="flex items-center gap-2 bg-slate-950 bg-opacity-20 px-2 text-indigo-300">
      <input type="file" className="hidden" id="file-input" ref={fileInputRef} />
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
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <IconButton
        size="small"
        color="inherit"
        aria-hidden={text.length === 0}
        className="aria-hidden:hidden"
      >
        <SendIcon />
      </IconButton>
      <IconButton
        size="small"
        color="inherit"
        aria-hidden={text.length > 0}
        className="aria-hidden:hidden"
      >
        <MicIcon />
      </IconButton>
    </div>
  );
}
