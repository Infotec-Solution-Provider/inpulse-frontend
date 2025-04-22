import { Button, IconButton, MenuItem, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext } from "react";
import { AppContext } from "../../../app-context";

interface FinishChatModalProps {
  contactId: number;
}

export default function EditContactModal({ contactId }: FinishChatModalProps) {
  const { closeModal } = useContext(AppContext);

  return (
    <div className="w-[26rem] rounded-md bg-slate-700 px-4 py-4">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Editar contato</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <form className="flex flex-col gap-6">
        <TextField label="Nome" defaultValue="Maria Silva" />
        <TextField label="Whatsapp" defaultValue="5184449218" />
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="contained"
            color="secondary"
            className="w-32"
            onClick={closeModal}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="contained"
            color="primary"
            className="w-32"
            onClick={closeModal}
          >
            Finalizar
          </Button>
        </div>
      </form>
    </div>
  );
}
