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
import { useCustomersContext } from "../customers-context";
import { CUSTOMERS_TABLE_COLUMNS } from "./table-config";
import { Customer } from "@in.pulse-crm/sdk";

const textFieldStlye: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    fontSize: "0.875rem",
  },
};

const isKeyOfCustomer = (key: string): key is keyof Customer => {
  const accepted: string[] = [
    "CODIGO",
    "ATIVO",
    "PESSOA",
    "RAZAO",
    "CPF_CNPJ",
    "CIDADE",
    "COD_ERP",
  ];
  return accepted.includes(key);
};

const textFieldClassName = "w-full bg-slate-200 dark:bg-slate-700";

export default function ClientTableHeader() {
  const { dispatch, loadCustomers, state } = useCustomersContext();

  const activeFilters = Object.keys(state.filters).filter((k) => {
    const key = k as keyof typeof state.filters;
    const isPageFilter = key === "page" || key === "perPage";
    const isFilterActive = state.filters[key] && state.filters[key] !== "none";

    return !isPageFilter && isFilterActive;
  });

  const activeFiltersCount = activeFilters.length;

  const onClickSearch = () => loadCustomers();
  const onClearFilters = () => dispatch({ type: "clear-filters" });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onClickSearch();
    }
  };

  const handleChangeFilter = (key: string) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isKeyOfCustomer(key)) return;
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
            width: CUSTOMERS_TABLE_COLUMNS.CODIGO.width,
            minWidth: CUSTOMERS_TABLE_COLUMNS.CODIGO.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.CODIGO.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CUSTOMERS_TABLE_COLUMNS.CODIGO.placeholder}
              value={state.filters.CODIGO || ""}
              onChange={handleChangeFilter("CODIGO")}
              onKeyDown={handleKeyPress}
              className="w-full bg-slate-200 dark:bg-slate-700"
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CUSTOMERS_TABLE_COLUMNS.ATIVO.width,
            minWidth: CUSTOMERS_TABLE_COLUMNS.ATIVO.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.ATIVO.label}
            </label>
            <TextField
              select
              variant="outlined"
              size="small"
              value={state.filters.ATIVO || "{{all}}"}
              onChange={handleChangeFilter("ATIVO")}
              className={textFieldClassName}
              sx={textFieldStlye}
            >
              {CUSTOMERS_TABLE_COLUMNS.ATIVO.options?.map((opt) => (
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
            width: CUSTOMERS_TABLE_COLUMNS.PESSOA.width,
            minWidth: CUSTOMERS_TABLE_COLUMNS.PESSOA.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.PESSOA.label}
            </label>
            <TextField
              select
              variant="outlined"
              size="small"
              value={state.filters.PESSOA || "{{all}}"}
              onChange={handleChangeFilter("PESSOA")}
              className={textFieldClassName}
              sx={textFieldStlye}
            >
              {CUSTOMERS_TABLE_COLUMNS.PESSOA.options?.map((opt) => (
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
            width: CUSTOMERS_TABLE_COLUMNS.RAZAO.width,
            minWidth: CUSTOMERS_TABLE_COLUMNS.RAZAO.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.RAZAO.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CUSTOMERS_TABLE_COLUMNS.RAZAO.placeholder}
              value={state.filters.RAZAO || ""}
              onChange={handleChangeFilter("RAZAO")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CUSTOMERS_TABLE_COLUMNS.CPF_CNPJ.width,
            minWidth: CUSTOMERS_TABLE_COLUMNS.CPF_CNPJ.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.CPF_CNPJ.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CUSTOMERS_TABLE_COLUMNS.CPF_CNPJ.placeholder}
              value={state.filters.CPF_CNPJ || ""}
              onChange={handleChangeFilter("CPF_CNPJ")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CUSTOMERS_TABLE_COLUMNS.CIDADE.width,
            minWidth: CUSTOMERS_TABLE_COLUMNS.CIDADE.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.CIDADE.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CUSTOMERS_TABLE_COLUMNS.CIDADE.placeholder}
              value={state.filters.CIDADE || ""}
              onChange={handleChangeFilter("CIDADE")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CUSTOMERS_TABLE_COLUMNS.COD_ERP.width,
            minWidth: CUSTOMERS_TABLE_COLUMNS.COD_ERP.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.COD_ERP.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CUSTOMERS_TABLE_COLUMNS.COD_ERP.placeholder}
              value={state.filters.COD_ERP || ""}
              onChange={handleChangeFilter("COD_ERP")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CUSTOMERS_TABLE_COLUMNS.ACTIONS.width,
            minWidth: CUSTOMERS_TABLE_COLUMNS.ACTIONS.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.ACTIONS.label}
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
