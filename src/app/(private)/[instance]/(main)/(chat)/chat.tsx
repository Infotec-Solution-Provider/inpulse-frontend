"use client";
import { IconButton, TextField } from "@mui/material";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import SendIcon from "@mui/icons-material/Send";
import Message from "./message";
import ChatContactInfo, { ChatContactInfoProps } from "./chat-contact-info";

export interface ChatProps extends ChatContactInfoProps {}

export default function Chat({
  allowedUrgency,
  avatarUrl,
  name,
  company,
  phone,
  cnpj,
  id,
  erpId,
  startDate,
  urgency,
}: ChatProps) {
  return (
    <div className="grid grid-rows-[6rem_1fr_4rem] overflow-hidden rounded-md bg-slate-900 drop-shadow-md">
      <ChatContactInfo 
        allowedUrgency={allowedUrgency}
        avatarUrl={avatarUrl}
        name={name}
        company={company}
        phone={phone}
        cnpj={cnpj}
        id={id}
        erpId={erpId}
        startDate={startDate}
        urgency={urgency}
      />
      <ul className="flex flex-col gap-2 overflow-y-auto bg-slate-300/10 p-2">
        <Message style="received" text="Hello, how are you?" date={new Date()} />
        <Message style="sent" text="I'm good, thanks!" date={new Date()} />
        <Message
          style="sent"
          text="Ullamco cupidatat Lorem cupidatat exercitation elit Lorem deserunt deserunt laboris."
          date={new Date()}
        />
        <Message style="system" text="User has joined the chat." date={new Date()} />
      </ul>
      <div className="flex items-center gap-2 bg-slate-950 bg-opacity-20 px-2 text-indigo-300">
        <div className="flex items-center gap-2">
          <IconButton size="small" color="inherit">
            <ChatBubbleIcon />
          </IconButton>
          <IconButton size="small" color="inherit">
            <AttachFileIcon />
          </IconButton>
          <IconButton size="small" color="inherit">
            <EmojiEmotionsIcon />
          </IconButton>
        </div>
        <TextField multiline fullWidth size="small" />
        <IconButton size="small" color="inherit">
          <SendIcon />
        </IconButton>
      </div>
    </div>
  );
}
