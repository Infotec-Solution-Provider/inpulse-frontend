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
      <div className="flex flex-col items-center gap-2 rounded-md bg-slate-950/10 px-8 py-4 text-slate-300">
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
    <div className="absolute bottom-0 left-0 right-0 top-0 z-10 h-full w-full bg-slate-800 p-4 pb-8">
      <div className="grid h-full grid-rows-[auto_1fr_auto]">
        <header className="flex w-full items-center justify-between">
          <div></div>
          <h1>{file.name}</h1>
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </header>
        <div className="flex items-center justify-center">{fileComponent}</div>
        <div className="flex items-center justify-center gap-4">
          <IconButton
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "white",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              },
            }}
            onClick={handleClose}
          >
            <CloseIcon fontSize="large" />
          </IconButton>
          <TextField
            placeholder="Adicone uma legenda"
            variant="outlined"
            sx={{ width: "34rem" }}
            type="textarea"
            multiline
            maxRows={5}
            onChange={handleTextChange}
          />
          <IconButton
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "white",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              },
            }}
            onClick={handleSend}
          >
            <SendIcon fontSize="large" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
