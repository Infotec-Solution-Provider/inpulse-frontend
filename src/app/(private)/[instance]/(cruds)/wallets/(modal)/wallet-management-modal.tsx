import usersService from "@/lib/services/users.service";
import { User } from "@in.pulse-crm/sdk";
import CloseIcon from "@mui/icons-material/Close";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import {
  Button,
  DialogTitle,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { WalletsContext } from "../context";
import { StyledDialog, StyledIconButton } from "./styles-modal";

export default function WalletManagementModal() {
  const {
    selectedWallet,
    setSelectedWallet,
    updateWalletName,
    walletUsers = [],
    addUserToWallet,
    removeUserFromWallet,
    loadWalletUsers,
  } = useContext(WalletsContext);

  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (selectedWallet) {
        try {
          setLoadingUsers(true);
          await loadWalletUsers?.();
          const response = await usersService.getUsers({ perPage: "1000" });
          setAvailableUsers(response.data);
        } finally {
          setLoadingUsers(false);
        }
      }
    };
    loadData();
  }, [selectedWallet, loadWalletUsers]);

  const handleNameSubmit = async () => {
    if (selectedWallet) {
      await updateWalletName(selectedWallet.id, name);
      setSelectedWallet(null);
    }
  };

  const handleAddUser = async () => {
    if (userId && selectedWallet) {
      try {
        await addUserToWallet(Number(userId));
        setUserId("");
        await loadWalletUsers?.();
      } catch (error) {
        console.error("Error adding user:", error);
      }
    }
  };

  if (!selectedWallet) return null;

  return (
    <StyledDialog
      open={!!selectedWallet}
      onClose={() => setSelectedWallet(null)}
      fullWidth
      maxWidth="sm"
    >
      <div className="flex h-[85vh] min-h-0 flex-col gap-4 bg-slate-800 px-[2rem] py-[2rem]">
        <div className="flex justify-between">
          <DialogTitle
            sx={{
              alignSelf: "center",
              padding: 0,
              color: "white",
            }}
          >
            Gerenciar: {selectedWallet.name}
          </DialogTitle>
          <StyledIconButton aria-label="close" onClick={() => setSelectedWallet(null)}>
            <CloseIcon />
          </StyledIconButton>
        </div>
        <div className="flex gap-2">
          <TextField
            label="Novo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            sx={{ margin: 0 }}
          />
          <Button
            variant="contained"
            onClick={handleNameSubmit}
            disabled={!name}
            sx={{ height: "40px", width: "150px", alignSelf: "center" }}
          >
            Salvar
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex gap-2">
            <FormControl fullWidth size="small">
              <InputLabel id="user-select-label">Adicionar integrante</InputLabel>
              <Select
                labelId="user-select-label"
                value={userId}
                onChange={(e) => setUserId(e.target.value as string)}
                label="Adicionar integrante"
              >
                <MenuItem value="" disabled>
                  <em>Selecione um usuário</em>
                </MenuItem>
                {availableUsers.map((user) => (
                  <MenuItem key={user.CODIGO} value={user.CODIGO.toString()}>
                    {user.NOME}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleAddUser}
              disabled={!userId}
              sx={{ minWidth: 120 }}
            >
              Adicionar
            </Button>
            {/* <TextField
                            type="number"
                            label="Adicionar integrante"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            fullWidth
                            size="small"
                            margin="normal"
                            sx={{ margin: 0 }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleAddUser}
                            disabled={!userId}
                            sx={{ height: '40px', width: '150px', alignSelf: 'center' }}
                        >
                            Adicionar
                        </Button> */}
          </div>
          <div className="flex min-h-0 flex-1 flex-col rounded border-[1px] border-slate-600 p-2">
            <h1 className="border-b-[1px] border-blue-500 p-2">Integrantes</h1>
            <div className="scrollbar-whatsapp mt-2 min-h-0 flex-1 px-2">
              {loadingUsers ? (
                <div className="flex justify-center py-4">
                  <HourglassBottomIcon className="animate-spin" />
                </div>
              ) : (
                <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
                  {walletUsers.map((userId) => {
                    const user = availableUsers.find((u) => u.CODIGO === userId);
                    return (
                      <ListItem key={userId} divider>
                        <ListItemText
                          primary={user ? user.NOME : `Usuário #${userId}`}
                          secondary={`ID: ${userId}`}
                        />
                        <Button
                          color="error"
                          size="small"
                          onClick={async () => {
                            if (confirm("Tem certeza que deseja remover este usuário?")) {
                              await removeUserFromWallet?.(userId);
                              await loadWalletUsers?.();
                            }
                          }}
                        >
                          Remover
                        </Button>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </div>
          </div>
        </div>
      </div>
    </StyledDialog>
  );
}
