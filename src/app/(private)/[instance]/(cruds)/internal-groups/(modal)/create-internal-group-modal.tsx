import {
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Autocomplete,
} from "@mui/material";
import { useContext, useMemo, useState } from "react";
import { useAppContext } from "../../../app-context";
import { PersonAdd } from "@mui/icons-material";
import { User } from "@in.pulse-crm/sdk";
import { InternalChatContext } from "../../../internal-context";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import { toast } from "react-toastify";
import { IWppGroup } from "../internal-groups-context";

interface CreateInternalGroupModalProps {
  onSubmit: (data: {
    name: string;
    participants: number[];
    groupId: string | null;
  }) => Promise<void>;
  wppGroups: IWppGroup[];
}

export default function CreateInternalGroupModal({
  onSubmit,
  wppGroups,
}: CreateInternalGroupModalProps) {
  const { closeModal } = useAppContext();
  const { users } = useContext(InternalChatContext);
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<IWppGroup | null>(null);

  const userOptions = useMemo(() => {
    return users.filter((user) => !participants.some((p) => p.CODIGO === user.CODIGO));
  }, [users, participants]);

  const handleSubmit = async () => {
    if (!name || participants.length === 0) return;

    await onSubmit({
      name,
      participants: participants.map((p) => p.CODIGO),
      groupId: selectedGroup?.id.user || null,
    });
    toast.success("Grupo criado com sucesso!");
    closeModal();
  };

  const handleSelectGroup = (group: IWppGroup | null) => {
    setSelectedGroup(group);
  };

  const handleChangeUser = (user: User | null) => {
    setSelectedUser(user);
  };

  const handleAddUser = () => {
    if (selectedUser && !participants.some((user) => user.CODIGO === selectedUser.CODIGO)) {
      setParticipants((prev) => [selectedUser, ...prev]);
      setSelectedUser(null); // Limpa a seleção do Autocomplete
    }
  };

  const handleRmvUser = (userId: number) => () => {
    setParticipants((prev) => prev.filter((user) => user.CODIGO !== userId));
  };

  return (
    <div>
      <div className="flex flex-col gap-6 bg-slate-800 px-[2rem] py-[1rem]">
        <header>Criar novo grupo</header>
        <div className="flex flex-col gap-4">
          <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Autocomplete
            options={wppGroups}
            getOptionLabel={(option) => option.name}
            getOptionKey={(option) => option.id.user}
            className="w-full"
            renderInput={(params) => <TextField {...params} label="Vincular Grupo" />}
            value={selectedGroup} // Define o valor atual do Autocomplete
            onChange={(_, group) => handleSelectGroup(group)}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex gap-2">
            <Autocomplete
              options={userOptions}
              getOptionLabel={(option) =>
                `${option.CODIGO.toString().padStart(2, "0")} - ${option.NOME}`
              }
              getOptionKey={(option) => option.CODIGO}
              className="w-96"
              value={selectedUser} // Define o valor atual do Autocomplete
              renderInput={(params) => <TextField {...params} label="Adicionar integrante" />}
              onChange={(_, user) => handleChangeUser(user)}
            />
            <IconButton color="success" className="w-max" onClick={handleAddUser}>
              <PersonAdd fontSize="large" />
            </IconButton>
          </div>
          <div className="flex min-h-0 flex-1 flex-col rounded border-[1px] border-slate-600 p-2">
            <h1 className="border-b border-slate-200/25 p-2">Integrantes</h1>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2">
              <List dense sx={{ maxHeight: 300, minHeight: 300, overflow: "auto" }}>
                {participants.map((p) => {
                  return (
                    <ListItem key={p.CODIGO} divider>
                      <ListItemText primary={p.NOME} secondary={`ID: ${p.CODIGO} - ${p.NIVEL}`} />
                      <IconButton color="error" size="small" onClick={handleRmvUser(p.CODIGO)}>
                        <PersonRemoveIcon />
                      </IconButton>
                    </ListItem>
                  );
                })}
              </List>
            </div>
          </div>
          <div className="flex w-full flex-row justify-end gap-4 pt-4">
            <Button color="error" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!name || !participants.length}
            >
              Criar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
