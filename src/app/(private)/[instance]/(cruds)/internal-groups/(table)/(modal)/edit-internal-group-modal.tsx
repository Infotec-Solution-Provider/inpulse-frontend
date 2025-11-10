import filesService from "@/lib/services/files.service";
import { InternalGroup, User } from "@in.pulse-crm/sdk";
import { PersonAdd } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import {
  Autocomplete,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
} from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAppContext } from "../../../../app-context";
import { InternalChatContext } from "../../../../internal-context";
import { useInternalGroupsContext } from "../../internal-groups-context";

interface EditInternalGroupModalProps {
  group: InternalGroup;
}

const getUser = (users: User[], userId: number) => {
  return users.find((user) => user.CODIGO === userId);
};

const getParticipantName = (users: User[], participantId: string) => {
  if (participantId.startsWith("user:")) {
    const userId = Number(participantId.replace("user:", ""));
    const user = getUser(users, userId);
    return user ? user.NOME_EXIBICAO || user.NOME || user.LOGIN : "Usuário Excluído";
  }

  return "Contato Externo";
};

export default function EditInternalGroupModal({ group }: EditInternalGroupModalProps) {
  const { closeModal } = useAppContext();
  const { users } = useContext(InternalChatContext);
  const { updateInternalGroup, updateInternalGroupImage, wppGroups } = useInternalGroupsContext();

  const availableWppGroups = wppGroups ?? [];

  const [name, setName] = useState(group.groupName);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ id: { user: string }; name: string } | null>(
    availableWppGroups.find((g) => g.id.user === group.wppGroupId) || null,
  );
  const [participants, setParticipants] = useState(group.participants.map((p) => p.participantId));
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const groupImageRef = useRef<File | null>(null);
  const groupImageInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async () => {
    if (!name || participants.length === 0) {
      toast.error("Nome e participantes são obrigatórios!");
      return;
    }

    updateInternalGroup(group.id, {
      name,
      participants,
      wppGroupId: selectedGroup?.id.user || null,
    });

    if (groupImageRef.current) {
      updateInternalGroupImage(group.id, groupImageRef.current);
    }

    closeModal();
  };

  const handleAddUser = () => {
    if (selectedUser) {
      const participantId = `user:${selectedUser.CODIGO}`;
      if (!participants.includes(participantId)) {
        setParticipants((prev) => [...prev, participantId]);
      }
    }
  };

  const handleRemoveUser = (participant: string) => () => {
    setParticipants((prev) => prev.filter((p) => p !== participant));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    groupImageRef.current = file;

    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      groupImageRef.current = file;
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (group.groupImageFileId) {
      const imageUrl = filesService.getFileDownloadUrl(group.groupImageFileId);
      setImagePreview(imageUrl);
    }
  }, [group]);

  return (
    <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <aside className="flex h-full w-[40rem] flex-col gap-6 rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <header className="flex w-full items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Editar Grupo</h1>
          <IconButton
            onClick={closeModal}
            className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <CloseIcon />
          </IconButton>
        </header>

        <div className="flex flex-col gap-6">
          <div className="flex gap-4">
            <div>
              <button
                className="h-32 w-32 overflow-hidden rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 dark:border-slate-600 dark:hover:bg-indigo-950/20"
                onClick={() => groupImageInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <ImageIcon className="text-gray-400 dark:text-gray-500" fontSize="large" />
                )}
              </button>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageChange}
                ref={groupImageInputRef}
              />
            </div>
            <div className="flex w-full flex-col gap-4">
              <TextField
                label="Nome do Grupo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                variant="outlined"
                className="bg-white dark:bg-slate-700"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
                  },
                }}
              />
              <Autocomplete
                options={availableWppGroups}
                getOptionLabel={(option) => option.name}
                getOptionKey={(option) => option.id.user}
                getOptionDisabled={(option) => selectedGroup?.id.user === option.id.user}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Vincular Grupo WhatsApp"
                    className="bg-white dark:bg-slate-700"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: (theme) =>
                          theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
                      },
                    }}
                  />
                )}
                value={selectedGroup}
                onChange={(_, groupOption) => setSelectedGroup(groupOption)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Autocomplete
                options={users}
                getOptionLabel={(option) => `(${option.CODIGO}) ${option.NOME}`}
                getOptionKey={(option) => option.CODIGO}
                getOptionDisabled={(option) => participants.includes(`user:${option.CODIGO}`)}
                fullWidth
                value={selectedUser}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Adicionar Participante"
                    className="bg-white dark:bg-slate-700"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: (theme) =>
                          theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
                      },
                    }}
                  />
                )}
                onChange={(_, userOption) => setSelectedUser(userOption)}
              />
              <IconButton
                color="success"
                onClick={handleAddUser}
                className="hover:bg-green-50 dark:hover:bg-green-950/30"
              >
                <PersonAdd fontSize="large" />
              </IconButton>
            </div>

            <div className="flex min-h-0 flex-col rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <h2 className="mb-3 border-b border-slate-200 pb-2 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                Participantes ({participants.length})
              </h2>
              <div className="scrollbar-whatsapp max-h-60 overflow-y-auto">
                <List dense className="h-60">
                  {participants.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Nenhum participante adicionado
                    </p>
                  ) : (
                    participants.map((participant, index) => {
                      return (
                        <ListItem
                          key={`participant-${index}`}
                          className="rounded hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          divider
                        >
                          <ListItemText
                            primary={getParticipantName(users, participant)}
                            secondary={`${participant}`}
                          />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={handleRemoveUser(participant)}
                            className="hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <PersonRemoveIcon />
                          </IconButton>
                        </ListItem>
                      );
                    })
                  )}
                </List>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
          <Button variant="outlined" color="error" onClick={closeModal} className="px-6 py-2">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!name || !participants.length}
            className="bg-indigo-600 px-6 py-2 hover:bg-indigo-700"
          >
            Salvar Alterações
          </Button>
        </div>
      </aside>
    </div>
  );
}
