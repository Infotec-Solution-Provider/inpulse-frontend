import { IconButton, TextField } from "@mui/material";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import MicIcon from "@mui/icons-material/Mic";
import SendIcon from "@mui/icons-material/Send";
import { useCallback, useContext, useReducer, useRef, useState } from "react";
import { WhatsappContext } from "../../whatsapp-context";

interface SendMessageDataState {
  text: string;
  file?: File;
  fileId?: number;
  isAudio: boolean;
  isDocument: boolean;
}
type ChangeTextAction = { type: "change-text"; text: string };
type AttachFileAction = { type: "attach-file"; file: File };
type AttachFileIdAction = { type: "attach-file-id"; fileId: number };
type SetAudioAction = { type: "set-audio"; file: File };
type RemoveFileAction = { type: "remove-file" };
type MessageAction =
  | ChangeTextAction
  | AttachFileAction
  | AttachFileIdAction
  | SetAudioAction
  | RemoveFileAction;

const initialState: SendMessageDataState = {
  text: "",
  isAudio: false,
  isDocument: false,
};

function reducer(state: SendMessageDataState, action: MessageAction): SendMessageDataState {
  switch (action.type) {
    case "change-text":
      return { ...state, text: action.text };
    case "attach-file":
      return { text: state.text, file: action.file, isAudio: false, isDocument: true };
    case "attach-file-id":
      return { text: state.text, fileId: action.fileId, isAudio: false, isDocument: true };
    case "set-audio":
      return { text: state.text, file: action.file, isAudio: true, isDocument: false };
    case "remove-file":
      return { text: state.text, isAudio: false, isDocument: false };
    default:
      return state;
  }
}

export default function ChatSendMessageArea() {
  const { sendMessage, openedChat } = useContext(WhatsappContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDisabled = !openedChat || !openedChat.contact || !openedChat.contact?.phone;
  const [state, dispatch] = useReducer(reducer, initialState);

  const openAttachFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSendMessage = useCallback(() => {
    if (openedChat && openedChat.contact) {
      sendMessage(openedChat.contact.phone, {
        text: state.text,
        file: state.file,
        fileId: state.fileId,
        sendAsAudio: state.isAudio,
        sendAsDocument: state.isDocument,
        contactId: openedChat.contact.id,
        chatId: openedChat.id,
      });
    }
  }, [openedChat, state]);

  return (
    <div className="flex max-h-36 items-center gap-2 bg-slate-950 bg-opacity-20 px-2 py-2 text-indigo-300">
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
        value={state.text}
        onChange={(e) => dispatch({ type: "change-text", text: e.target.value })}
      />
      <IconButton
        size="small"
        color="inherit"
        aria-hidden={state.text.length === 0}
        className="aria-hidden:hidden"
        disabled={isDisabled}
        onClick={handleSendMessage}
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
