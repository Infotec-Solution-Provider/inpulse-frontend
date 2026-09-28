"use client";

import FilterListIcon from "@mui/icons-material/FilterList";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import { Button, Chip, MenuItem, TextField } from "@mui/material";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import useInternalChatContext from "../../internal-context";
import useMonitorContext from "../context";
import type { MonitorFiltersState } from "../types";

const panelClass =
  "rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800";

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
      <legend className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
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

export default function MonitorFilters() {
  const { filters, setFilters, resetFilters, applyFilters, hasUnappliedFilters, isLoading } =
    useMonitorContext();
  const { users = [] } = useInternalChatContext();
  const [expanded, setExpanded] = useState(false);
  const update = <K extends keyof MonitorFiltersState>(key: K, value: MonitorFiltersState[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const activeFiltersCount = [
    !!filters.searchText,
    filters.user !== "all",
    filters.scheduledFor !== "all",
    filters.operationalStatus !== "all",
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

  const handleApply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters();
  };

  return (
    <aside
      aria-label="Filtros da monitoria"
      className={`min-h-0 w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 lg:static lg:h-full lg:max-h-none lg:w-80 ${expanded ? "h-[34rem] max-h-[70dvh]" : ""}`}
    >
      <form
        onSubmit={handleApply}
        className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]"
      >
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <FilterListIcon fontSize="small" />
            <h2 className="hidden text-sm font-semibold lg:block">Filtros</h2>
            <button
              type="button"
              className="flex items-center gap-1 rounded text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
              aria-expanded={expanded}
              aria-controls="monitor-filter-fields"
              onClick={() => setExpanded((current) => !current)}
            >
              Filtros
              <ExpandMoreIcon fontSize="small" className={expanded ? "rotate-180" : ""} />
            </button>
            {activeFiltersCount > 0 && (
              <Chip
                label={activeFiltersCount}
                size="small"
                color="primary"
                aria-label={`${activeFiltersCount} filtros selecionados`}
              />
            )}
          </div>
          <Button type="button" size="small" onClick={resetFilters}>
            Limpar
          </Button>
        </header>

        <div
          id="monitor-filter-fields"
          className={`scrollbar-whatsapp min-h-0 space-y-3 overflow-y-auto p-3 lg:block ${expanded ? "block" : "hidden"}`}
        >
          <section className={`${panelClass} space-y-3`} aria-label="Busca">
            <TextField
              fullWidth
              size="small"
              label="Pesquisar"
              placeholder="Nome, telefone ou mensagem"
              value={filters.searchText}
              onChange={(event) => update("searchText", event.target.value)}
            />
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
          </section>

          <section className={`${panelClass} space-y-3`} aria-label="Responsável e ordenação">
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
          </section>

          <details className={panelClass}>
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
              Categorias e situação
            </summary>
            <div className="mt-3 space-y-1">
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
              <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
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
            </div>
          </details>

          <details className={panelClass}>
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
              Período da conversa
            </summary>
            <div className="mt-3 space-y-4">
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
          </details>

          <details className={panelClass}>
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
              Agendamentos
            </summary>
            <div className="mt-3 space-y-4">
              <FilterCheckbox
                id="monitor-showOnlyScheduled"
                checked={filters.showOnlyScheduled}
                onChange={(checked) => update("showOnlyScheduled", checked)}
              >
                Apenas agendados
              </FilterCheckbox>
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
          </details>
        </div>

        <footer
          className={`border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 lg:block ${expanded ? "block" : "hidden"}`}
        >
          <p
            role="status"
            className={`mb-2 text-xs ${hasUnappliedFilters ? "text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}
          >
            {hasUnappliedFilters
              ? "Há alterações de filtros para aplicar."
              : "Os filtros selecionados estão aplicados."}
          </p>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            startIcon={<SearchIcon />}
            disabled={isLoading && !hasUnappliedFilters}
          >
            Aplicar filtros
          </Button>
        </footer>
      </form>
    </aside>
  );
}
