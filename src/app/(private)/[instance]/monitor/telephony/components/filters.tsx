"use client";

import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
} from "@mui/material";
import { useRef, type ReactNode } from "react";
import { createTelephonyFilters } from "../filter-state";
import type useTelephonyMonitor from "../use-telephony-monitor";
import type { TelephonyLookupKind, TelephonyLookupOption, TelephonyMonitorFilters } from "../types";
import { TelephonyDateField, TelephonyLookupField } from "./filter-fields";
import { lookupFields, selectedLookupIds } from "./lookup-fields";
import { dialogPaperSx, surface, surfaceBorder } from "./presentation";

interface TelephonyFiltersProps {
  state: ReturnType<typeof useTelephonyMonitor>;
  onLookup: (kind: TelephonyLookupKind) => void;
  getSelection: (kind: TelephonyLookupKind) => TelephonyLookupOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Applied-filter chips, shown beside the search. */
  children?: ReactNode;
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
}: TelephonyFiltersProps) {
  const { filters, appliedFilters, setFilters, applyFilters, hasUnappliedFilters, isLoading } =
    state;
  // Draft when the dialog opened; cancelling restores it, discarding only dialog edits.
  const snapshot = useRef(filters);
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
  const sectionTitle =
    "mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
  const grid = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
        aria-label="Filtros da telefonia"
        className="flex shrink-0 flex-wrap items-center gap-2"
      >
        <TextField
          label="Pesquisar cliente ou telefone"
          size="small"
          value={filters.searchText}
          onChange={(event) => update("searchText", event.target.value)}
          slotProps={{
            htmlInput: { maxLength: 200 },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="submit"
                    size="small"
                    edge="end"
                    aria-label="Pesquisar"
                    disabled={isLoading && !hasUnappliedFilters}
                  >
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: { xs: "100%", sm: 340 },
            "& .MuiOutlinedInput-root": { bgcolor: surface },
          }}
        />
        <Tooltip title="Filtros">
          <IconButton
            aria-label={
              appliedCount
                ? `Filtros, ${appliedCount} ${appliedCount === 1 ? "aplicado" : "aplicados"}`
                : "Filtros"
            }
            aria-haspopup="dialog"
            onClick={openDialog}
            sx={{
              border: 1,
              borderColor: appliedCount ? "primary.main" : surfaceBorder,
              borderRadius: 2,
              bgcolor: surface,
              "&:hover": { bgcolor: surface },
            }}
          >
            <Badge badgeContent={appliedCount} color="primary">
              <FilterListIcon color={appliedCount ? "primary" : "action"} />
            </Badge>
          </IconButton>
        </Tooltip>
        {children}
        <p
          role="status"
          className={
            hasUnappliedFilters && !open
              ? "basis-full text-xs text-amber-700 dark:text-amber-300"
              : "sr-only"
          }
        >
          {hasUnappliedFilters
            ? "Há alterações para aplicar. A lista ainda usa os filtros anteriores."
            : "Os filtros selecionados estão aplicados."}
        </p>
      </form>
      <Dialog
        open={open}
        // A stray click outside must not discard the edits; Esc and the buttons close it.
        onClose={(_event, reason) => {
          if (reason !== "backdropClick") cancel();
        }}
        fullWidth
        maxWidth="lg"
        aria-labelledby="telephony-filters-title"
        slotProps={{ paper: { sx: dialogPaperSx } }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
            onOpenChange(false);
          }}
          // Shrink to the dialog height so only the content scrolls and the actions stay visible.
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogTitle id="telephony-filters-title" sx={{ pr: 7 }}>
            Filtros da telefonia
          </DialogTitle>
          <IconButton
            aria-label="Fechar filtros"
            onClick={cancel}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon />
          </IconButton>
          <DialogContent dividers className="space-y-6">
            <section aria-labelledby="telephony-filters-telephony">
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
              </div>
            </section>
            <section aria-labelledby="telephony-filters-customer">
              <h3 id="telephony-filters-customer" className={sectionTitle}>
                Cliente
              </h3>
              <div className={grid}>
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
            </section>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5 }}>
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
              Limpar filtros
            </Button>
            <Button type="button" onClick={cancel}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" startIcon={<SearchIcon />}>
              Aplicar filtros
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
