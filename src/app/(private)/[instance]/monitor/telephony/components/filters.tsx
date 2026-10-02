"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
import { alpha } from "@mui/material/styles";
import { useState, type ReactNode } from "react";
import type useTelephonyMonitor from "../use-telephony-monitor";
import type { TelephonyLookupKind, TelephonyLookupOption, TelephonyMonitorFilters } from "../types";
import { TelephonyDateField, TelephonyLookupField } from "./filter-fields";
import { lookupFields, selectedLookupIds } from "./lookup-fields";

interface TelephonyFiltersProps {
  state: ReturnType<typeof useTelephonyMonitor>;
  onLookup: (kind: TelephonyLookupKind) => void;
  getSelection: (kind: TelephonyLookupKind) => TelephonyLookupOption[];
  /** Rendered at the bottom of the filter card (applied-filter chips). */
  children?: ReactNode;
}
type FilterGroup = "telephony" | "customer";

export default function TelephonyFilters({
  state,
  onLookup,
  getSelection,
  children,
}: TelephonyFiltersProps) {
  const { filters, setFilters, applyFilters, resetFilters, hasUnappliedFilters, isLoading } = state;
  const [open, setOpen] = useState<Record<FilterGroup, boolean>>({
    telephony: false,
    customer: false,
  });
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

  const groupButton = (group: FilterGroup, label: string, count: number) => (
    <Button
      type="button"
      size="small"
      variant="outlined"
      aria-expanded={open[group]}
      aria-controls={`telephony-filters-${group}`}
      endIcon={
        <ExpandMoreIcon
          className={`transition-transform motion-reduce:transition-none ${open[group] ? "rotate-180" : ""}`}
        />
      }
      onClick={() => setOpen((current) => ({ ...current, [group]: !current[group] }))}
      // An open group is tinted, not filled, so "Aplicar filtros" stays the primary action.
      sx={{
        textTransform: "none",
        whiteSpace: "nowrap",
        ...(open[group] && {
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          borderColor: "primary.main",
        }),
      }}
    >
      {label}
      {count > 0 && (
        <Chip label={count} size="small" color="primary" sx={{ ml: 1, height: 18, fontSize: 11 }} />
      )}
    </Button>
  );
  const bothOpen = open.telephony && open.customer;
  const groupTitle = (label: string) =>
    bothOpen && (
      <h2 className="col-span-full text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </h2>
    );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        applyFilters();
      }}
      aria-label="Filtros da telefonia"
      className="shrink-0 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 lg:flex lg:shrink lg:flex-col"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2">
        <TextField
          label="Pesquisar cliente ou telefone"
          size="small"
          value={filters.searchText}
          onChange={(event) => update("searchText", event.target.value)}
          slotProps={{ htmlInput: { maxLength: 200 } }}
          sx={{ minWidth: 200, flex: 1 }}
        />
        {groupButton("telephony", "Telefonia", telephoneCount)}
        {groupButton("customer", "Cliente avançado", customerCount)}
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
        <p
          role="status"
          className={
            hasUnappliedFilters
              ? "basis-full text-xs text-amber-700 dark:text-amber-300"
              : "sr-only"
          }
        >
          {hasUnappliedFilters
            ? "Há alterações para aplicar. A lista ainda usa os filtros anteriores."
            : "Os filtros selecionados estão aplicados."}
        </p>
      </div>
      {(open.telephony || open.customer) && (
        <div className="max-h-[50dvh] space-y-4 overflow-y-auto border-t border-slate-100 px-3 py-3 dark:border-slate-700 lg:min-h-0 lg:flex-1">
          {open.telephony && (
            <section
              id="telephony-filters-telephony"
              aria-label="Filtros de telefonia"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {groupTitle("Telefonia")}
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
              <div className="flex items-end gap-1 self-end">
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
                  <InfoOutlinedIcon
                    aria-label="Atividade no mês: contatos e ligações telefônicos no mês de referência"
                    tabIndex={0}
                    className="mb-2.5 text-slate-500"
                    fontSize="small"
                  />
                </Tooltip>
              </div>
              <TextField
                type="month"
                size="small"
                label="Mês de referência"
                value={filters.referenceMonth}
                required
                className="self-end"
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: "1970-01", max: "2200-12" },
                }}
                onChange={(event) => update("referenceMonth", event.target.value)}
              />
              <div className="flex items-center gap-1 self-end">
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
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
                    className="text-slate-500"
                    fontSize="small"
                  />
                </Tooltip>
              </div>
            </section>
          )}
          {open.customer && (
            <section
              id="telephony-filters-customer"
              aria-label="Filtros de cliente avançado"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {groupTitle("Cliente avançado")}
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
            </section>
          )}
        </div>
      )}
      {children}
    </form>
  );
}
