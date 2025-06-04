import {
  Button,
  TextField,
  MenuItem,
  Typography,
  Modal,
  Popper,
  Paper,
  List,
  ListItemButton,
} from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAppContext } from "../../../app-context";
import { UsersContext } from "../../users/users-context";
import { VariablesMenu } from "./Variables";
import { useReadyMessagesContext } from "../ready-messages-context";
import filesService from "@/lib/services/files.service";
import { ReadyMessage } from "@in.pulse-crm/sdk";
import { AuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "../../../whatsapp-context";

interface Props {
  readyMessage: ReadyMessage;
  onSubmit: (data: {
    TITULO: string;
    TEXTO_MENSAGEM: string;
    SETOR: number | null;
    ARQUIVO: File | null;
  }) => Promise<void>;
}

export default function UpdateReadyMessageModal({ readyMessage, onSubmit }: Props) {
  const { closeModal } = useAppContext();
  const { sectors } = useWhatsappContext();
  const { variables = [] } = useReadyMessagesContext() || {};
  const { user, instance } = useContext(AuthContext);
  const [title, setTitle] = useState(readyMessage.TITULO || "");
  const [text, setText] = useState(readyMessage.TEXTO_MENSAGEM || "");
  const [sector, setSector] = useState<number | null>(readyMessage.SETOR || null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFieldRef = useRef<HTMLInputElement>(null);

  const [varModal, setVarModal] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (readyMessage.ARQUIVO) {
      const imageUrl = filesService.getFileDownloadUrl(readyMessage.SETOR);
      setImagePreview(imageUrl);
    }
  }, [readyMessage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    fileRef.current = file;

    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleTextChange = (e: any) => {
    const value = e.target.value;
    setText(value);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex >= 0) {
      const filterText = textBeforeCursor.slice(atIndex + 1);
      if (!filterText.includes(" ") && !filterText.includes("\n")) {
        setFilter(filterText);
        setAnchorEl(textFieldRef.current);
      } else {
        setAnchorEl(null);
        setFilter("");
      }
    } else {
      setAnchorEl(null);
      setFilter("");
    }
  };

  const handleSelectVariable = (variableName: string) => {
    if (!textFieldRef.current) return;

    const input = textFieldRef.current;
    const cursorPos = input.selectionStart || 0;
    const textBeforeCursor = text.slice(0, cursorPos);
    const textAfterCursor = text.slice(cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex < 0) return;

    const newText =
      textBeforeCursor.slice(0, atIndex) + variableName + textAfterCursor;

    setText(newText);
    setAnchorEl(null);

    setTimeout(() => {
      const pos = atIndex + variableName.length;
      input.focus();
      input.setSelectionRange(pos, pos);
    }, 0);
  };

  const filteredVariables = variables.filter((v) =>
    v.name.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSubmit = async () => {
    if (title.length < 6) {
      toast.error("Título deve ter pelo menos 6 caracteres");
      return;
    }
    if (text.length < 10) {
      toast.error("Texto da mensagem deve ter pelo menos 10 caracteres");
      return;
    }

    await onSubmit({
      TITULO: title,
      TEXTO_MENSAGEM: text,
      SETOR: sector,
      ARQUIVO: fileRef.current,
    });

    toast.success("Mensagem rápida atualizada com sucesso!");
    closeModal();
  };

  return (
<div className="flex flex-col gap-6 bg-white text-gray-800 dark:bg-slate-800 dark:text-white px-8 py-6 rounded-md w-full max-w-3xl" style={{ width: 500 }}>
      <Typography variant="h6">Editar mensagem rápida</Typography>

      <div className="flex gap-4 items-center">
        <div className="flex flex-col gap-2 w-full">
          <TextField
            label="Título"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <TextField
            select
            label="Setor"
            fullWidth
            value={sector ?? ""}
            disabled={!(instance === "nunes" && user?.SETOR === 3)}
            onChange={(e) =>
              setSector(e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <MenuItem value="">Nenhum</MenuItem>
            {sectors?.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </div>

      <TextField
        label="Texto da mensagem"
        multiline
        minRows={4}
        value={text}
        onChange={handleTextChange}
        inputRef={textFieldRef}
        fullWidth
      />

      <div className="flex items-center gap-4 pt-2">
        <Button
          variant="outlined"
          onClick={() => fileInputRef.current?.click()}
          sx={{ minWidth: 150 }}
        >
          Selecionar arquivo
        </Button>

        {fileRef.current ? (
          <Typography
            variant="body2"
            noWrap
            sx={{ maxWidth: 200, userSelect: "all", color: "white" }}
          >
            {fileRef.current.name}
          </Typography>
        ) : imagePreview ? (
          <img
            src={imagePreview}
            alt="Preview"
            className="h-16 w-16 rounded-md object-cover"
          />
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileChange}
      />

      <Popper
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 1300, width: anchorEl?.clientWidth }}
      >
        <Paper style={{ maxHeight: 200, overflowY: "auto" }}>
          <List dense>
            {filteredVariables.map((v) => (
              <ListItemButton key={v.name} onClick={() => handleSelectVariable(v.name)}>
                {v.name}
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </Popper>

      <div className="flex justify-end gap-4 pt-4">
        <Button color="error" onClick={closeModal}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={title.length < 6 || text.length < 10}
        >
          Salvar
        </Button>
      </div>

      <Modal open={varModal} onClose={() => setVarModal(false)}>
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-md shadow-lg p-4 max-w-md w-full">
            <VariablesMenu
              onSelect={handleSelectVariable}
              onClose={() => setVarModal(false)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
