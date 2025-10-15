import { FilterAltOff, Search } from "@mui/icons-material";
import {
  Chip,
  IconButton,
  MenuItem,
  SxProps,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Theme,
  Tooltip,
} from "@mui/material";
import { ReadyMessage } from "@in.pulse-crm/sdk";
import { useReadyMessagesContext } from "../ready-messages-context";
import { READY_MESSAGES_TABLE_COLUMNS } from "./table-config";

const textFieldStyle: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    fontSize: "0.875rem",
  },
};

const isKeyOfReadyMessage = (key: string): key is keyof ReadyMessage => {
  const accepted: string[] = ["CODIGO", "TITULO", "TEXTO_MENSAGEM", "SETOR"];
  return accepted.includes(key);
};

const textFieldClassName = "w-full bg-slate-200 dark:bg-slate-700";

export default function ReadyMessagesTableHeader() {
  const { state, dispatch, loadReadyMessages, sectors } = useReadyMessagesContext();

  const activeFilters = Object.keys(state.filters).filter((k) => {
    const key = k as keyof typeof state.filters;
    const isPageFilter = key === "page" || key === "perPage";
    const isFilterActive = state.filters[key] && state.filters[key] !== "none";

    return !isPageFilter && isFilterActive;
  });

  const activeFiltersCount = activeFilters.length;

  const onClickSearch = () => loadReadyMessages();
  const onClearFilters = () => dispatch({ type: "clear-filters" });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onClickSearch();
    }
  };

  const handleChangeFilter = (key: string) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isKeyOfReadyMessage(key)) return;
      const value = event.target.value || null;
      if (value === null || value === "{{all}}") {
        dispatch({ type: "remove-filter", key });
      } else {
        dispatch({ type: "change-filter", key, value });
      }
    };
  };

  return (
    <TableHead>
      <TableRow
        className="bg-slate-200 dark:bg-slate-800"
        sx={{
          "& .MuiTableCell-root": {
            borderBottom: "2px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgb(71 85 105)" : "rgb(226 232 240)",
            fontWeight: 600,
            fontSize: "0.875rem",
            color: (theme) => theme.palette.text.primary,
            paddingTop: "1rem",
            paddingBottom: "1rem",
          },
        }}
      >
        <TableCell
          className="px-3"
          sx={{
            width: READY_MESSAGES_TABLE_COLUMNS.CODIGO.width,
            minWidth: READY_MESSAGES_TABLE_COLUMNS.CODIGO.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {READY_MESSAGES_TABLE_COLUMNS.CODIGO.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={READY_MESSAGES_TABLE_COLUMNS.CODIGO.placeholder}
              value={state.filters.id || ""}
              onChange={handleChangeFilter("id")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStyle}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: READY_MESSAGES_TABLE_COLUMNS.TITULO.width,
            minWidth: READY_MESSAGES_TABLE_COLUMNS.TITULO.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {READY_MESSAGES_TABLE_COLUMNS.TITULO.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={READY_MESSAGES_TABLE_COLUMNS.TITULO.placeholder}
              value={state.filters.title || ""}
              onChange={handleChangeFilter("title")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStyle}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: READY_MESSAGES_TABLE_COLUMNS.TEXTO_MENSAGEM.width,
            minWidth: READY_MESSAGES_TABLE_COLUMNS.TEXTO_MENSAGEM.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {READY_MESSAGES_TABLE_COLUMNS.TEXTO_MENSAGEM.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Buscar por mensagem..."
              value={state.filters.message || ""}
              onChange={handleChangeFilter("message")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStyle}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: READY_MESSAGES_TABLE_COLUMNS.SETOR.width,
            minWidth: READY_MESSAGES_TABLE_COLUMNS.SETOR.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {READY_MESSAGES_TABLE_COLUMNS.SETOR.label}
            </label>
            <TextField
              select
              variant="outlined"
              size="small"
              value={state.filters.sectorId || "{{all}}"}
              onChange={handleChangeFilter("sectorId")}
              className={textFieldClassName}
              sx={textFieldStyle}
            >
              <MenuItem value="{{all}}">Todos</MenuItem>
              {sectors?.map((sector) => (
                <MenuItem key={sector.id} value={sector.id}>
                  {sector.name}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: READY_MESSAGES_TABLE_COLUMNS.ARQUIVO.width,
            minWidth: READY_MESSAGES_TABLE_COLUMNS.ARQUIVO.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {READY_MESSAGES_TABLE_COLUMNS.ARQUIVO.label}
            </label>
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: READY_MESSAGES_TABLE_COLUMNS.LAST_UPDATE.width,
            minWidth: READY_MESSAGES_TABLE_COLUMNS.LAST_UPDATE.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {READY_MESSAGES_TABLE_COLUMNS.LAST_UPDATE.label}
            </label>
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: READY_MESSAGES_TABLE_COLUMNS.ACTIONS.width,
            minWidth: READY_MESSAGES_TABLE_COLUMNS.ACTIONS.width,
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <Tooltip title={`${activeFiltersCount} filtro(s) ativo(s)`}>
              <Chip
                label={activeFiltersCount}
                size="small"
                color={activeFiltersCount > 0 ? "primary" : "default"}
                className="min-w-[2rem]"
              />
            </Tooltip>
            <Tooltip title="Buscar">
              <IconButton
                onClick={onClickSearch}
                size="small"
                className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
              >
                <Search fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Limpar filtros">
              <IconButton
                onClick={onClearFilters}
                size="small"
                disabled={activeFiltersCount === 0}
                className="text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-950/30"
              >
                <FilterAltOff fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>
    </TableHead>
  );
}
