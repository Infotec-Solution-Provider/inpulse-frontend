import { AuthContext } from "@/app/auth-context";
import filesService from "@/lib/services/files.service";
import { ReadyMessage } from "@in.pulse-crm/sdk";
import {
  Button,
  List,
  ListItemButton,
  MenuItem,
  Modal,
  Paper,
  Popper,
  TextField,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAppContext } from "../../../app-context";
import { useWhatsappContext } from "../../../whatsapp-context";
import { useReadyMessagesContext } from "../ready-messages-context";
import { VariablesMenu } from "./Variables";
import FilePicker from "./file-picker";

interface Props {
  readyMessage: ReadyMessage;
  onSubmit: (data: {
    title: string;
    message: string;
    sectorId: number | null;
    file: File | null;
  }) => Promise<void>;
}

export default function UpdateReadyMessageModal({ readyMessage, onSubmit }: Props) {
  const { closeModal } = useAppContext();
  const { sectors } = useWhatsappContext();
  const { variables = [] } = useReadyMessagesContext() || {};
  const { user, instance } = useContext(AuthContext);
  const [title, setTitle] = useState(readyMessage.title || "");
  const [text, setText] = useState(readyMessage.message || "");
  const [sector, setSector] = useState<number | null>(readyMessage.sectorId || null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const textFieldRef = useRef<HTMLInputElement>(null);

  const [varModal, setVarModal] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (readyMessage.fileId) {
      const imageUrl = filesService.getFileDownloadUrl(readyMessage.fileId);
      setExistingFileUrl(imageUrl);
    }
  }, [readyMessage]);

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

    const newText = textBeforeCursor.slice(0, atIndex) + variableName + textAfterCursor;

    setText(newText);
    setAnchorEl(null);

    setTimeout(() => {
      const pos = atIndex + variableName.length;
      input.focus();
      input.setSelectionRange(pos, pos);
    }, 0);
  };

  const filteredVariables = variables.filter((v) =>
    v.name.toLowerCase().includes(filter.toLowerCase()),
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
      title: title,
      message: text,
      sectorId: sector,
      file: selectedFile,
    });

    toast.success("Mensagem rápida atualizada com sucesso!");
    closeModal();
  };

  return (
    <div
      className="flex w-full max-w-3xl flex-col gap-6 rounded-md bg-white px-8 py-6 text-gray-800 dark:bg-slate-800 dark:text-white"
      style={{ width: 500 }}
    >
      <Typography variant="h6">Editar mensagem rápida</Typography>

      <div className="flex items-center gap-4">
        <div className="flex w-full flex-col gap-2">
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
            onChange={(e) => setSector(e.target.value === "" ? null : Number(e.target.value))}
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

      <div className="pt-2">
        <FilePicker
          selectedFile={selectedFile}
          onChangeFile={(file) => {
            setSelectedFile(file);
            if (file) {
              setExistingFileUrl(null); // Limpa a URL existente quando um novo arquivo é selecionado
            }
          }}
          existingFilePreview={existingFileUrl}
        />
      </div>

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
          <div className="w-full max-w-md rounded-md bg-white p-4 shadow-lg">
            <VariablesMenu onSelect={handleSelectVariable} onClose={() => setVarModal(false)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
