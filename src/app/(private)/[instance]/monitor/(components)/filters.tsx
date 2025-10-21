import Checkbox from "@/lib/components/checkbox";
import RangeDateField from "@/lib/components/range-date-field";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import {
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Chip,
} from "@mui/material";
import { useState, useEffect } from "react";
import useInternalChatContext from "../../internal-context";
import useMonitorContext from "../context";

export default function MonitorFilters() {
  const { filters, setFilters, resetFilters } = useMonitorContext();
  const { users } = useInternalChatContext();

  const [text, setText] = useState<string>("");

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({
        ...filters,
        searchText: text,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [text]);

  // Contador de filtros ativos
  const activeFiltersCount =
    (filters.searchText ? 1 : 0) +
    (filters.user !== "all" ? 1 : 0) +
    (filters.scheduledFor !== "all" ? 1 : 0) +
    (!filters.showOngoing || !filters.showFinished ? 1 : 0) +
    (filters.showOnlyScheduled ? 1 : 0) +
    (filters.showUnreadOnly ? 1 : 0) +
    (filters.showPendingResponseOnly ? 1 : 0);

  const onChangeUser = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      user: e.target.value === "all" ? "all" : Number(e.target.value),
    });
  };

  const onChangeShowBots = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      showBots: e.target.checked,
    });
  };

  const onChangeShowOngoing = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      showOngoing: e.target.checked,
    });
  };

  const onChangeShowFinished = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      showFinished: e.target.checked,
    });
  };

  const onChangeShowOnlyScheduled = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      showOnlyScheduled: e.target.checked,
    });
  };

  const onChangeShowUnreadOnly = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      showUnreadOnly: e.target.checked,
    });
  };

  const onChangeShowPendingResponseOnly = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      showPendingResponseOnly: e.target.checked,
    });
  };

  const onChangeScheduledFor = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      scheduledFor: e.target.value === "all" ? "all" : Number(e.target.value),
    });
  };

  const handleClearSearch = () => {
    setText("");
    setFilters({
      ...filters,
      searchText: "",
    });
  };

  const onChangeSortBy = (e: SelectChangeEvent) => {
    setFilters({
      ...filters,
      sortBy: e.target.value as any,
    });
  };

  const onChangeSortOrder = (e: SelectChangeEvent) => {
    setFilters({
      ...filters,
      sortOrder: e.target.value as any,
    });
  };

  return (
    <aside className="grid h-full w-full grid-rows-[auto_1fr] rounded-lg border border-slate-600/40 bg-slate-200/50 shadow-sm  dark:bg-slate-900 md:w-96">
      {/* Header corporativo */}
      <header className="border-b px-3 py-2.5 bg-slate-200/50 dark:bg-slate-800/50 dark:border-slate-700">
        <div className="flex items-center justify-between backdrop:hidden">
          <div className="flex items-center gap-2">
            <FilterListIcon sx={{ fontSize: 18, color: "rgb(75, 85, 99)" }} />
            <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Filtros</h1>
            {activeFiltersCount > 0 && (
              <Chip
                label={activeFiltersCount}
                size="small"
                sx={{
                  backgroundColor: "rgb(59, 130, 246)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  height: "18px",
                  minWidth: "18px",
                }}
              />
            )}
          </div>
          <button
            className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200"
            onClick={resetFilters}
          >
            <ClearIcon sx={{ fontSize: 13, mr: 0.5 }} />
            Limpar
          </button>
        </div>
      </header>

      <div className="scrollbar-whatsapp max-h-max overflow-y-auto p-3">
        <section className="mb-3 rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-slate-800">
          <h2 className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <SearchIcon sx={{ fontSize: 14 }} />
            Pesquisar
          </h2>
          <div className="flex items-center gap-2">
            <TextField
              placeholder="Digite para buscar..."
              fullWidth
              size="small"
              value={text}
              onChange={(e) => setText(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                },
              }}
            />
            {text && (
              <IconButton size="small" onClick={handleClearSearch} title="Limpar busca">
                <ClearIcon />
              </IconButton>
            )}
          </div>
          {text && (
            <Chip
              label={`Buscando: "${text}"`}
              size="small"
              onDelete={handleClearSearch}
              sx={{ mt: 1 }}
            />
          )}
        </section>

        <section className="mb-3 rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-slate-800">
          <h2 className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
            Ordenação
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <FormControl fullWidth size="small">
              <InputLabel id="monitor-sort-by-label">Ordenar por</InputLabel>
              <Select
                labelId="monitor-sort-by-label"
                value={filters.sortBy}
                label="Ordenar por"
                onChange={onChangeSortBy}
              >
                <MenuItem value="startedAt">Data de início</MenuItem>
                <MenuItem value="finishedAt">Data de finalização</MenuItem>
                <MenuItem value="lastMessage">Data da última mensagem</MenuItem>
                <MenuItem value="name">Nome</MenuItem>
                <MenuItem value="scheduledAt">Agendado em</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel id="monitor-sort-order-label">Ordem</InputLabel>
              <Select
                labelId="monitor-sort-order-label"
                value={filters.sortOrder}
                label="Ordem"
                onChange={onChangeSortOrder}
              >
                <MenuItem value="asc">Crescente</MenuItem>
                <MenuItem value="desc">Decrescente</MenuItem>
              </Select>
            </FormControl>
          </div>
        </section>

        <section className="mb-3 rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-slate-800">
          <h2 className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
            Categorias
          </h2>
          <ul className="flex flex-col gap-2">
            <Checkbox
              id="monit-filter:external-chats"
              value={filters.categories.showCustomerChats}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  categories: { ...filters.categories, showCustomerChats: e.target.checked },
                })
              }
            >
              Exibir: Conversas com clientes
            </Checkbox>
            <Checkbox
              id="monit-filter:internal-chats"
              value={filters.categories.showInternalChats}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  categories: { ...filters.categories, showInternalChats: e.target.checked },
                })
              }
            >
              Exibir: Conversas internas
            </Checkbox>
            <Checkbox
              id="monit-filter:internal-groups"
              value={filters.categories.showInternalGroups}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  categories: { ...filters.categories, showInternalGroups: e.target.checked },
                })
              }
            >
              Exibir: Grupos internos
            </Checkbox>
            <Checkbox
              id="monit-filter:show-past-scheduled"
              value={filters.categories.showSchedules}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  categories: { ...filters.categories, showSchedules: e.target.checked },
                })
              }
            >
              Exibir: Agendamentos
            </Checkbox>
          </ul>
        </section>

        <section className="mb-3 rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-slate-800">
          <h2 className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
            Atendente / Participante
          </h2>
          <div className="flex flex-col gap-2">
            <TextField
              select
              size="small"
              label="Usuário"
              fullWidth
              defaultValue="all"
              value={filters.user}
              onChange={onChangeUser}
            >
              <MenuItem value="all">Todos</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.CODIGO} value={u.CODIGO}>
                  {u.NOME}
                </MenuItem>
              ))}
            </TextField>
            <Checkbox
              id="monit-filter:show-bots"
              value={filters.showBots}
              onChange={onChangeShowBots}
            >
              Exibir bots
            </Checkbox>
          </div>
        </section>

        <section className="mb-3 rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-slate-800">
          <h2 className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
            Período da conversa
          </h2>
          <div className="flex flex-col gap-2">
            <Checkbox
              id="monit-filter:show-ongoing"
              value={filters.showOngoing}
              onChange={onChangeShowOngoing}
            >
              Exibir: Em andamento
            </Checkbox>
            <Checkbox
              id="monit-filter:show-finished"
              value={filters.showFinished}
              onChange={onChangeShowFinished}
            >
              Exibir: Finalizados
            </Checkbox>
            <Checkbox
              id="monit-filter:show-unread-only"
              value={filters.showUnreadOnly}
              onChange={onChangeShowUnreadOnly}
            >
              Apenas: Não lidas
            </Checkbox>
            <Checkbox
              id="monit-filter:show-pending-response-only"
              value={filters.showPendingResponseOnly}
              onChange={onChangeShowPendingResponseOnly}
            >
              Apenas: Sem resposta
            </Checkbox>
            <RangeDateField label="Data de Início" />
            <RangeDateField label="Data de Finalização" />
          </div>
        </section>

        <section className="mb-3 rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-slate-800">
          <h2 className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
            Agendamentos
          </h2>
          <div className="flex flex-col gap-2">
            <Checkbox
              id="monit-filter:show-only-scheduled"
              value={filters.showOnlyScheduled}
              onChange={onChangeShowOnlyScheduled}
            >
              Exibir: Apenas agendados
            </Checkbox>
            <RangeDateField
              label="Agendado no dia"
              onChange={(v) => setFilters({ ...filters, scheduledAt: v })}
            />
            <RangeDateField
              label="Agendado para o dia"
              onChange={(v) => setFilters({ ...filters, scheduledTo: v })}
            />
            {/*           <div className="my-2">
            <TextField
              select
              size="small"
              label="Agendado por"
              fullWidth
              defaultValue="all"
              onChange={onChangeScheduledBy}
            >
              <MenuItem value="all">Qualquer</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.CODIGO} value={u.CODIGO}>
                  {u.NOME}
                </MenuItem>
              ))}
            </TextField>
          </div> */}
            <div className="my-2">
              <TextField
                select
                size="small"
                label="Agendado para"
                fullWidth
                defaultValue="all"
                onChange={onChangeScheduledFor}
              >
                <MenuItem value="all">Qualquer</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.CODIGO} value={u.CODIGO}>
                    {u.NOME}
                  </MenuItem>
                ))}
              </TextField>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
