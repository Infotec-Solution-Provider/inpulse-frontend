import Checkbox from "@/lib/components/checkbox";
import RangeDateField from "@/lib/components/range-date-field";
import SearchIcon from "@mui/icons-material/Search";
import {
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
} from "@mui/material";
import { useState } from "react";
import useInternalChatContext from "../../internal-context";
import useMonitorContext from "../context";

export default function MonitorFilters() {
  const { filters, setFilters, resetFilters } = useMonitorContext();
  const { users } = useInternalChatContext();

  const [text, setText] = useState<string>("");

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

  const onChangeScheduledFor = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      scheduledFor: e.target.value === "all" ? "all" : Number(e.target.value),
    });
  };

  const onClickSearch = () => {
    setFilters({
      ...filters,
      searchText: text,
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
    <aside className="scrollbar-whatsapp w-full overflow-y-auto rounded-md bg-slate-200 px-4 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200 md:w-96">
      <header className="flex items-center justify-between py-2">
        <h1 className="text-lg font-semibold">Filtros</h1>
        <button className="text-sm text-blue-500 hover:underline" onClick={resetFilters}>
          Limpar Filtros
        </button>
      </header>
      <section className="flex flex-col gap-2 border-b border-slate-600 py-2 dark:border-slate-400">
        <h2 className="text-md font-semibold">Pesquisar</h2>
        <div className="flex items-center gap-2">
          <TextField
            placeholder="Digite o texto da pesquisa"
            fullWidth
            size="small"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <IconButton onClick={onClickSearch}>
            <SearchIcon />
          </IconButton>
        </div>
        <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
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
      <section className="border-b border-slate-600 py-2 dark:border-slate-400">
        <h2 className="text-md mb-2 font-semibold">Categorias</h2>
        <ul className="flex flex-col gap-2 pl-2">
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
      <section className="border-b border-slate-600 py-2 dark:border-slate-400">
        <h2 className="text-md mb-4 font-semibold">Atendente / Participante</h2>
        <div className="flex flex-col gap-2 pl-2">
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
      <section className="border-b border-slate-600 py-2 dark:border-slate-400">
        <h2 className="text-md font-semibold">Período da conversa</h2>
        <div className="flex flex-col gap-2 py-2 pl-2">
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
          <RangeDateField label="Data de Início" />
          <RangeDateField label="Data de Finalização" />
        </div>
      </section>
      <section className="py-2">
        <h2 className="text-md font-semibold">Agendamentos</h2>
        <div className="flex flex-col gap-2 py-2 pl-2">
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
    </aside>
  );
}
