import { Autocomplete, IconButton, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useMemo, useRef, useState } from "react";
import { AppContext } from "../../../app-context";

import StartInternalChatModalItem from "./start-internal-chat-modal-item";
import { InternalChatContext } from "../../../internal-context";
import { Search } from "@mui/icons-material";
import { User } from "@in.pulse-crm/sdk";
import { WhatsappContext } from "../../../whatsapp-context";

const filterOptions = [
  { value: "CODIGO", name: "Código" },
  { value: "NOME", name: "Nome" },
  { value: "EMAIL", name: "E-mail" },
  { value: "NIVEL", name: "Nível" },
  { value: "SETOR", name: "Setor" },
];

export default function StartInternalChatModal() {
  const { closeModal } = useContext(AppContext);
  const { menuUsers, updateMenuUsers } = useContext(InternalChatContext);
  const { sectors } = useContext(WhatsappContext);
  const [selectedFilter, setSelectedFilter] = useState<{ value: string; name: string } | null>(
    null,
  );
  const filterValue = useRef<Partial<Record<keyof User, string>>>(undefined);
  const filterSelectTypeOptions = {
    NIVEL: [
      { value: "ADMIN", name: "Admin" },
      { value: "RECEP", name: "Receptivo" },
      { value: "ATIVO", name: "Ativo" },
      { value: "AMBOS", name: "Ambos" },
    ],
    SETOR: sectors.map((s) => ({
      value: s.id.toString(),
      name: s.name,
    })),
  };

  const rows = useMemo(() => {
    if (menuUsers.length === 0) {
      return (
        <div className="flex h-[30rem] flex-col items-center justify-center gap-2 overflow-y-auto">
          Nenhum usúario encontrado
        </div>
      );
    }
    return (
      <ul className="flex h-[30rem] flex-col items-center gap-2 overflow-y-auto">
        {menuUsers.map((u) => (
          <StartInternalChatModalItem key={u.CODIGO} user={u} />
        ))}
      </ul>
    );
  }, [menuUsers]);

  return (
    <div className="w-[35rem] rounded-md bg-slate-800 px-4 py-4">
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-xl">Iniciar conversa Interna</h1>
        <IconButton
          onClick={() => {
            closeModal();
            updateMenuUsers();
          }}
        >
          <CloseIcon />
        </IconButton>
      </header>

      <div className="flex w-full flex-row items-center justify-between gap-4 pb-2">
        <Autocomplete
          options={filterOptions}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => <TextField {...params} label="Selecionar filtro" />}
          getOptionKey={(option) => option.value}
          onChange={(_, value, reason) => {
            if (reason === "clear") {
              filterValue.current = undefined;
            }
            setSelectedFilter(value || null);
          }}
          fullWidth
        />
        {(selectedFilter?.value === "SETOR" || selectedFilter?.value === "NIVEL") && (
          <Autocomplete
            options={filterSelectTypeOptions[selectedFilter.value] ?? []}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => (
              <TextField
                {...params}
                label={selectedFilter?.name ?? "Valor de filtro"}
                name="filter"
                type="string"
                onChange={(e) => {
                  if (selectedFilter) {
                    filterValue.current = { [selectedFilter.value]: e.target.value };
                  }
                }}
              />
            )}
            onChange={(_, value, reason) => {
              const newValue = value?.value ? { [selectedFilter.value]: value.value } : undefined;
              filterValue.current = newValue;
            }}
            getOptionKey={(option) => option.value}
            fullWidth
          />
        )}
        {selectedFilter?.value &&
          selectedFilter?.value !== "SETOR" &&
          selectedFilter?.value !== "NIVEL" && (
            <TextField
              label={selectedFilter?.name ?? "Valor de filtro"}
              name={selectedFilter?.name ?? "filter"}
              type="string"
              fullWidth
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const newValue = (e.target as HTMLInputElement).value
                    ? { [selectedFilter.value]: (e.target as HTMLInputElement).value }
                    : undefined;
                  filterValue.current = newValue;
                  updateMenuUsers(filterValue.current);
                }
              }}
              onChange={(e) => {
                if (selectedFilter) {
                  const newValue = e.target.value
                    ? { [selectedFilter.value]: e.target.value }
                    : undefined;
                  filterValue.current = newValue;
                }
              }}
            />
          )}
        <Search
          onClick={() => {
            updateMenuUsers(filterValue.current);
          }}
          className="cursor-pointer"
        />
      </div>
      {rows}
    </div>
  );
}
