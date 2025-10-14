import filesService from "@/lib/services/files.service";
import { InternalGroup } from "@in.pulse-crm/sdk";
import { PersonAdd } from "@mui/icons-material";
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
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAppContext } from "../../../app-context";
import { InternalChatContext } from "../../../internal-context";
import { ContactsContext } from "../../contacts/contacts-context";
import { IWppGroup } from "../internal-groups-context";

// Tipo comum para contatos/usuários
type UnifiedContact = {
  name: string;
  phone: string | null;
  userId?: number;
};

interface UpdateInternalGroupModalProps {
  group: InternalGroup;
  wppGroups: IWppGroup[];
  onSubmit: (
    id: number,
    data: {
      name: string;
      participants: number[];
      wppGroupId: string | null;
    },
  ) => Promise<void>;
  onSubmitImage: (id: number, file: File) => Promise<void>;
}

export default function UpdateInternalGroupModal({
  group,
  wppGroups,
  onSubmit,
  onSubmitImage,
}: UpdateInternalGroupModalProps) {
  const { closeModal } = useAppContext();
  const { users } = useContext(InternalChatContext);
  const { state } = useContext(ContactsContext);

  const [name, setName] = useState(group.groupName);
  const [selectedUser, setSelectedUser] = useState<UnifiedContact | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<IWppGroup | null>(
    wppGroups.find((g) => g.id.user === group.wppGroupId) || null,
  );

  const mergedContacts: UnifiedContact[] = useMemo(() => {
    const map = new Map<string, UnifiedContact>();

    users.forEach((u) => {
      const userId = u.CODIGO;
      const key = `user-${userId}`;

      map.set(key, {
        name: u.NOME,
        phone: userId.toString(),
        userId,
      });
    });

    state.contacts.forEach((c) => {
      const key = `phone-${c.phone}`;
      if (!map.has(key)) {
        map.set(key, {
          name: c.name,
          phone: c.phone,
          userId: +c.phone,
        });
      }
    });

    return Array.from(map.values());
  }, [users, state.contacts]);

  const [participants, setParticipants] = useState<UnifiedContact[]>([]);

  useEffect(() => {
    const participantesComInfo = group.participants.map((p) => {
      const match = mergedContacts.find((c) => c.userId === p.userId);
      if (match) return match;

      return {
        name: `ID: ${p.userId}`,
        phone: p.userId.toString(),
      };
    });

    setParticipants(participantesComInfo);
  }, [group.participants, mergedContacts]);
  const userOptions = useMemo(() => {
    return mergedContacts.filter((c) => !participants.some((p) => p.phone === c.phone));
  }, [mergedContacts, participants]);

  const groupImageRef = useRef<File | null>(null);
  const groupImageInputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name || participants.length === 0) return;

    await onSubmit(group.id, {
      name,
      participants: participants.map((p) => p.userId ?? (p.phone ? +p.phone : 0)), // ou Number(p.phone)
      wppGroupId: selectedGroup?.id.user || null,
    });

    if (groupImageRef.current) {
      await onSubmitImage(group.id, groupImageRef.current);
    }

    toast.success("Grupo atualizado com sucesso!");
    closeModal();
  };

  const handleAddUser = () => {
    if (selectedUser && !participants.some((p) => p.phone === selectedUser.phone)) {
      setParticipants((prev) => [selectedUser, ...prev]);
      setSelectedUser(null);
    }
  };

  const handleRmvUser = (phone: string) => () => {
    setParticipants((prev) => prev.filter((user) => user.phone !== phone));
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
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-6 overflow-auto rounded-md bg-white px-[2rem] py-[1rem] shadow-lg dark:bg-slate-800">
        <div className="border-b border-black/10 pb-2 dark:border-white/20">
          <header className="text-xl font-semibold text-slate-800 dark:text-white">
            Editar Grupo
          </header>
        </div>

        <div className="flex gap-4">
          <div>
            <button
              className="h-32 w-32 overflow-hidden rounded-md border border-white/20 hover:border-white hover:bg-indigo-500/10"
              onClick={() => groupImageInputRef.current?.click()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-full w-full rounded-md border border-slate-600 object-cover"
                />
              ) : (
                <ImageIcon className="text-gray-800 dark:text-white" fontSize="large" />
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
          <div className="flex w-full flex-col items-center gap-4">
            <TextField
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
            <Autocomplete
              options={wppGroups}
              getOptionLabel={(option) => option.name}
              getOptionKey={(option) => option.id.user}
              className="scrollbar-whatsapp w-full"
              renderInput={(params) => <TextField {...params} label="Vincular Grupo" />}
              value={selectedGroup}
              onChange={(_, group) => setSelectedGroup(group)}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex gap-2">
            <Autocomplete
              options={userOptions}
              getOptionLabel={(option) =>
                `${option.phone ? option.phone.padStart(2, "0") : ""} - ${option.name}`
              }
              className="w-96"
              value={selectedUser}
              renderInput={(params) => <TextField {...params} label="Adicionar integrante" />}
              onChange={(_, user) => setSelectedUser(user)}
            />
            <IconButton color="success" className="w-max" onClick={handleAddUser}>
              <PersonAdd fontSize="large" />
            </IconButton>
          </div>
          <div className="flex min-h-0 flex-1 flex-col rounded border-[1px] border-slate-600 p-2">
            <h1 className="border-b border-slate-200/25 p-2">Integrantes</h1>
            <div className="scrollbar-whatsapp mt-2 min-h-0 flex-1 px-2">
              <List dense sx={{ flexGrow: 1, overflowY: "auto" }}>
                {participants.map((p) => (
                  <ListItem key={p.phone} divider>
                    <ListItemText primary={p.name} secondary={`ID: ${p.phone}`} />
                    <IconButton color="error" size="small" onClick={handleRmvUser(p.phone ?? "")}>
                      <PersonRemoveIcon />
                    </IconButton>
                  </ListItem>
                ))}
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
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
