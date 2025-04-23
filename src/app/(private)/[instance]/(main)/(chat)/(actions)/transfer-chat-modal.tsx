import { Button, IconButton, MenuItem, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext } from "react";
import { AppContext } from "../../../app-context";

/* interface TransferChatModalProps {
  chatId: number;
}
 */
export default function TransferChatModal() {
  const { closeModal } = useContext(AppContext);

  return (
    <div className="w-[26rem] rounded-md bg-slate-700 px-4 py-4">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Transferir conversa</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <form className="flex flex-col gap-6">
        <TextField select label="Usuário" required>
          <MenuItem value={1}>Diego Lopes</MenuItem>
          <MenuItem value={2}>Matheus Silva</MenuItem>
          <MenuItem value={3}>Juliana Martins</MenuItem>
          <MenuItem value={4}>Giovanna Oliveira</MenuItem>
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
            Transferir
          </Button>
        </div>
      </form>
    </div>
  );
}
