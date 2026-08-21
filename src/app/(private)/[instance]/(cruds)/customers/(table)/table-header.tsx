import { FilterAlt, FilterAltOff, Search } from "@mui/icons-material";
import CustomerBusinessFiltersPanel from "@/lib/components/customer-business-filters";
import useCustomerBusinessFilterOptions from "@/lib/hooks/use-customer-business-filter-options";
import {
  countCustomerBusinessFilters,
  createEmptyCustomerBusinessFilters,
  serializeCustomerBusinessFilters,
  type CustomerPurchaseStatus,
} from "@/lib/types/customer-business-filters";
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
import type { ChangeCustomersStateAction, CustomerListFilterKey } from "./customers-reducer";

const BUSINESS_FILTER_KEYS = [
  "purchaseStatus",
  "purchaseFrom",
  "purchaseTo",
  "campaignIds",
  "segmentIds",
  "registeredFrom",
  "registeredTo",
  "loyaltyOperatorIds",
] as const;

const textFieldStyle: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": { fontSize: "0.875rem" },
};

const textFieldClassName = "w-full bg-slate-200 dark:bg-slate-700";

function parseIds(value?: string) {
  if (!value) return [];
  return value
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
}

export default function ClientTableHeader() {
  const { dispatch, loadCustomers, state } = useCustomersContext();
  const { options, loading: loadingOptions } = useCustomerBusinessFilterOptions();
  const [businessFiltersAnchor, setBusinessFiltersAnchor] = useState<HTMLButtonElement | null>(
    null,
  );

  const businessFilters = useMemo(() => {
    const purchaseStatus = state.filters.purchaseStatus;
    return {
      ...createEmptyCustomerBusinessFilters(),
      purchaseStatus:
        purchaseStatus === "with_purchases" || purchaseStatus === "without_purchases"
          ? (purchaseStatus as CustomerPurchaseStatus)
          : "",
      purchaseFrom: state.filters.purchaseFrom ?? "",
      purchaseTo: state.filters.purchaseTo ?? "",
      campaignIds: parseIds(state.filters.campaignIds),
      segmentIds: parseIds(state.filters.segmentIds),
      registeredFrom: state.filters.registeredFrom ?? "",
      registeredTo: state.filters.registeredTo ?? "",
      loyaltyOperatorIds: parseIds(state.filters.loyaltyOperatorIds),
    };
  }, [state.filters]);

  const activeBusinessFiltersCount = countCustomerBusinessFilters(businessFilters);
  const activeFiltersCount = Object.keys(state.filters).filter((key) => {
    return (
      key !== "page" && key !== "perPage" && Boolean(state.filters[key as CustomerListFilterKey])
    );
  }).length;

  const handleChangeFilter = (key: CustomerListFilterKey) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value || null;
      const value =
        key === "CPF_CNPJ" && typeof rawValue === "string"
          ? rawValue.replace(/\D/g, "").slice(0, 14)
          : rawValue;

      dispatch(
        value === null || value === "{{all}}"
          ? { type: "remove-filter", key }
          : { type: "change-filter", key, value },
      );
    };
  };

  const handleBusinessFiltersChange = (nextFilters: typeof businessFilters) => {
    const serialized = serializeCustomerBusinessFilters(nextFilters);
    const actions: ChangeCustomersStateAction[] = BUSINESS_FILTER_KEYS.map((key) => {
      const value = serialized[key];
      return value ? { type: "change-filter", key, value } : { type: "remove-filter", key };
    });
    dispatch({ type: "multiple", actions });
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") loadCustomers();
  };

  const renderTextFilter = (
    key: "CODIGO" | "RAZAO" | "CPF_CNPJ" | "CIDADE" | "COD_ERP",
    value: string,
  ) => (
    <TextField
      variant="outlined"
      size="small"
      placeholder={CUSTOMERS_TABLE_COLUMNS[key].placeholder}
      value={key === "CPF_CNPJ" ? formatCpfCnpj(value) : value}
      onChange={handleChangeFilter(key)}
      onKeyDown={handleKeyPress}
      className={textFieldClassName}
      sx={textFieldStyle}
    />
  );

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
        <TableCell className="px-3" sx={{ minWidth: CUSTOMERS_TABLE_COLUMNS.CODIGO.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.CODIGO.label}
            </label>
            {renderTextFilter("CODIGO", state.filters.CODIGO || "")}
          </div>
        </TableCell>

        <TableCell className="px-3" sx={{ minWidth: CUSTOMERS_TABLE_COLUMNS.ATIVO.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.ATIVO.label}
            </label>
            <TextField
              select
              size="small"
              value={state.filters.ATIVO || "{{all}}"}
              onChange={handleChangeFilter("ATIVO")}
              className={textFieldClassName}
              sx={textFieldStyle}
            >
              {CUSTOMERS_TABLE_COLUMNS.ATIVO.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </TableCell>

        <TableCell className="px-3" sx={{ minWidth: CUSTOMERS_TABLE_COLUMNS.PESSOA.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.PESSOA.label}
            </label>
            <TextField
              select
              size="small"
              value={state.filters.PESSOA || "{{all}}"}
              onChange={handleChangeFilter("PESSOA")}
              className={textFieldClassName}
              sx={textFieldStyle}
            >
              {CUSTOMERS_TABLE_COLUMNS.PESSOA.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </TableCell>

        {(["RAZAO", "CPF_CNPJ", "CIDADE", "COD_ERP"] as const).map((key) => (
          <TableCell
            key={key}
            className="px-3"
            sx={{ minWidth: CUSTOMERS_TABLE_COLUMNS[key].width }}
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                {CUSTOMERS_TABLE_COLUMNS[key].label}
              </label>
              {renderTextFilter(key, state.filters[key] || "")}
            </div>
          </TableCell>
        ))}

        <TableCell className="px-3" sx={{ minWidth: CUSTOMERS_TABLE_COLUMNS.ACTIONS.width }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CUSTOMERS_TABLE_COLUMNS.ACTIONS.label}
            </label>
            <div className="flex min-h-[40px] items-center gap-1">
              <Tooltip title="Filtros de CRM" arrow>
                <IconButton
                  onClick={(event) => setBusinessFiltersAnchor(event.currentTarget)}
                  size="small"
                  color={activeBusinessFiltersCount ? "primary" : "default"}
                >
                  <FilterAlt fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Pesquisar" arrow>
                <IconButton onClick={loadCustomers} size="small" color="primary">
                  <Search fontSize="small" />
                </IconButton>
              </Tooltip>
              {activeFiltersCount > 0 && (
                <Tooltip title="Limpar filtros" arrow>
                  <IconButton
                    onClick={() => dispatch({ type: "clear-filters" })}
                    size="small"
                    color="error"
                  >
                    <FilterAltOff fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {activeFiltersCount > 0 && (
                <Chip label={activeFiltersCount} size="small" color="primary" />
              )}
            </div>
          </div>

          <Popover
            open={Boolean(businessFiltersAnchor)}
            anchorEl={businessFiltersAnchor}
            onClose={() => setBusinessFiltersAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: { sx: { mt: 1, width: 680, maxWidth: "calc(100vw - 24px)", p: 2 } },
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Filtros de CRM</p>
                <p className="text-xs text-slate-500">
                  Os filtros selecionados são aplicados simultaneamente.
                </p>
              </div>
              {loadingOptions && <Chip size="small" label="Carregando opções" />}
            </div>
            <CustomerBusinessFiltersPanel
              filters={businessFilters}
              options={options}
              onChange={handleBusinessFiltersChange}
            />
          </Popover>
        </TableCell>
      </TableRow>
    </TableHead>
  );
}
