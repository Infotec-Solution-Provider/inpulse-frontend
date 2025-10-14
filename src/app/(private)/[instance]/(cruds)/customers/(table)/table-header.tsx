import {
  MenuItem,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import { Search, FilterAltOff, FilterAlt } from "@mui/icons-material";
import { Customer } from "@in.pulse-crm/sdk";
import { useState, useEffect } from "react";
import { useCustomersContext } from "../customers-context";
import { CUSTOMERS_TABLE_COLUMNS } from "./table-config";

export default function ClientTableHeader() {
  const { dispatch, loadCustomers, state } = useCustomersContext();
  const [filters, setFilters] = useState<Record<string, string>>(state.filters || {});
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  useEffect(() => {
    const activeCount = Object.keys(filters).filter(
      (key) => filters[key] && filters[key] !== "none",
    ).length;
    setHasActiveFilters(activeCount > 0);
  }, [filters]);

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
    loadCustomers(filters);
  };

  const onClearFilters = () => {
    console.log("🧹 [onClearFilters] Clearing filters");
    setFilters({});
    dispatch({ type: "change-filters", filters: {} });
    loadCustomers({});
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onClickSearch();
    }
  };

  return (
    <TableHead>
      <TableRow
        className="bg-slate-50 dark:bg-slate-600"
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
        <TableCell className="px-3" sx={{ width: CUSTOMERS_TABLE_COLUMNS.CODIGO.width, minWidth: CUSTOMERS_TABLE_COLUMNS.CODIGO.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.CODIGO.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CUSTOMERS_TABLE_COLUMNS.CODIGO.placeholder}
              value={filters.CODIGO || ""}
              onChange={(e) => onChangeFilter("CODIGO", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            />
          </div>
        </TableCell>
        <TableCell className="px-3" sx={{ width: CUSTOMERS_TABLE_COLUMNS.ATIVO.width, minWidth: CUSTOMERS_TABLE_COLUMNS.ATIVO.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.ATIVO.label}
            </label>
            <TextField
              select
              variant="outlined"
              size="small"
              value={filters.ATIVO || ""}
              onChange={(e) => onChangeFilter("ATIVO", e.target.value)}
              className="w-full bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            >
              {CUSTOMERS_TABLE_COLUMNS.ATIVO.options?.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </TableCell>
        <TableCell className="px-3" sx={{ width: CUSTOMERS_TABLE_COLUMNS.PESSOA.width, minWidth: CUSTOMERS_TABLE_COLUMNS.PESSOA.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.PESSOA.label}
            </label>
            <TextField
              select
              variant="outlined"
              size="small"
              value={filters.PESSOA || ""}
              onChange={(e) => onChangeFilter("PESSOA", e.target.value)}
              className="w-full bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            >
              {CUSTOMERS_TABLE_COLUMNS.PESSOA.options?.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </TableCell>
        <TableCell className="px-3" sx={{ width: CUSTOMERS_TABLE_COLUMNS.RAZAO.width, minWidth: CUSTOMERS_TABLE_COLUMNS.RAZAO.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.RAZAO.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CUSTOMERS_TABLE_COLUMNS.RAZAO.placeholder}
              value={filters.RAZAO || ""}
              onChange={(e) => onChangeFilter("RAZAO", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            />
          </div>
        </TableCell>
        <TableCell className="px-3" sx={{ width: CUSTOMERS_TABLE_COLUMNS.CPF_CNPJ.width, minWidth: CUSTOMERS_TABLE_COLUMNS.CPF_CNPJ.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.CPF_CNPJ.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CUSTOMERS_TABLE_COLUMNS.CPF_CNPJ.placeholder}
              value={filters.CPF_CNPJ || ""}
              onChange={(e) => onChangeFilter("CPF_CNPJ", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            />
          </div>
        </TableCell>
        <TableCell className="px-3" sx={{ width: CUSTOMERS_TABLE_COLUMNS.CIDADE.width, minWidth: CUSTOMERS_TABLE_COLUMNS.CIDADE.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.CIDADE.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CUSTOMERS_TABLE_COLUMNS.CIDADE.placeholder}
              value={filters.CIDADE || ""}
              onChange={(e) => onChangeFilter("CIDADE", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            />
          </div>
        </TableCell>
        <TableCell className="px-3" sx={{ width: CUSTOMERS_TABLE_COLUMNS.COD_ERP.width, minWidth: CUSTOMERS_TABLE_COLUMNS.COD_ERP.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.COD_ERP.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CUSTOMERS_TABLE_COLUMNS.COD_ERP.placeholder}
              value={filters.COD_ERP || ""}
              onChange={(e) => onChangeFilter("COD_ERP", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            />
          </div>
        </TableCell>
        <TableCell className="px-3" sx={{ width: CUSTOMERS_TABLE_COLUMNS.ACTIONS.width, minWidth: CUSTOMERS_TABLE_COLUMNS.ACTIONS.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.ACTIONS.label}
            </label>
            <div className="flex min-h-[40px] items-center gap-1">
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
              {hasActiveFilters ? (
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
                    label={
                      Object.keys(filters).filter((k) => filters[k] && filters[k] !== "none").length
                    }
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
