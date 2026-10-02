"use client";

import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import {
  Badge,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
} from "@mui/material";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import useInternalChatContext from "../../internal-context";
import useMonitorContext from "../context";
import { createInitialFilters } from "../filters-state";
import { dialogPaperSx, surface, surfaceBorder } from "../surface";
import type { MonitorFiltersState } from "../types";
import { quickFilterLabel } from "./summary";

function FilterCheckbox({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2 py-1 text-sm text-slate-700 dark:text-slate-200"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 accent-indigo-600"
      />
      {children}
    </label>
  );
}

function FilterDateRange({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MonitorFiltersState["startedAt"];
  onChange: (value: MonitorFiltersState["startedAt"]) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
      </legend>
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <TextField
          type="date"
          size="small"
          fullWidth
          label="De"
          value={value.from ?? ""}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { "aria-label": `${label}: de`, max: value.to || undefined },
          }}
          onChange={(event) => onChange({ ...value, from: event.target.value || null })}
        />
        <TextField
          type="date"
          size="small"
          fullWidth
          label="Até"
          value={value.to ?? ""}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { "aria-label": `${label}: até`, min: value.from || undefined },
          }}
          onChange={(event) => onChange({ ...value, to: event.target.value || null })}
        />
      </div>
    </fieldset>
  );
}

/** Filters set in the dialog; search and the quick filter have their own controls. */
function dialogFilterCount(filters: MonitorFiltersState): number {
  return [
    filters.user !== "all",
    filters.scheduledFor !== "all",
    filters.showBots,
    !filters.showOngoing || !filters.showFinished,
    filters.showOnlyScheduled,
    filters.showUnreadOnly,
    filters.showPendingResponseOnly,
    Object.values(filters.categories).some((visible) => !visible),
    ...[filters.startedAt, filters.finishedAt, filters.scheduledAt, filters.scheduledTo].map(
      (range) => !!range.from || !!range.to,
    ),
  ].filter(Boolean).length;
}

const sectionTitle =
  "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

export default function MonitorFilters() {
  const {
    filters,
    appliedFilters,
    setFilters,
    applyFilters,
    hasUnappliedFilters,
    isLoading,
    setOperationalStatus,
  } = useMonitorContext();
  const { users = [] } = useInternalChatContext();
  const [open, setOpen] = useState(false);
  // Draft when the dialog opened; cancelling restores it, discarding only dialog edits.
  const snapshot = useRef(filters);
  const update = <K extends keyof MonitorFiltersState>(key: K, value: MonitorFiltersState[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const appliedCount = dialogFilterCount(appliedFilters);
  const quickFilter = quickFilterLabel(appliedFilters.operationalStatus);
  const openDialog = () => {
    snapshot.current = filters;
    setOpen(true);
  };
  const cancel = () => {
    setFilters(snapshot.current);
    setOpen(false);
  };

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
        aria-label="Filtros da monitoria"
        className="flex shrink-0 flex-wrap items-center gap-2"
      >
        <TextField
          size="small"
          label="Pesquisar"
          placeholder="Nome, telefone ou mensagem"
          value={filters.searchText}
          onChange={(event) => update("searchText", event.target.value)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="submit"
                    size="small"
                    edge="end"
                    aria-label="Buscar"
                    disabled={isLoading && !hasUnappliedFilters}
                  >
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: { xs: "100%", sm: 340 },
            "& .MuiOutlinedInput-root": { bgcolor: surface },
          }}
        />
        <Tooltip title="Filtros">
          <IconButton
            aria-label={
              appliedCount
                ? `Filtros, ${appliedCount} ${appliedCount === 1 ? "aplicado" : "aplicados"}`
                : "Filtros"
            }
            aria-haspopup="dialog"
            onClick={openDialog}
            sx={{
              border: 1,
              borderColor: appliedCount ? "primary.main" : surfaceBorder,
              borderRadius: 2,
              bgcolor: surface,
              "&:hover": { bgcolor: surface },
            }}
          >
            <Badge badgeContent={appliedCount} color="primary">
              <FilterListIcon color={appliedCount ? "primary" : "action"} />
            </Badge>
          </IconButton>
        </Tooltip>
        {quickFilter && (
          <Chip
            color="primary"
            size="small"
            variant="outlined"
            label={`Filtro rápido: ${quickFilter}`}
            onDelete={() => setOperationalStatus("all")}
          />
        )}
        <p
          role="status"
          className={
            hasUnappliedFilters && !open
              ? "basis-full text-xs text-amber-700 dark:text-amber-300"
              : "sr-only"
          }
        >
          {hasUnappliedFilters
            ? "Há alterações de filtros para aplicar."
            : "Os filtros selecionados estão aplicados."}
        </p>
      </form>
      <Dialog
        open={open}
        // A stray click outside must not discard the edits; Esc and the buttons close it.
        onClose={(_event, reason) => {
          if (reason !== "backdropClick") cancel();
        }}
        fullWidth
        maxWidth="lg"
        aria-labelledby="monitor-filters-title"
        slotProps={{ paper: { sx: dialogPaperSx } }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
            setOpen(false);
          }}
          // Shrink to the dialog height so only the content scrolls and the actions stay visible.
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogTitle id="monitor-filters-title" sx={{ pr: 7 }}>
            Filtros da monitoria
          </DialogTitle>
          <IconButton
            aria-label="Fechar filtros"
            onClick={cancel}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon />
          </IconButton>
          <DialogContent dividers className="space-y-6">
            <section aria-labelledby="monitor-filters-search">
              <h3 id="monitor-filters-search" className={sectionTitle}>
                Busca, responsável e ordenação
              </h3>
              <div className="grid gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-4">
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Buscar em"
                  value={filters.searchColumn}
                  onChange={(event) =>
                    update(
                      "searchColumn",
                      event.target.value as MonitorFiltersState["searchColumn"],
                    )
                  }
                >
                  <MenuItem value="all">Todos os campos</MenuItem>
                  <MenuItem value="name">Nome</MenuItem>
                  <MenuItem value="phone">Telefone</MenuItem>
                  <MenuItem value="customer">Cliente</MenuItem>
                  <MenuItem value="message">Mensagem</MenuItem>
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Atendente / participante"
                  fullWidth
                  value={filters.user}
                  onChange={(event) =>
                    update(
                      "user",
                      event.target.value === "all" ? "all" : Number(event.target.value),
                    )
                  }
                >
                  <MenuItem value="all">Todos</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.CODIGO} value={user.CODIGO}>
                      {user.NOME}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Ordenar por"
                  value={filters.sortBy}
                  onChange={(event) =>
                    update("sortBy", event.target.value as MonitorFiltersState["sortBy"])
                  }
                >
                  <MenuItem value="urgency">Urgência operacional</MenuItem>
                  <MenuItem value="startedAt">Data de início</MenuItem>
                  <MenuItem value="finishedAt">Data de finalização</MenuItem>
                  <MenuItem value="lastMessage">Última mensagem</MenuItem>
                  <MenuItem value="name">Nome</MenuItem>
                  <MenuItem value="scheduledAt">Agendado para</MenuItem>
                </TextField>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Ordem"
                  value={filters.sortOrder}
                  onChange={(event) =>
                    update("sortOrder", event.target.value as MonitorFiltersState["sortOrder"])
                  }
                >
                  <MenuItem value="desc">
                    {filters.sortBy === "urgency" ? "Mais urgentes primeiro" : "Decrescente"}
                  </MenuItem>
                  <MenuItem value="asc">
                    {filters.sortBy === "urgency" ? "Menos urgentes primeiro" : "Crescente"}
                  </MenuItem>
                </TextField>
              </div>
            </section>

            <div className="grid gap-6 sm:grid-cols-2">
              <section aria-labelledby="monitor-filters-categories">
                <h3 id="monitor-filters-categories" className={sectionTitle}>
                  Categorias
                </h3>
                {(
                  [
                    ["showCustomerChats", "Conversas com clientes"],
                    ["showInternalChats", "Conversas internas"],
                    ["showInternalGroups", "Grupos internos"],
                    ["showSchedules", "Agendamentos"],
                  ] as const
                ).map(([key, label]) => (
                  <FilterCheckbox
                    key={key}
                    id={`monitor-${key}`}
                    checked={filters.categories[key]}
                    onChange={(checked) =>
                      setFilters((current) => ({
                        ...current,
                        categories: { ...current.categories, [key]: checked },
                      }))
                    }
                  >
                    {label}
                  </FilterCheckbox>
                ))}
              </section>
              <section aria-labelledby="monitor-filters-situation">
                <h3 id="monitor-filters-situation" className={sectionTitle}>
                  Situação
                </h3>
                {(
                  [
                    ["showBots", "Incluir bots"],
                    ["showOngoing", "Em andamento"],
                    ["showFinished", "Finalizados"],
                    ["showUnreadOnly", "Apenas não lidas"],
                    ["showPendingResponseOnly", "Apenas sem resposta"],
                  ] as const
                ).map(([key, label]) => (
                  <FilterCheckbox
                    key={key}
                    id={`monitor-${key}`}
                    checked={filters[key]}
                    onChange={(checked) => update(key, checked)}
                  >
                    {label}
                  </FilterCheckbox>
                ))}
              </section>
            </div>

            <section aria-labelledby="monitor-filters-period">
              <h3 id="monitor-filters-period" className={sectionTitle}>
                Período da conversa
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FilterDateRange
                  label="Data de início"
                  value={filters.startedAt}
                  onChange={(value) => update("startedAt", value)}
                />
                <FilterDateRange
                  label="Data de finalização"
                  value={filters.finishedAt}
                  onChange={(value) => update("finishedAt", value)}
                />
              </div>
            </section>

            <section aria-labelledby="monitor-filters-schedules">
              <h3 id="monitor-filters-schedules" className={sectionTitle}>
                Agendamentos
              </h3>
              <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FilterDateRange
                  label="Agendado no dia"
                  value={filters.scheduledAt}
                  onChange={(value) => update("scheduledAt", value)}
                />
                <FilterDateRange
                  label="Agendado para o dia"
                  value={filters.scheduledTo}
                  onChange={(value) => update("scheduledTo", value)}
                />
                <TextField
                  select
                  size="small"
                  label="Agendado para"
                  fullWidth
                  value={filters.scheduledFor}
                  onChange={(event) =>
                    update(
                      "scheduledFor",
                      event.target.value === "all" ? "all" : Number(event.target.value),
                    )
                  }
                >
                  <MenuItem value="all">Qualquer atendente</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.CODIGO} value={user.CODIGO}>
                      {user.NOME}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
              <div className="mt-2">
                <FilterCheckbox
                  id="monitor-showOnlyScheduled"
                  checked={filters.showOnlyScheduled}
                  onChange={(checked) => update("showOnlyScheduled", checked)}
                >
                  Apenas agendados
                </FilterCheckbox>
              </div>
            </section>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button
              type="button"
              onClick={() =>
                setFilters((current) => ({
                  ...createInitialFilters(),
                  searchText: current.searchText,
                  operationalStatus: current.operationalStatus,
                }))
              }
              sx={{ mr: "auto" }}
            >
              Limpar filtros
            </Button>
            <Button type="button" onClick={cancel}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" startIcon={<SearchIcon />}>
              Aplicar filtros
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
