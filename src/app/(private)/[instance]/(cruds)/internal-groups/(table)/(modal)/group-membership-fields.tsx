import { Groups, PersonAdd, PersonRemove, WhatsApp } from "@mui/icons-material";
import { Autocomplete, IconButton, List, ListItem, ListItemText, TextField } from "@mui/material";
import { WhatsappGroup } from "@/lib/sdk-local";

export type InternalGroupUser = {
  name: string;
  phone: string | null;
  userId?: number;
};

interface GroupMembershipFieldsProps {
  participants: InternalGroupUser[];
  selectedUser: InternalGroupUser | null;
  userOptions: InternalGroupUser[];
  selectedGroup: WhatsappGroup | null;
  wppGroups: WhatsappGroup[];
  getParticipantKey: (participant: InternalGroupUser) => string | undefined;
  onSelectedUserChange: (user: InternalGroupUser | null) => void;
  onAddUser: () => void;
  onRemoveUser: (participantKey: string) => void;
  onSelectedGroupChange: (group: WhatsappGroup | null) => void;
}

const inputStyles = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: (theme: { palette: { mode: string } }) =>
      theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
  },
};

export default function GroupMembershipFields({
  participants,
  selectedUser,
  userOptions,
  selectedGroup,
  wppGroups,
  getParticipantKey,
  onSelectedUserChange,
  onAddUser,
  onRemoveUser,
  onSelectedGroupChange,
}: GroupMembershipFieldsProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="flex min-h-[25rem] flex-col overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50/40 dark:border-indigo-900 dark:bg-indigo-950/20">
        <header className="border-b border-indigo-200 bg-indigo-100/60 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/40">
          <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
            <Groups fontSize="small" />
            <h2 className="font-semibold">Usuários do sistema</h2>
            <span className="ml-auto rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              {participants.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-300/80">
            Pessoas com acesso a esta conversa dentro do InPulse.
          </p>
        </header>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start gap-2">
            <Autocomplete
              options={userOptions}
              getOptionLabel={(option) => `${option.name} (ID: ${option.userId ?? option.phone})`}
              getOptionKey={(option) =>
                option.userId !== undefined ? `user-${option.userId}` : `phone-${option.phone}`
              }
              fullWidth
              value={selectedUser}
              noOptionsText="Nenhum usuário disponível"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar usuário do sistema"
                  placeholder="Nome ou ID"
                  size="small"
                  sx={inputStyles}
                />
              )}
              onChange={(_, user) => onSelectedUserChange(user)}
            />
            <IconButton
              color="primary"
              onClick={onAddUser}
              disabled={!selectedUser}
              aria-label="Adicionar usuário do sistema"
              title="Adicionar usuário do sistema"
              className="mt-0.5"
            >
              <PersonAdd />
            </IconButton>
          </div>

          <div className="scrollbar-whatsapp max-h-64 flex-1 overflow-y-auto rounded-lg border border-indigo-100 bg-white dark:border-indigo-900/70 dark:bg-slate-800">
            <List dense disablePadding>
              {participants.length === 0 ? (
                <li className="flex min-h-40 items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Adicione ao menos um usuário para dar acesso ao grupo interno.
                </li>
              ) : (
                participants.map((participant, index) => {
                  const participantKey = getParticipantKey(participant) ?? `participant-${index}`;

                  return (
                    <ListItem
                      key={participantKey}
                      divider
                      secondaryAction={
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => onRemoveUser(participantKey)}
                          aria-label={`Remover ${participant.name}`}
                          title="Remover usuário do sistema"
                        >
                          <PersonRemove fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={participant.name}
                        secondary={`Usuário do sistema • ID ${participant.userId ?? participant.phone}`}
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                    </ListItem>
                  );
                })
              )}
            </List>
          </div>
        </div>
      </section>

      <section className="flex min-h-[25rem] flex-col overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20">
        <header className="border-b border-emerald-200 bg-emerald-100/60 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <WhatsApp fontSize="small" />
            <h2 className="font-semibold">Membros do WhatsApp</h2>
            <span className="ml-auto rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              Vínculo opcional
            </span>
          </div>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
            Pessoas que participam pelo grupo externo vinculado.
          </p>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <Autocomplete
            options={wppGroups}
            getOptionLabel={(option) => option.name}
            getOptionKey={(option) => option.id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText="Nenhum grupo do WhatsApp disponível"
            renderInput={(params) => (
              <TextField
                {...params}
                label="Grupo vinculado no WhatsApp"
                placeholder="Selecione um grupo"
                size="small"
                sx={inputStyles}
              />
            )}
            value={selectedGroup}
            onChange={(_, group) => onSelectedGroupChange(group)}
          />

          {selectedGroup ? (
            <div className="rounded-lg border border-emerald-200 bg-white p-4 dark:border-emerald-900/70 dark:bg-slate-800">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <WhatsApp />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                    {selectedGroup.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Grupo externo vinculado
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-32 flex-1 items-center justify-center rounded-lg border border-dashed border-emerald-200 px-6 text-center text-sm text-slate-500 dark:border-emerald-900 dark:text-slate-400">
              Nenhum grupo do WhatsApp vinculado.
            </div>
          )}

          <div className="mt-auto rounded-lg bg-emerald-100/70 p-3 text-xs leading-relaxed text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            A lista de membros é gerenciada no WhatsApp. Vincular um grupo não adiciona seus membros
            como usuários do sistema.
          </div>
        </div>
      </section>
    </div>
  );
}
