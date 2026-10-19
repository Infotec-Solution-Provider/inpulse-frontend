"use client";

import { List, LayoutGrid, Search, SlidersHorizontal } from "lucide-react";
import {
  Button,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { FilterChipBar, OperationalIconButton, OperationalPanel } from "@/lib/ui-system";
import useInternalChatContext from "../../internal-context";
import useMonitorContext from "../context";
import { createInitialFilters } from "../filters-state";
import { appliedFilterLabels } from "../applied-filter-labels";
import type { MonitorFiltersState } from "../types";

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
      className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
      style={{ color: "var(--ip-text)" }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-violet-600"
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

const sectionTitle = "ip-muted mb-3 text-xs font-semibold uppercase tracking-wide";

export default function MonitorFilters() {
  const {
    filters,
    appliedFilters,
    setFilters,
    applyFilters,
    hasUnappliedFilters,
    removeAppliedFilter,
    resetFilters,
    setFilterPanelOpen,
    viewMode,
    setViewMode,
  } = useMonitorContext();
  const { users = [] } = useInternalChatContext();
  const [open, setOpen] = useState(false);
  // Draft when the dialog opened; cancelling restores it, discarding only dialog edits.
  const snapshot = useRef(filters);
  const update = <K extends keyof MonitorFiltersState>(key: K, value: MonitorFiltersState[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const appliedCount = dialogFilterCount(appliedFilters);
  const chips = appliedFilterLabels(
    appliedFilters,
    (id) => users.find((user) => user.CODIGO === id)?.NOME || `Operador ${id}`,
  ).map((item) => ({ ...item, onDelete: () => removeAppliedFilter(item.key) }));
  useEffect(() => {
    setFilterPanelOpen(open);
    return () => setFilterPanelOpen(false);
  }, [open, setFilterPanelOpen]);
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
        className="ip-toolbar ip-conversation-query"
      >
        <TextField
          size="small"
          className="ip-conversation-search"
          label="Pesquisar"
          placeholder="Nome, telefone ou mensagem"
          value={filters.searchText}
          onChange={(event) => update("searchText", event.target.value)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <OperationalIconButton
                    type="submit"
                    label="Buscar"
                    tooltip={hasUnappliedFilters ? "Aplicar busca e ordenação" : "Buscar conversas"}
                    sx={{
                      color: hasUnappliedFilters ? "var(--ip-accent)" : undefined,
                      background: hasUnappliedFilters ? "var(--ip-accent-soft)" : undefined,
                    }}
                  >
                    <Search size={18} />
                  </OperationalIconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 0 }}
        />
        <TextField
          select
          size="small"
          className="ip-conversation-sort"
          label="Ordenar por"
          value={filters.sortBy}
          sx={{ minWidth: 0 }}
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
        <OperationalIconButton
          className="ip-conversation-filter-trigger"
          label={
            appliedCount
              ? `Filtros, ${appliedCount} ${appliedCount === 1 ? "aplicado" : "aplicados"}`
              : "Filtros"
          }
          tooltip={appliedCount ? `Filtros (${appliedCount} aplicados)` : "Filtros"}
          aria-haspopup="dialog"
          onClick={openDialog}
        >
          <SlidersHorizontal size={18} />
          {appliedCount > 0 && <span className="ip-icon-action-count">{appliedCount}</span>}
        </OperationalIconButton>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          size="small"
          className="ip-conversation-view-switch"
          aria-label="Modo de visualização"
          onChange={(_event, value: "cards" | "compact" | null) => {
            if (value) setViewMode(value);
          }}
        >
          <Tooltip title="Lista compacta" describeChild>
            <ToggleButton value="compact" aria-label="Exibir lista compacta">
              <List size={18} />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Cartões" describeChild>
            <ToggleButton value="cards" aria-label="Exibir cartões">
              <LayoutGrid size={18} />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
        <p
          role="status"
          className={
            hasUnappliedFilters && !open ? "basis-full text-xs text-[var(--ip-warning)]" : "sr-only"
          }
        >
          {hasUnappliedFilters
            ? "Há alterações de filtros para aplicar."
            : "Os filtros selecionados estão aplicados."}
        </p>
      </form>
      <FilterChipBar
        items={chips}
        onShowAll={openDialog}
        onClearAll={resetFilters}
        maxVisible={3}
      />
      <OperationalPanel
        open={open}
        onClose={cancel}
        title="Filtros da monitoria"
        closeLabel="Fechar filtros"
        description="Refine a consulta e aplique as alterações quando terminar."
        width={480}
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
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
              Limpar
            </Button>
            <Button type="button" onClick={cancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="conversation-monitor-filters"
              variant="contained"
              startIcon={<Search size={16} />}
            >
              Aplicar filtros
            </Button>
          </div>
        }
      >
        <form
          id="conversation-monitor-filters"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
            setOpen(false);
          }}
          className="space-y-6"
        >
          <section aria-labelledby="monitor-filters-search">
            <h3 id="monitor-filters-search" className={sectionTitle}>
              Busca, responsável e ordenação
            </h3>
            <div className="grid gap-3 pt-1">
              <TextField
                select
                fullWidth
                size="small"
                label="Buscar em"
                value={filters.searchColumn}
                onChange={(event) =>
                  update("searchColumn", event.target.value as MonitorFiltersState["searchColumn"])
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
                  update("user", event.target.value === "all" ? "all" : Number(event.target.value))
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

          <div className="grid gap-6">
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
            <div className="grid gap-4">
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
            <div className="grid items-end gap-4">
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
        </form>
      </OperationalPanel>
    </>
  );
}
