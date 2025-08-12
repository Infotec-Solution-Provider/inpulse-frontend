import { useContext, useEffect, useMemo } from "react";
import { ChatContext } from "./chat-context";
import { IconButton, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { DefaultExtensionType, FileIcon, defaultStyles } from "react-file-icon";
import prettyBytes from "pretty-bytes";

interface ChatAttachmentPreviewProps {
  file: File;
}

export default function ChatAttachmentPreview({ file }: ChatAttachmentPreviewProps) {
  const { dispatch, sendMessage, state, setIsMobilePreviewOpen } = useContext(ChatContext);
  
  useEffect(() => {
    // Atualiza o estado quando o componente é montado
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      setIsMobilePreviewOpen(true);
    }
    
    return () => {
      // Limpa o estado quando o componente é desmontado
      if (isMobile) {
        setIsMobilePreviewOpen(false);
      }
    };
  }, [setIsMobilePreviewOpen]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAuxKeyPressed = e.shiftKey || e.altKey || e.ctrlKey;
      if (e.key !== "Enter") return;

      e.preventDefault();

      if (isAuxKeyPressed) {
        dispatch({ type: "change-text", text: state.text + "\n" });
      } else {
        sendMessage();
        dispatch({ type: "remove-file" });
        dispatch({ type: "change-text", text: "" });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dispatch, sendMessage, state.text]);

  const fileComponent = useMemo(() => {
    const src = URL.createObjectURL(file);

    if (file.type.includes("image")) {
      return (
        <div className="w-full h-full flex items-center justify-center p-2">
          <img 
            src={src} 
            alt={file.name} 
            className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg" 
            style={{ maxWidth: 'min(100%, 40rem)' }}
          />
        </div>
      );
    }

    if (file.type.includes("video")) {
      return (
        <div className="w-full h-full flex items-center justify-center p-2">
          <video
            controls
            className="max-h-[60vh] w-full rounded-lg shadow-lg"
            style={{ maxWidth: 'min(100%, 40rem)' }}
            src={src}
          >
            Seu navegador não suporta o elemento de vídeo.
          </video>
        </div>
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
      <div className="flex flex-col items-center gap-2 rounded-md bg-slate-100 text-slate-800 px-8 py-4 dark:dark:bg-slate-800 dark:text-slate-200">
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
    <div className="fixed inset-0 z-10 h-full w-full bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-2 sm:p-4 pb-8 flex flex-col">
      <header className="flex w-full items-center justify-between mb-2 px-2 sm:px-0">
        <div className="w-8"></div>
        <h1 className="text-sm sm:text-base font-medium truncate max-w-[60%] sm:max-w-[75%] mx-2">
          {file.name}
        </h1>
        <IconButton 
          onClick={handleClose} 
          sx={{ color: 'inherit' }}
          className="w-8 h-8"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </header>

      <div className="flex-1 flex items-center justify-center overflow-auto py-4">
        {fileComponent}
      </div>

      <div className="w-full max-w-2xl mx-auto mt-4 px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full">
          <div className="flex gap-2 sm:gap-4 w-full">
            <IconButton
              onClick={handleClose}
              className="shrink-0"
              sx={{
                bgcolor: 'rgba(0,0,0,0.05)',
                color: 'inherit',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' },
              }}
            >
              <CloseIcon fontSize={window.innerWidth < 640 ? 'medium' : 'large'} />
            </IconButton>

            <TextField
              placeholder="Adicione uma legenda"
              variant="outlined"
              fullWidth
              sx={{
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
              size={window.innerWidth < 640 ? 'small' : 'medium'}
            />
          </div>

          <IconButton
            onClick={handleSend}
            className="shrink-0 self-end sm:self-auto"
            sx={{
              bgcolor: 'rgba(0,0,0,0.05)',
              color: 'inherit',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' },
            }}
          >
            <SendIcon fontSize={window.innerWidth < 640 ? 'medium' : 'large'} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
