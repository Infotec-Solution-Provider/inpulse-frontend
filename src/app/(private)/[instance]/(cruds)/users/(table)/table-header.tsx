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
import { useState } from "react";
import { useUsersContext } from "../users-context";
import { USERS_TABLE_COLUMNS } from "./table-config";

const textFieldStlye: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    fontSize: "0.875rem",
  },
};

const textFieldClassName = "w-full bg-slate-200 dark:bg-slate-700";

export default function UsersTableHeader() {
  const { dispatch, loadUsers, state, sectors } = useUsersContext();
  const [filters, setFilters] = useState<Record<string, string>>(state.filters || {});
  const activeFiltersCount = Object.keys(filters).filter(
    (key) => key !== "page" && key !== "perPage" && filters[key] && filters[key] !== "none",
  ).length;

  const onChangeFilter = (key: string, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value === "" || value === "none") {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
  };

  const onClickSearch = () => {
    dispatch({ type: "change-filters", filters });
    loadUsers();
  };

  const onClearFilters = () => {
    setFilters({});
    dispatch({ type: "change-filters", filters: {} });
    loadUsers();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onClickSearch();
    }
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
              value={filters.CODIGO || ""}
              onChange={(e) => onChangeFilter("CODIGO", e.target.value)}
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
              value={filters.NOME || ""}
              onChange={(e) => onChangeFilter("NOME", e.target.value)}
              onKeyPress={handleKeyPress}
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
              value={filters.LOGIN || ""}
              onChange={(e) => onChangeFilter("LOGIN", e.target.value)}
              onKeyPress={handleKeyPress}
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
              value={filters.EMAIL || ""}
              onChange={(e) => onChangeFilter("EMAIL", e.target.value)}
              onKeyPress={handleKeyPress}
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
              value={filters.NIVEL || ""}
              onChange={(e) => onChangeFilter("NIVEL", e.target.value)}
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
              value={filters.SETOR || ""}
              onChange={(e) => onChangeFilter("SETOR", e.target.value)}
              className={textFieldClassName}
              sx={textFieldStlye}
            >
              <MenuItem value="">Todos</MenuItem>
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
