import { FilterAlt, FilterAltOff, Search } from "@mui/icons-material";
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
import { useUsersContext } from "../users-context";
import { USERS_TABLE_COLUMNS } from "./table-config";
import { User } from "@in.pulse-crm/sdk";

const textFieldStlye: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    fontSize: "0.875rem",
  },
};

const isKeyOfUser = (key: string): key is keyof User => {
  const accepted: string[] = ["CODIGO", "NOME", "LOGIN", "EMAIL", "NIVEL", "SETOR"];
  return accepted.includes(key);
};

const textFieldClassName = "w-full bg-slate-200 dark:bg-slate-700";

export default function UsersTableHeader() {
  const { dispatch, loadUsers, state, sectors } = useUsersContext();

  const activeFilters = Object.keys(state.filters).filter((k) => {
    const key = k as keyof typeof state.filters;
    const isPageFilter = key === "page" || key === "perPage";
    const isFilterActive = state.filters[key] && state.filters[key] !== "none";

    return !isPageFilter && isFilterActive;
  });

  const activeFiltersCount = activeFilters.length;

  const onClickSearch = () => loadUsers();
  const onClearFilters = () => dispatch({ type: "clear-filters" });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onClickSearch();
    }
  };

  const handleChangeFilter = (key: string) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isKeyOfUser(key)) return;
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
            width: USERS_TABLE_COLUMNS.CODIGO.width,
            minWidth: USERS_TABLE_COLUMNS.CODIGO.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {USERS_TABLE_COLUMNS.CODIGO.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={USERS_TABLE_COLUMNS.CODIGO.placeholder}
              value={state.filters.CODIGO || ""}
              onChange={handleChangeFilter("CODIGO")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: USERS_TABLE_COLUMNS.NOME.width,
            minWidth: USERS_TABLE_COLUMNS.NOME.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {USERS_TABLE_COLUMNS.NOME.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={USERS_TABLE_COLUMNS.NOME.placeholder}
              value={state.filters.NOME || ""}
              onChange={handleChangeFilter("NOME")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: USERS_TABLE_COLUMNS.LOGIN.width,
            minWidth: USERS_TABLE_COLUMNS.LOGIN.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {USERS_TABLE_COLUMNS.LOGIN.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={USERS_TABLE_COLUMNS.LOGIN.placeholder}
              value={state.filters.LOGIN || ""}
              onChange={handleChangeFilter("LOGIN")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: USERS_TABLE_COLUMNS.EMAIL.width,
            minWidth: USERS_TABLE_COLUMNS.EMAIL.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {USERS_TABLE_COLUMNS.EMAIL.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={USERS_TABLE_COLUMNS.EMAIL.placeholder}
              value={state.filters.EMAIL || ""}
              onChange={handleChangeFilter("EMAIL")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: USERS_TABLE_COLUMNS.NIVEL.width,
            minWidth: USERS_TABLE_COLUMNS.NIVEL.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {USERS_TABLE_COLUMNS.NIVEL.label}
            </label>
            <TextField
              select
              variant="outlined"
              size="small"
              value={state.filters.NIVEL || "{{all}}"}
              onChange={handleChangeFilter("NIVEL")}
              className={textFieldClassName}
              sx={textFieldStlye}
            >
              {USERS_TABLE_COLUMNS.NIVEL.options?.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: USERS_TABLE_COLUMNS.SETOR.width,
            minWidth: USERS_TABLE_COLUMNS.SETOR.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {USERS_TABLE_COLUMNS.SETOR.label}
            </label>
            <TextField
              select
              variant="outlined"
              size="small"
              value={state.filters.SETOR || "{{all}}"}
              onChange={handleChangeFilter("SETOR")}
              className={textFieldClassName}
              sx={textFieldStlye}
            >
              <MenuItem value="{{all}}">Todos</MenuItem>
              {sectors.map((sector: { id: number; name: string }) => (
                <MenuItem key={sector.id} value={sector.id.toString()}>
                  {sector.name}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: USERS_TABLE_COLUMNS.ACTIONS.width,
            minWidth: USERS_TABLE_COLUMNS.ACTIONS.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {USERS_TABLE_COLUMNS.ACTIONS.label}
            </label>
            <div className="flex min-h-[40px] w-32 items-center gap-1">
              <Tooltip title="Pesquisar" arrow>
                <IconButton
                  onClick={onClickSearch}
                  size="small"
                  color="primary"
                  className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                >
                  <Search fontSize="small" />
                </IconButton>
              </Tooltip>
              {activeFiltersCount > 0 ? (
                <>
                  <Tooltip title="Limpar filtros" arrow>
                    <IconButton
                      onClick={onClearFilters}
                      size="small"
                      color="error"
                      className="bg-red-500 text-white hover:bg-red-600 dark:bg-red-800 dark:hover:bg-red-700"
                    >
                      <FilterAltOff fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Chip
                    icon={<FilterAlt fontSize="small" />}
                    label={activeFiltersCount}
                    size="small"
                    color="primary"
                  />
                </>
              ) : (
                <div className="w-[88px]" />
              )}
            </div>
          </div>
        </TableCell>
      </TableRow>
    </TableHead>
  );
}
