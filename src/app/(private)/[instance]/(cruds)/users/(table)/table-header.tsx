"use client";
import { Button, TextField, MenuItem } from "@mui/material";
import { useState } from "react";
import {
  CrmToolbar,
  OperationalPanel,
  OperationalIconButton,
  UiIcon,
  FilterChipBar,
} from "@/lib/ui-system";
import type { RequestFilters, User } from "@/lib/sdk-local";
import { useUsersContext } from "../users-context";
const labels: Record<string, string> = {
  NOME: "Nome",
  LOGIN: "Login",
  EMAIL: "E-mail",
  CODIGO: "Código",
  NIVEL: "Perfil",
  SETOR: "Setor",
};
export default function UsersFilters() {
  const { state, dispatch, loadUsers, sectors } = useUsersContext();
  const [open, setOpen] = useState(false),
    [name, setName] = useState(state.filters.NOME ?? ""),
    [draft, setDraft] = useState({ ...state.filters });
  const apply = (filters: RequestFilters<User>) => {
    dispatch({
      type: "apply-filters",
      filters: Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined),
      ) as RequestFilters<User>,
    });
    setOpen(false);
  };
  const show = () => {
    setDraft({ ...state.filters, NOME: name });
    setOpen(true);
  };
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ ...state.filters, NOME: name });
        }}
      >
        <CrmToolbar>
          <TextField
            label="Buscar usuário por nome"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ flex: "1 1 140px", maxWidth: 480, minWidth: 0 }}
          />
          <OperationalIconButton type="submit" label="Buscar usuários" tooltip="Buscar">
            <UiIcon name="search" scale="toolbar" />
          </OperationalIconButton>
          <OperationalIconButton label="Filtros de usuários" tooltip="Filtros" onClick={show}>
            <UiIcon name="filter" scale="toolbar" />
          </OperationalIconButton>
          <OperationalIconButton
            label="Atualizar usuários"
            tooltip="Atualizar"
            disabled={state.isLoading}
            onClick={loadUsers}
          >
            <UiIcon name="refresh" scale="toolbar" />
          </OperationalIconButton>
        </CrmToolbar>
      </form>
      <FilterChipBar
        items={Object.entries(state.filters)
          .filter(([k, v]) => !["page", "perPage"].includes(k) && v)
          .map(([key, value]) => ({
            key,
            label: `${labels[key] ?? key}: ${key === "SETOR" ? (sectors.find((s) => String(s.id) === value)?.name ?? value) : value}`,
            onDelete: () => {
              const next = { ...state.filters };
              delete next[key as keyof typeof next];
              if (key === "NOME") setName("");
              apply(next);
            },
          }))}
        onShowAll={show}
        onClearAll={() => {
          setName("");
          apply({ perPage: state.filters.perPage });
        }}
      />
      <OperationalPanel
        open={open}
        title="Filtros de usuários"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={() => apply(draft)}>
              Aplicar filtros
            </Button>
          </>
        }
      >
        <div className="ip-crud-grid">
          {(["CODIGO", "LOGIN", "EMAIL"] as const).map((key) => (
            <TextField
              key={key}
              label={labels[key]}
              value={draft[key] ?? ""}
              onChange={(e) => setDraft((old) => ({ ...old, [key]: e.target.value }))}
            />
          ))}
          <TextField
            select
            label="Perfil"
            value={draft.NIVEL ?? ""}
            onChange={(e) => setDraft((old) => ({ ...old, NIVEL: e.target.value }))}
          >
            <MenuItem value="">Todos</MenuItem>
            {[
              ["ADMIN", "Administrador"],
              ["ATIVO", "Ativo"],
              ["RECEP", "Receptivo"],
              ["AMBOS", "Ambos"],
              ["EXTERNO", "Externo"],
            ].map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Setor"
            value={draft.SETOR ?? ""}
            onChange={(e) => setDraft((old) => ({ ...old, SETOR: e.target.value }))}
          >
            <MenuItem value="">Todos</MenuItem>
            {sectors.map((sector) => (
              <MenuItem key={sector.id} value={String(sector.id)}>
                {sector.name}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </OperationalPanel>
    </>
  );
}
