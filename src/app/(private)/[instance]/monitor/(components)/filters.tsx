import Checkbox from "@/lib/components/checkbox";
import RangeDateField from "@/lib/components/range-date-field";
import { InputAdornment, MenuItem, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import useMonitorContext from "../context";
import useInternalChatContext from "../../internal-context";

export default function MonitorFilters() {
  const { filters, setFilters, resetFilters } = useMonitorContext();
  const { users } = useInternalChatContext();

  const onChangeUser = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Selected user:", e.target.value);
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
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon className="text-slate-500" />
                  </InputAdornment>
                ),
              },
            }}
          />
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
          <Checkbox id="monit-filter:show-ongoing" value={filters.showOngoing} onChange={onChangeShowOngoing}>Exibir: Em andamento</Checkbox>
          <Checkbox id="monit-filter:show-finished" value={filters.showFinished} onChange={onChangeShowFinished}>Exibir: Finalizados</Checkbox>
          <RangeDateField label="Data de Início" />
          <RangeDateField label="Data de Finalização" />
        </div>
      </section>
      <section className="py-2">
        <h2 className="text-md font-semibold">Agendamentos</h2>
        <div className="flex flex-col gap-2 py-2 pl-2">
          <Checkbox id="monit-filter:show-past-scheduled">Exibir: Apenas agendados</Checkbox>
          <RangeDateField label="Agendado no dia" />
          <RangeDateField label="Agendado para o dia" />
          <div className="my-2">
            <TextField select size="small" label="Agendado por" fullWidth defaultValue="all">
              <MenuItem value="all">Qualquer</MenuItem>
              <MenuItem value="user1">Usuário 1</MenuItem>
              <MenuItem value="user2">Usuário 2</MenuItem>
              <MenuItem value="user3">Usuário 3</MenuItem>
            </TextField>
          </div>
          <TextField select size="small" label="Agendado para" fullWidth defaultValue="all">
            <MenuItem value="all">Qualquer</MenuItem>
            <MenuItem value="user1">Usuário 1</MenuItem>
            <MenuItem value="user2">Usuário 2</MenuItem>
            <MenuItem value="user3">Usuário 3</MenuItem>
          </TextField>
        </div>
      </section>
    </aside>
  );
}
