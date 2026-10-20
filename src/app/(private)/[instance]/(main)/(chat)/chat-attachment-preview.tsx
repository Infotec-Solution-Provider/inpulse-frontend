import { useContext, useEffect, useMemo, useRef } from "react";
import { Button, CircularProgress, TextField } from "@mui/material";
import { Send } from "lucide-react";
import { DefaultExtensionType, FileIcon, defaultStyles } from "react-file-icon";
import prettyBytes from "pretty-bytes";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import { UiIcon } from "@/lib/ui-system/icons";
import { ChatContext } from "./chat-context";
import "./attendance-composer.css";

interface ChatAttachmentPreviewProps {
  file: File;
}

export default function ChatAttachmentPreview({ file }: ChatAttachmentPreviewProps) {
  const { dispatch, sendMessage, state, isSending, isReadOnlyMode } = useContext(ChatContext);
  const isDisabled = isSending || isReadOnlyMode;
  const captionRef = useRef<HTMLTextAreaElement | null>(null);
  const sourceUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(sourceUrl), [sourceUrl]);

  const handleClose = () => dispatch({ type: "remove-file" });
  const handleSend = () => {
    if (!isDisabled) void sendMessage();
  };
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: "change-text", text: e.target.value });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== captionRef.current || e.isComposing || e.key !== "Enter") return;
      const isAuxKeyPressed = e.shiftKey || e.altKey || e.ctrlKey;
      e.preventDefault();
      if (isAuxKeyPressed) {
        dispatch({ type: "change-text", text: state.text + "\n" });
      } else if (!isDisabled) {
        void sendMessage();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, sendMessage, state.text, isDisabled]);

  const ext = file.name.split(".").reverse()[0];
  return (
    <section className="ip-attendance-attachment" aria-label="Prévia do anexo">
      <header className="ip-attachment-header">
        <div className="ip-attachment-identity">
          <strong title={file.name}>{file.name}</strong>
          <span>{prettyBytes(file.size)} · Prévia do anexo</span>
        </div>
        <OperationalIconButton label="Remover anexo" onClick={handleClose}>
          <UiIcon name="close" scale="toolbar" />
        </OperationalIconButton>
      </header>
      <div className="ip-attachment-preview">
        {file.type.includes("image") ? (
          <img src={sourceUrl} alt={file.name} />
        ) : file.type.includes("video") ? (
          <video controls aria-label={file.name}>
            <source src={sourceUrl} type={file.type} />
          </video>
        ) : file.type.includes("audio") ? (
          <audio controls aria-label={file.name}>
            <source src={sourceUrl} type={file.type} />
          </audio>
        ) : (
          <div className="ip-attachment-document">
            <div className="ip-attachment-file-icon" aria-hidden="true">
              <FileIcon {...(defaultStyles[ext as DefaultExtensionType] || {})} radius={1.25} />
            </div>
            <p>Prévia indisponível · {ext.toLocaleUpperCase()}</p>
          </div>
        )}
      </div>
      <div className="ip-attachment-footer">
        <TextField
          className="ip-attachment-caption"
          placeholder="Adicione uma legenda"
          inputProps={{ "aria-label": "Legenda do anexo" }}
          inputRef={captionRef}
          fullWidth
          multiline
          maxRows={3}
          size="small"
          onChange={handleTextChange}
          value={state.text}
          disabled={isReadOnlyMode}
        />
        <div className="ip-attachment-actions">
          <Button variant="outlined" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSend}
            disabled={isDisabled}
            aria-label={isSending ? "Registrando anexo" : "Enviar anexo"}
            startIcon={
              isSending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <UiIcon icon={Send} scale="row" />
              )
            }
          >
            {isSending ? "Registrando…" : "Enviar"}
          </Button>
        </div>
      </div>
      {isSending && (
        <p className="ip-composer-help" role="status">
          Registrando anexo…
        </p>
      )}
    </section>
  );
}
