import { Button, IconButton, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useMemo, useRef, useState } from "react";
import { useAppContext } from "../../../../app-context";
import { InternalChatContext } from "../../../../internal-context";
import { toast } from "react-toastify";
import ImageIcon from "@mui/icons-material/Image";
import { useInternalGroupsContext } from "../../internal-groups-context";
import { WhatsappGroup } from "@/lib/sdk-local";
import GroupMembershipFields, { InternalGroupUser } from "./group-membership-fields";

type UnifiedContact = InternalGroupUser;
const getParticipantKey = (participant: UnifiedContact) => {
  if (participant.userId !== undefined) {
    return `user-${participant.userId}`;
  }

  if (participant.phone) {
    return `phone-${participant.phone}`;
  }

  return undefined;
};

export default function CreateInternalGroupModal() {
  const { closeModal } = useAppContext();
  const { users } = useContext(InternalChatContext);
  const { createInternalGroup, wppGroups } = useInternalGroupsContext();

  const [name, setName] = useState("");
  const [participants, setParticipants] = useState<UnifiedContact[]>([]);
  const [selectedUser, setSelectedUser] = useState<UnifiedContact | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<WhatsappGroup | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const groupImageRef = useRef<File | null>(null);
  const groupImageInputRef = useRef<HTMLInputElement | null>(null);

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

    return Array.from(map.values());
  }, [users]);

  const userOptions = useMemo(() => {
    return mergedContacts.filter(
      (c) => !participants.some((p) => (p.userId && p.userId === c.userId) || p.phone === c.phone),
    );
  }, [mergedContacts, participants]);

  const handleSubmit = async () => {
    if (!name || participants.length === 0) {
      toast.error("Nome e ao menos um usuário do sistema são obrigatórios!");
      return;
    }

    await createInternalGroup({
      name,
      participants: participants.map((p) => p.userId ?? 0),
      groupId: selectedGroup?.id ?? null,
      groupImage: groupImageRef.current,
    });

    closeModal();
  };

  const handleAddUser = () => {
    if (!selectedUser) {
      return;
    }

    const newKey = getParticipantKey(selectedUser);

    const alreadyAdded = participants.some((participant) => {
      const participantKey = getParticipantKey(participant);
      return participantKey && participantKey === newKey;
    });

    if (!alreadyAdded) {
      setParticipants((prev) => [selectedUser, ...prev]);
    }

    setSelectedUser(null);
  };

  const handleRmvUser = (targetKey: string) => () => {
    setParticipants((prev) =>
      prev.filter((participant) => {
        const participantKey = getParticipantKey(participant);
        return participantKey !== targetKey;
      }),
    );
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
    if (file?.type.startsWith("image/")) {
      groupImageRef.current = file;
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <aside className="flex max-h-[calc(100vh-2rem)] w-[min(58rem,calc(100vw-2rem))] flex-col gap-6 overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <header className="flex w-full items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
          <div>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
              Criar grupo interno
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Defina os acessos internos e o vínculo externo separadamente.
            </p>
          </div>
          <IconButton
            onClick={closeModal}
            className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <CloseIcon />
          </IconButton>
        </header>

        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Informações do grupo
            </h2>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="shrink-0">
                <button
                  type="button"
                  className="h-32 w-32 overflow-hidden rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 dark:border-slate-600 dark:hover:bg-indigo-950/20"
                  onClick={() => groupImageInputRef.current?.click()}
                  aria-label="Selecionar imagem do grupo"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Imagem do grupo"
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
              <div className="flex w-full flex-col gap-2">
                <TextField
                  label="Nome do grupo interno"
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Este é o nome exibido para os usuários dentro do sistema.
                </p>
              </div>
            </div>
          </section>

          <GroupMembershipFields
            participants={participants}
            selectedUser={selectedUser}
            userOptions={userOptions}
            selectedGroup={selectedGroup}
            wppGroups={wppGroups}
            getParticipantKey={getParticipantKey}
            onSelectedUserChange={setSelectedUser}
            onAddUser={handleAddUser}
            onRemoveUser={(participantKey) => handleRmvUser(participantKey)()}
            onSelectedGroupChange={setSelectedGroup}
          />
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
            Criar Grupo
          </Button>
        </div>
      </aside>
    </div>
  );
}
