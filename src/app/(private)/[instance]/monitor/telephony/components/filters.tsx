"use client";

import { ArrowLeft, CircleHelp, Search, SlidersHorizontal } from "lucide-react";
import { OperationalIconButton, OperationalPanel } from "@/lib/ui-system";
import {
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
} from "@mui/material";
import { useEffect, useRef, type ReactNode } from "react";
import { createTelephonyFilters } from "../filter-state";
import type useTelephonyMonitor from "../use-telephony-monitor";
import type { TelephonyLookupKind, TelephonyLookupOption, TelephonyMonitorFilters } from "../types";
import { TelephonyDateField, TelephonyLookupField } from "./filter-fields";
import { lookupFields, selectedLookupIds } from "./lookup-fields";

interface TelephonyFiltersProps {
  state: ReturnType<typeof useTelephonyMonitor>;
  onLookup: (kind: TelephonyLookupKind) => void;
  getSelection: (kind: TelephonyLookupKind) => TelephonyLookupOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Applied-filter chips, shown beside the search. */
  children?: ReactNode;
  lookupContent?: ReactNode;
  lookupTitle?: string;
  onLookupBack?: () => void;
}

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

/** Filters set besides the free-text search, for the filter button badge. */
function activeFilterCount(filters: TelephonyMonitorFilters): number {
  const modeRange =
    filters.mode === "schedules"
      ? filters.scheduledAt
      : filters.mode === "calls"
        ? filters.calledAt
        : null;
  return (
    customerKinds.filter((kind) => selectedLookupIds(filters, kind).length > 0).length +
    [modeRange, filters.repurchaseAt, filters.lastPurchaseAt, filters.lastContactAt].filter(
      (range) => range?.from || range?.to,
    ).length +
    Number(filters.neverWorked) +
    Number(filters.monthlyActivity !== "all") +
    Number(filters.customerOperatorId !== null)
  );
}

export default function TelephonyFilters({
  state,
  onLookup,
  getSelection,
  open,
  onOpenChange,
  children,
  lookupContent,
  lookupTitle,
  onLookupBack,
}: TelephonyFiltersProps) {
  const { filters, appliedFilters, setFilters, applyFilters, hasUnappliedFilters, isLoading } =
    state;
  // Draft when the dialog opened; cancelling restores it, discarding only dialog edits.
  const snapshot = useRef(filters);
  const currentFilters = useRef(filters);
  currentFilters.current = filters;
  useEffect(() => {
    if (open) snapshot.current = currentFilters.current;
  }, [open]);
  const update = <K extends keyof TelephonyMonitorFilters>(
    key: K,
    value: TelephonyMonitorFilters[K],
  ) => setFilters((current) => ({ ...current, [key]: value }));
  const appliedCount = activeFilterCount(appliedFilters);
  const openDialog = () => {
    snapshot.current = filters;
    onOpenChange(true);
  };
  const cancel = () => {
    setFilters(snapshot.current);
    onOpenChange(false);
  };
  const renderLookup = (kind: TelephonyLookupKind) => {
    const dependencyMissing =
      (kind === "cities" && !filters.states.length) ||
      (kind === "neighborhoods" && !filters.cities.length);
    return (
      <TelephonyLookupField
        key={kind}
        fieldId={`telephony-lookup-${kind}`}
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
  const sectionTitle = "mb-4 text-sm font-semibold";
  const grid = "grid min-w-0 gap-4";

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
        aria-label="Filtros da telefonia"
        className="ip-toolbar flex shrink-0 flex-wrap items-center gap-2"
      >
        <TextField
          label="Pesquisar"
          placeholder="Cliente ou telefone"
          size="small"
          className="ip-telephony-filter-search"
          value={filters.searchText}
          onChange={(event) => update("searchText", event.target.value)}
          slotProps={{
            htmlInput: { maxLength: 200, "aria-label": "Pesquisar cliente ou telefone" },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <OperationalIconButton
                    type="submit"
                    size="small"
                    edge="end"
                    label="Pesquisar"
                    tooltip="Pesquisar clientes"
                    disabled={isLoading && !hasUnappliedFilters}
                  >
                    <Search size={16} />
                  </OperationalIconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": { bgcolor: "var(--ip-surface)" },
          }}
        />
        <OperationalIconButton
          size="small"
          className="ip-telephony-filter-button"
          label={
            appliedCount
              ? `Filtros, ${appliedCount} ${appliedCount === 1 ? "aplicado" : "aplicados"}`
              : "Filtros"
          }
          tooltip={appliedCount ? `Filtros (${appliedCount} aplicados)` : "Filtros"}
          aria-haspopup="dialog"
          onClick={openDialog}
        >
          <SlidersHorizontal size={18} />
          {appliedCount > 0 && <span className="ip-icon-action-count">{appliedCount}</span>}
        </OperationalIconButton>
        {children}
        <p
          role="status"
          className={
            hasUnappliedFilters && !open ? "basis-full text-xs text-[var(--ip-warning)]" : "sr-only"
          }
        >
          {hasUnappliedFilters
            ? "Há alterações para aplicar. A lista ainda usa os filtros anteriores."
            : "Os filtros selecionados estão aplicados."}
        </p>
      </form>
      <OperationalPanel
        open={open}
        width={480}
        title={lookupContent ? lookupTitle || "Selecionar filtro" : "Filtros da telefonia"}
        description={
          lookupContent
            ? "Confirme a seleção para voltar ao rascunho dos filtros."
            : "Combine critérios para encontrar clientes e atividades."
        }
        onClose={lookupContent ? onLookupBack || cancel : cancel}
        headerAction={
          lookupContent ? (
            <IconButton aria-label="Voltar aos filtros" onClick={onLookupBack}>
              <ArrowLeft size={18} />
            </IconButton>
          ) : undefined
        }
        footer={
          !lookupContent ? (
            <>
              <Button
                type="button"
                onClick={() =>
                  setFilters((current) => ({
                    ...createTelephonyFilters(current.mode),
                    searchText: current.searchText,
                  }))
                }
                sx={{ mr: "auto" }}
              >
                Limpar
              </Button>
              <Button type="button" onClick={cancel}>
                Cancelar
              </Button>
              <Button type="submit" form="telephony-filter-form" variant="contained">
                Aplicar filtros
              </Button>
            </>
          ) : undefined
        }
      >
        {lookupContent || (
          <form
            id="telephony-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters();
              onOpenChange(false);
            }}
            className="flex min-w-0 flex-col gap-6"
          >
            <section className="ip-panel-section" aria-labelledby="telephony-filters-telephony">
              <h3 id="telephony-filters-telephony" className={sectionTitle}>
                Telefonia
              </h3>
              <div className={grid}>
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
                <div className="flex min-w-0 items-end gap-1">
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
                  <Tooltip
                    describeChild
                    title="Contatos contam contatos telefônicos efetivos; ligações contam registros telefônicos. Ambos consideram o mês de referência."
                  >
                    <IconButton
                      aria-label="Atividade no mês: contatos e ligações telefônicos no mês de referência"
                      size="small"
                      className="ip-muted"
                    >
                      <CircleHelp size={16} aria-hidden="true" />
                    </IconButton>
                  </Tooltip>
                </div>
                <TextField
                  type="month"
                  size="small"
                  label="Mês de referência"
                  value={filters.referenceMonth}
                  required
                  className="w-full"
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { min: "1970-01", max: "2200-12" },
                  }}
                  onChange={(event) => update("referenceMonth", event.target.value)}
                />
                <div className="flex items-center gap-1">
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
                  <Tooltip
                    describeChild
                    title="Clientes sem nenhuma tentativa por telefone ou WhatsApp no histórico integrado ao CRM, independentemente do período selecionado."
                  >
                    <IconButton
                      aria-label="Nunca trabalhados: sem tentativa por telefone ou WhatsApp no histórico integrado ao CRM"
                      size="small"
                      className="ip-muted"
                    >
                      <CircleHelp size={16} aria-hidden="true" />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>
            </section>
            <section className="ip-panel-section" aria-labelledby="telephony-filters-customer">
              <h3 id="telephony-filters-customer" className={sectionTitle}>
                Cliente
              </h3>
              <div className={grid}>
                {customerKinds
                  .filter((kind) => !["states", "cities", "neighborhoods"].includes(kind))
                  .map(renderLookup)}
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
            </section>
            <section className="ip-panel-section" aria-labelledby="telephony-filters-location">
              <h3 id="telephony-filters-location" className={sectionTitle}>
                Localização
              </h3>
              <div className={grid}>
                {renderLookup("states")}
                {renderLookup("cities")}
                {renderLookup("neighborhoods")}
              </div>
            </section>
          </form>
        )}
      </OperationalPanel>
    </>
  );
}
