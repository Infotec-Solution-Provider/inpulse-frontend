import { Button, IconButton, MenuItem, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../../app-context";
import { WhatsappContext } from "../../../whatsapp-context";
import { UsersContext } from "../../../(cruds)/users/users-context";

export default function TransferChatModal() {
  const { closeModal } = useContext(AppContext);
  const { currentChat, transferAttendance } = useContext(WhatsappContext);
  const { users,loadUsers } = useContext(UsersContext);

  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const handleTransfer = () => {
    if (!selectedUser) return;
    if (!currentChat) return;
    transferAttendance(currentChat?.id, selectedUser);
    closeModal();
  };
  useEffect(() => {
      loadUsers();
  }, []);

  return (
    <div className="w-[26rem] rounded-md bg-slate-700 px-4 py-4">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Transferir conversa</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <form className="flex flex-col gap-6">
        <TextField
          select
          label="Usuário"
          required
          value={selectedUser ?? ""}
          onChange={(e) => setSelectedUser(Number(e.target.value))}
        >
          {users?.map((user) => (
            <MenuItem key={user.CODIGO} value={user.CODIGO}>
              {user.NOME_EXIBICAO || user.NOME}
            </MenuItem>
          ))}
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
            disabled={!selectedUser}
            onClick={handleTransfer}
          >
            Transferir
          </Button>
        </div>
      </form>
    </div>
  );
}
