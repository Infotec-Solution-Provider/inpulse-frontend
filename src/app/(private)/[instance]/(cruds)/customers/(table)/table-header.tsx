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
        <TableCell className="px-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Código
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Ex: 123"
              value={filters.CODIGO || ""}
              onChange={(e) => onChangeFilter("CODIGO", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-20 bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            />
          </div>
        </TableCell>
        <TableCell className="px-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Ativo
            </label>
            <TextField
              select
              variant="outlined"
              size="small"
              value={filters.ATIVO || ""}
              onChange={(e) => onChangeFilter("ATIVO", e.target.value)}
              className="w-24 bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            >
              <MenuItem value="">Ambos</MenuItem>
              <MenuItem value="SIM">Sim</MenuItem>
              <MenuItem value="NAO">Não</MenuItem>
            </TextField>
          </div>
        </TableCell>
        <TableCell className="px-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Tipo
            </label>
            <TextField
              select
              variant="outlined"
              size="small"
              value={filters.PESSOA || ""}
              onChange={(e) => onChangeFilter("PESSOA", e.target.value)}
              className="w-28 bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            >
              <MenuItem value="">Ambos</MenuItem>
              <MenuItem value="JUR">Jurídica</MenuItem>
              <MenuItem value="FIS">Física</MenuItem>
            </TextField>
          </div>
        </TableCell>
        <TableCell className="px-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Razão Social
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Nome da empresa..."
              value={filters.RAZAO || ""}
              onChange={(e) => onChangeFilter("RAZAO", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-48 bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            />
          </div>
        </TableCell>
        <TableCell className="px-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              CPF/CNPJ
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder="000.000.000-00"
              value={filters.CPF_CNPJ || ""}
              onChange={(e) => onChangeFilter("CPF_CNPJ", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-36 bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            />
          </div>
        </TableCell>
        <TableCell className="px-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Cidade
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Ex: São Paulo"
              value={filters.CIDADE || ""}
              onChange={(e) => onChangeFilter("CIDADE", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-32 bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            />
          </div>
        </TableCell>
        <TableCell className="px-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Cód. ERP
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Código..."
              value={filters.COD_ERP || ""}
              onChange={(e) => onChangeFilter("COD_ERP", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-28 bg-white dark:bg-slate-700"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.875rem",
                },
              }}
            />
          </div>
        </TableCell>
        <TableCell className="px-3" sx={{ width: "180px", minWidth: "180px" }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Ações
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
