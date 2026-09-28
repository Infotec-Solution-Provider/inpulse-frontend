"use client";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  TextField,
  Tooltip,
} from "@mui/material";
import type useTelephonyMonitor from "../use-telephony-monitor";
import type { TelephonyLookupKind, TelephonyLookupOption, TelephonyMonitorFilters } from "../types";
import { TelephonyDateField, TelephonyLookupField } from "./filter-fields";
import { lookupFields, selectedLookupIds } from "./lookup-fields";

interface TelephonyFiltersProps {
  state: ReturnType<typeof useTelephonyMonitor>;
  onLookup: (kind: TelephonyLookupKind) => void;
  getSelection: (kind: TelephonyLookupKind) => TelephonyLookupOption[];
}

export default function TelephonyFilters({ state, onLookup, getSelection }: TelephonyFiltersProps) {
  const { filters, setFilters, applyFilters, resetFilters, hasUnappliedFilters, isLoading } = state;
  const update = <K extends keyof TelephonyMonitorFilters>(
    key: K,
    value: TelephonyMonitorFilters[K],
  ) => setFilters((current) => ({ ...current, [key]: value }));
  const customerKinds = [
    "customers",
    "campaigns",
    "groups",
    "segments",
    "origins",
    "products",
    "states",
    "cities",
    "neighborhoods",
  ] as const;
  const customerCount =
    customerKinds.filter((kind) => selectedLookupIds(filters, kind).length > 0).length +
    [filters.lastPurchaseAt, filters.lastContactAt].filter((range) => range.from || range.to)
      .length;
  const telephoneCount =
    Number(filters.neverWorked) +
    Number(filters.monthlyActivity !== "all") +
    Number(filters.customerOperatorId !== null) +
    [
      filters.mode === "schedules"
        ? filters.scheduledAt
        : filters.mode === "calls"
          ? filters.calledAt
          : null,
      filters.repurchaseAt,
    ].filter((range) => range?.from || range?.to).length;
  const renderLookup = (kind: TelephonyLookupKind) => {
    const dependencyMissing =
      (kind === "cities" && !filters.states.length) ||
      (kind === "neighborhoods" && !filters.cities.length);
    return (
      <TelephonyLookupField
        key={kind}
        {...lookupFields[kind]}
        selection={getSelection(kind)}
        onOpen={() => onLookup(kind)}
        disabled={dependencyMissing}
        helperText={
          dependencyMissing
            ? kind === "cities"
              ? "Selecione os estados primeiro."
              : "Selecione as cidades primeiro."
            : undefined
        }
      />
    );
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        applyFilters();
      }}
      aria-label="Filtros da telefonia"
      className="shrink-0 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 lg:flex lg:min-h-28 lg:shrink lg:flex-col"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 p-3">
        <TextField
          label="Pesquisar cliente ou telefone"
          size="small"
          value={filters.searchText}
          onChange={(event) => update("searchText", event.target.value)}
          slotProps={{ htmlInput: { maxLength: 200 } }}
          sx={{ minWidth: 200, flex: 1 }}
        />
        <Button
          type="submit"
          variant="contained"
          startIcon={<SearchIcon />}
          disabled={isLoading && !hasUnappliedFilters}
        >
          Aplicar filtros
        </Button>
        <Button type="button" onClick={resetFilters}>
          Limpar
        </Button>
      </div>
      <div className="max-h-[44dvh] overflow-y-auto border-t border-slate-100 px-3 dark:border-slate-700 lg:min-h-0 lg:flex-1">
        <details className="border-b border-slate-100 py-3 dark:border-slate-700">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-100">
            Telefonia{" "}
            {telephoneCount > 0 && (
              <Chip
                label={telephoneCount}
                size="small"
                color="primary"
                sx={{ ml: 1, height: 20 }}
              />
            )}
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filters.mode === "schedules" && (
              <TelephonyDateField
                label="Data do agendamento"
                value={filters.scheduledAt}
                onChange={(value) => update("scheduledAt", value)}
              />
            )}
            {filters.mode === "calls" && (
              <TelephonyDateField
                label="Data da ligação"
                value={filters.calledAt}
                onChange={(value) => update("calledAt", value)}
              />
            )}
            <TelephonyDateField
              label="Previsão de recompra"
              value={filters.repurchaseAt}
              onChange={(value) => update("repurchaseAt", value)}
            />
            {renderLookup("operators")}
            <div>
              <TextField
                select
                fullWidth
                size="small"
                label="Atividade no mês"
                value={filters.monthlyActivity}
                onChange={(event) =>
                  update(
                    "monthlyActivity",
                    event.target.value as TelephonyMonitorFilters["monthlyActivity"],
                  )
                }
              >
                <MenuItem value="all">Qualquer quantidade</MenuItem>
                <MenuItem value="contacts_lt2">Menos de 2 contatos no mês</MenuItem>
                <MenuItem value="calls_lt2">Menos de 2 ligações no mês</MenuItem>
              </TextField>
              <Tooltip title="Contatos contam contatos telefônicos efetivos; ligações contam registros telefônicos. Ambos consideram o mês de referência.">
                <p tabIndex={0} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Contatos e ligações telefônicos no mês de referência.
                </p>
              </Tooltip>
            </div>
            <TextField
              type="month"
              size="small"
              label="Mês de referência"
              value={filters.referenceMonth}
              required
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: "1970-01", max: "2200-12" },
              }}
              onChange={(event) => update("referenceMonth", event.target.value)}
            />
            <div className="flex items-start gap-1">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.neverWorked}
                    onChange={(event) => update("neverWorked", event.target.checked)}
                  />
                }
                label="Nunca trabalhados"
              />
              <Tooltip title="Clientes sem nenhuma tentativa por telefone ou WhatsApp no histórico integrado ao CRM, independentemente do período selecionado.">
                <InfoOutlinedIcon
                  aria-label="Nunca trabalhados: sem tentativa por telefone ou WhatsApp no histórico integrado ao CRM"
                  tabIndex={0}
                  className="mt-3 text-slate-500"
                  fontSize="small"
                />
              </Tooltip>
            </div>
          </div>
        </details>
        <details className="py-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-100">
            Cliente avançado{" "}
            {customerCount > 0 && (
              <Chip label={customerCount} size="small" color="primary" sx={{ ml: 1, height: 20 }} />
            )}
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {customerKinds.map(renderLookup)}
            <TelephonyDateField
              label="Última compra"
              value={filters.lastPurchaseAt}
              onChange={(value) => update("lastPurchaseAt", value)}
            />
            <TelephonyDateField
              label="Último contato (qualquer canal)"
              value={filters.lastContactAt}
              onChange={(value) => update("lastContactAt", value)}
            />
          </div>
        </details>
      </div>
      <p
        role="status"
        className={`shrink-0 border-t border-slate-100 px-3 py-2 text-xs dark:border-slate-700 ${hasUnappliedFilters ? "text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}
      >
        {hasUnappliedFilters
          ? "Há alterações para aplicar. A lista ainda usa os filtros anteriores."
          : "Os filtros selecionados estão aplicados."}
      </p>
    </form>
  );
}
