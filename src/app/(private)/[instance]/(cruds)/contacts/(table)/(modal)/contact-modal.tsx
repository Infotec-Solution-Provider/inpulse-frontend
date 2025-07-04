import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import { useContactsContext } from "../../contacts-context";
import { WppContact } from "@in.pulse-crm/sdk";

interface ContactModalProps {
  contact?: WppContact;
}

export default function ContactModal({ contact }: ContactModalProps) {
  const { closeModal, modal, createContact, updateContact } = useContactsContext();
  const isEditMode = !!contact;

  const [name, setName] = useState(contact?.name || "");
  const [ddi, setDdi] = useState("+55");
  const [number, setNumber] = useState("");

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length <= 2) {
      return `(${cleaned}`;
    }

    if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    }

    if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }

    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("O nome é obrigatório!");
      return;
    }

    if (isEditMode) {
      updateContact(contact.id, name);
    } else {
      if (!number.trim() || !ddi.trim()) {
        toast.error("Telefone completo (DDI + Número) é obrigatório!");
        return;
      }

      const fullPhone = `${ddi}${number.replace(/\D/g, "")}`;
      createContact(name, fullPhone);
    }

    closeModal();
  };

  return (
    <Dialog
      open={!!modal}
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          closeModal();
        }
      }}
      fullScreen={fullScreen}
      maxWidth={false}
      sx={{
        "& .MuiDialog-paper": {
          width: "360px",
          maxWidth: "90vw",
          borderRadius: 3,
          padding: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px",
        }}
      >
        {isEditMode ? "Editar Contato" : "Cadastrar Contato"}
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 5 }}>
        <TextField
          label="Nome"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          variant="filled"

        />

        {!isEditMode && (
          <Stack direction="row" spacing={1}>
            <TextField
              label="DDI"
              value={ddi}
              onChange={(e) => setDdi(e.target.value)}
              sx={{ width: "80px" }}
              variant="filled"
            />

            <TextField
              label="Número"
              placeholder="(11) 91234-5678"
              fullWidth
              value={number}
              variant="filled"
              onChange={(e) => setNumber(formatPhone(e.target.value))}
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "flex-end" }}>
        <Button color="error" onClick={closeModal}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          {isEditMode ? "Salvar" : "Cadastrar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
