import { IconButton, TextField } from "@mui/material";
import { useContext, useMemo } from "react";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { ChatContext } from "./chat-context";
import { DefaultExtensionType, FileIcon, defaultStyles } from "react-file-icon";
import prettyBytes from "pretty-bytes";

interface ChatAttachmentPreviewProps {
  file: File;
}

export default function ChatAttachmentPreview({ file }: ChatAttachmentPreviewProps) {
  const { dispatch, sendMessage } = useContext(ChatContext);

  const handleClose = () => {
    dispatch({ type: "remove-file" });
  };

  const handleSend = () => {
    sendMessage();
    dispatch({ type: "remove-file" });
    dispatch({ type: "change-text", text: "" });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: "change-text", text: e.target.value });
  };

  const fileComponent = useMemo(() => {
    const src = URL.createObjectURL(file);

    if (file.type.includes("image")) {
      return <img src={src} alt={file.name} className="max-h-[20rem] max-w-[40rem]" />;
    }

    if (file.type.includes("video")) {
      return (
        <video controls className="max-h-[15rem] max-w-[40rem] object-contain">
          <source src={src} type={file.type} />
        </video>
      );
    }

    if (file.type.includes("audio")) {
      return (
        <audio controls className="max-h-[15rem] max-w-[40rem] object-contain">
          <source src={src} type={file.type} />
        </audio>
      );
    }
    const ext = file.name.split(".").reverse()[0];

    return (
<div className="flex flex-col items-center gap-2 rounded-md bg-slate-100 text-slate-800 px-8 py-4 dark:bg-slate-800 dark:text-slate-200">
        <div className="h-32 w-32 p-8">
          <FileIcon {...(defaultStyles[ext as DefaultExtensionType] || {})} radius={1.25} />
        </div>
        <h2 className="text-xl">Prévia Indisponível</h2>
        <p className="text-sm">
          {prettyBytes(file.size)} - {ext.toLocaleUpperCase()}
        </p>
      </div>
    );
  }, [file]);

  return (
<div className="absolute inset-0 z-10 h-full w-full bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-4 pb-8">
  <div className="grid h-full grid-rows-[auto_1fr_auto]">
    <header className="flex w-full items-center justify-between mb-2">
      <div></div>
      <h1 className="text-base font-medium truncate max-w-[75%]">{file.name}</h1>
      <IconButton
        onClick={handleClose}
        sx={{
          color: 'inherit',
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </header>

    <div className="flex items-center justify-center">{fileComponent}</div>

    <div className="flex items-center justify-center gap-4 mt-4">
      <IconButton
        onClick={handleClose}
        sx={{
          bgcolor: 'rgba(0,0,0,0.05)',
          color: 'inherit',
          '&:hover': {
            bgcolor: 'rgba(0,0,0,0.1)',
          },
          darkMode: {
            bgcolor: 'rgba(255,255,255,0.05)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.1)',
            },
          },
        }}
      >
        <CloseIcon fontSize="large" />
      </IconButton>

      <TextField
        placeholder="Adicione uma legenda"
        variant="outlined"
        sx={{
          width: '34rem',
          '& .MuiInputBase-root': {
            color: 'inherit',
            backgroundColor: 'rgba(0,0,0,0.03)',
            borderRadius: 1,
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(100,100,100,0.3)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(100,100,100,0.6)',
          },
        }}
        multiline
        maxRows={5}
        onChange={handleTextChange}
      />

      <IconButton
        onClick={handleSend}
        sx={{
          bgcolor: 'rgba(0,0,0,0.05)',
          color: 'inherit',
          '&:hover': {
            bgcolor: 'rgba(0,0,0,0.1)',
          },
          darkMode: {
            bgcolor: 'rgba(255,255,255,0.05)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.1)',
            },
          },
        }}
      >
        <SendIcon fontSize="large" />
      </IconButton>
    </div>
  </div>
</div>

  );
}
