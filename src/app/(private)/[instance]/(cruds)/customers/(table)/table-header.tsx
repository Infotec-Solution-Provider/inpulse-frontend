import { FilterAlt, FilterAltOff, Search } from "@mui/icons-material";
import formatCpfCnpj from "@/lib/utils/format-cnpj";
import {
  Chip,
  IconButton,
  MenuItem,
  Popover,
  SxProps,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Theme,
  Tooltip,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useCustomersContext } from "../customers-context";
import { CUSTOMERS_TABLE_COLUMNS } from "./table-config";
import {
  CustomerAgeLevel,
  CustomerInteractionLevel,
  CustomerPurchaseInterestLevel,
  CustomerProfileSummaryLevel,
  CustomerPurchaseLevel,
} from "@/lib/types/customer-profile-summary";
import { CustomerListFilterKey } from "./customers-reducer";

const PROFILE_LEVEL_OPTIONS: Array<{ value: CustomerProfileSummaryLevel | "{{all}}"; label: string }> = [
  { value: "{{all}}", label: "Todos os perfis" },
  { value: "potencial_de_compra", label: "Potencial de compra" },
  { value: "consolidado", label: "Consolidado" },
  { value: "precisa_mais_interacao", label: "Precisa mais interação" },
  { value: "em_observacao", label: "Em observação" },
];

const INTERACTION_LEVEL_OPTIONS: Array<{ value: CustomerInteractionLevel | "{{all}}"; label: string }> = [
  { value: "{{all}}", label: "Toda interação" },
  { value: "sem_interacao", label: "Sem interação" },
  { value: "pouca_interacao", label: "Pouca interação" },
  { value: "interacao_media", label: "Interação média" },
  { value: "interacao_alta", label: "Interação alta" },
];

const PURCHASE_LEVEL_OPTIONS: Array<{ value: CustomerPurchaseLevel | "{{all}}"; label: string }> = [
  { value: "{{all}}", label: "Toda compra" },
  { value: "sem_compras", label: "Sem compras" },
  { value: "poucas_compras", label: "Poucas compras" },
  { value: "compras_medias", label: "Compras médias" },
  { value: "muitas_compras", label: "Muitas compras" },
];

const AGE_LEVEL_OPTIONS: Array<{ value: CustomerAgeLevel | "{{all}}"; label: string }> = [
  { value: "{{all}}", label: "Toda idade" },
  { value: "sem_data_cadastro", label: "Sem data cadastro" },
  { value: "cliente_novo", label: "Cliente novo" },
  { value: "ate_6_meses", label: "Até 6 meses" },
  { value: "ate_12_meses", label: "Até 12 meses" },
  { value: "mais_de_12_meses", label: "Mais de 12 meses" },
];

const PURCHASE_INTEREST_OPTIONS: Array<{ value: CustomerPurchaseInterestLevel | "{{all}}"; label: string }> = [
  { value: "{{all}}", label: "Todo interesse" },
  { value: "nao_analisado", label: "Não analisado pela IA" },
  { value: "baixo_interesse", label: "Baixo interesse" },
  { value: "interesse_moderado", label: "Interesse moderado" },
  { value: "alto_interesse", label: "Alto interesse" },
  { value: "pronto_para_compra", label: "Pronto para compra" },
];

const textFieldStlye: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    fontSize: "0.875rem",
  },
};

const textFieldClassName = "w-full bg-slate-200 dark:bg-slate-700";

export default function ClientTableHeader() {
  const { dispatch, loadCustomers, state } = useCustomersContext();
  const [profileFiltersAnchor, setProfileFiltersAnchor] = useState<HTMLButtonElement | null>(null);

  const activeFilters = Object.keys(state.filters).filter((k) => {
    const key = k as keyof typeof state.filters;
    const isPageFilter = key === "page" || key === "perPage";
    const isFilterActive = state.filters[key] && state.filters[key] !== "none";

    return !isPageFilter && isFilterActive;
  });

  const activeFiltersCount = activeFilters.length;
  const activeProfileFiltersCount = useMemo(() => {
    return [
      state.filters.profileLevel,
      state.filters.interactionLevel,
      state.filters.purchaseLevel,
      state.filters.ageLevel,
      state.filters.purchaseInterestLevel,
    ].filter(Boolean).length;
  }, [
    state.filters.ageLevel,
    state.filters.interactionLevel,
    state.filters.profileLevel,
    state.filters.purchaseLevel,
    state.filters.purchaseInterestLevel,
  ]);

  const onClickSearch = () => loadCustomers();
  const onClearFilters = () => dispatch({ type: "clear-filters" });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onClickSearch();
    }
  };

  const handleChangeFilter = (key: CustomerListFilterKey) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value || null;
      const value =
        key === "CPF_CNPJ" && typeof rawValue === "string"
          ? rawValue.replace(/\D/g, "").slice(0, 14)
          : rawValue;

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
              value={formatCpfCnpj(state.filters.CPF_CNPJ || "")}
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
            minWidth: CUSTOMERS_TABLE_COLUMNS.TAGS.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.TAGS.label}
            </label>
            <div className="flex min-h-[40px] items-center gap-2">
              <Tooltip title="Filtros de perfil" arrow>
                <IconButton
                  onClick={(event) => setProfileFiltersAnchor(event.currentTarget)}
                  size="small"
                  color={activeProfileFiltersCount > 0 ? "primary" : "default"}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  <FilterAlt fontSize="small" />
                </IconButton>
              </Tooltip>
              {activeProfileFiltersCount > 0 ? (
                <Chip label={`${activeProfileFiltersCount} ativos`} size="small" color="primary" />
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400">Sem filtros de perfil</span>
              )}
            </div>
            <Popover
              open={!!profileFiltersAnchor}
              anchorEl={profileFiltersAnchor}
              onClose={() => setProfileFiltersAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
            >
              <div className="grid w-[22rem] gap-3 p-4">
                <TextField
                  select
                  size="small"
                  label="Perfil geral"
                  value={state.filters.profileLevel || "{{all}}"}
                  onChange={handleChangeFilter("profileLevel")}
                >
                  {PROFILE_LEVEL_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Interação"
                  value={state.filters.interactionLevel || "{{all}}"}
                  onChange={handleChangeFilter("interactionLevel")}
                >
                  {INTERACTION_LEVEL_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Compras"
                  value={state.filters.purchaseLevel || "{{all}}"}
                  onChange={handleChangeFilter("purchaseLevel")}
                >
                  {PURCHASE_LEVEL_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Idade do cliente"
                  value={state.filters.ageLevel || "{{all}}"}
                  onChange={handleChangeFilter("ageLevel")}
                >
                  {AGE_LEVEL_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Interesse de compra (IA)"
                  value={state.filters.purchaseInterestLevel || "{{all}}"}
                  onChange={handleChangeFilter("purchaseInterestLevel")}
                >
                  {PURCHASE_INTEREST_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            </Popover>
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
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
