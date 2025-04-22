import { Button, IconButton, MenuItem, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext } from "react";
import { AppContext } from "../../../app-context";

interface FinishChatModalProps {
  chatId: number;
}

export default function FinishChatModal({ chatId }: FinishChatModalProps) {
  const { closeModal } = useContext(AppContext);

  return (
    <div className="w-[26rem] rounded-md bg-slate-700 px-4 py-4">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Finalizar conversa</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <form className="flex flex-col gap-6">
        <TextField select label="Resultado" required>
          <MenuItem value={1}>Cliente já possui estoque</MenuItem>
          <MenuItem value={2}>Não tem interesse</MenuItem>
          <MenuItem value={3}>Venda efetuada</MenuItem>
          <MenuItem value={4}>Não deseja ser chamado</MenuItem>
        </TextField>
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
