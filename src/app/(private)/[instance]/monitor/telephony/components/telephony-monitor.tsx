"use client";

import { useAuthContext } from "@/app/auth-context";
import telephonyMonitorService from "@/lib/services/telephony-monitor.service";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { Alert, Button, Dialog, Skeleton } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import CustomerCrmDetailModal from "../../../(main)/(chats-menu)/(start-chat-modal)/customer-crm-detail-modal";
import useTelephonyMonitor from "../use-telephony-monitor";
import type { TelephonyLookupKind, TelephonyLookupOption, TelephonyMonitorMode } from "../types";
import TelephonyFilters from "./filters";
import TelephonyLookupDialog, { type LookupPageRequest } from "./lookup-dialog";
import {
  applyLookupSelection,
  fallbackLookupOption,
  lookupFields,
  selectedLookupIds,
} from "./lookup-fields";
import TelephonyPagination from "./pagination";
import TelephonyResults from "./results";
import TelephonyToolbar from "./toolbar";
import { telephonyModes } from "./presentation";
import TelephonyAppliedFilters from "./applied-filters";

function ScopedTelephonyMonitor() {
  const [mode, setMode] = useState<TelephonyMonitorMode>("schedules");
  const [activeLookup, setActiveLookup] = useState<TelephonyLookupKind | null>(null);
  const [previewCustomerId, setPreviewCustomerId] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [knownOptions, setKnownOptions] = useState<
    Partial<Record<TelephonyLookupKind, TelephonyLookupOption[]>>
  >({});
  const [now, setNow] = useState(Date.now);
  const state = useTelephonyMonitor(mode, {
    modalOpen: filtersOpen || activeLookup !== null || previewCustomerId !== null,
  });
  const statesKey = JSON.stringify(state.filters.states);
  const citiesKey = JSON.stringify(state.filters.cities);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const getSelection = (kind: TelephonyLookupKind) =>
    selectedLookupIds(state.filters, kind).map(
      (id) =>
        knownOptions[kind]?.find((option) => option.id === id) ?? fallbackLookupOption(kind, id),
    );
  const loadLookupPage = useCallback(
    ({ search, page, pageSize, signal }: LookupPageRequest) => {
      if (!activeLookup) throw new Error("Selecione um filtro para pesquisar.");
      return telephonyMonitorService.options(
        {
          kind: activeLookup,
          search,
          page,
          pageSize,
          ...(activeLookup === "cities" || activeLookup === "neighborhoods"
            ? { states: JSON.parse(statesKey) as string[] }
            : {}),
          ...(activeLookup === "neighborhoods"
            ? { cities: JSON.parse(citiesKey) as string[] }
            : {}),
        },
        signal,
      );
    },
    [activeLookup, statesKey, citiesKey],
  );
  const confirmLookup = (options: TelephonyLookupOption[]) => {
    if (!activeLookup) return;
    setKnownOptions((current) => ({
      ...current,
      [activeLookup]: Array.from(
        new Map(
          [...(current[activeLookup] ?? []), ...options].map((option) => [option.id, option]),
        ).values(),
      ),
    }));
    state.setFilters((current) => applyLookupSelection(current, activeLookup, options));
    setActiveLookup(null);
  };
  const cooldown = state.retryAfterUntil
    ? Math.max(0, Math.ceil((state.retryAfterUntil - now) / 1_000))
    : 0;
  const busy = state.isLoading || state.isRefreshing;

  return (
    <section
      className="flex min-h-0 w-full flex-col gap-2 p-3 md:px-5 lg:h-full lg:overflow-y-auto"
      aria-label="Monitoria de telefonia"
    >
      <TelephonyToolbar mode={mode} onModeChange={setMode} state={state} now={now} />
      <TelephonyFilters
        state={state}
        onLookup={setActiveLookup}
        getSelection={getSelection}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
      >
        <TelephonyAppliedFilters state={state} knownOptions={knownOptions} />
      </TelephonyFilters>
      {state.error && (
        <Alert
          severity="error"
          className="shrink-0"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={state.refetch}
              disabled={busy || cooldown > 0}
            >
              {cooldown > 0 ? `Aguarde ${cooldown}s` : "Tentar novamente"}
            </Button>
          }
        >
          {state.error}
          {state.items.length > 0 && " Os dados exibidos são da última atualização bem-sucedida."}
        </Alert>
      )}
      <div
        className="min-h-0 flex-1 lg:min-h-32 lg:overflow-y-auto"
        aria-label="Resultados da telefonia"
        aria-busy={busy}
      >
        {state.isLoading && state.items.length === 0 ? (
          <div role="status" aria-label="Carregando telefonia" className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <Skeleton key={key} variant="rounded" height={64} />
            ))}
          </div>
        ) : state.items.length > 0 ? (
          <TelephonyResults
            items={state.items}
            mode={mode}
            referenceMonth={state.appliedFilters.referenceMonth}
            onPreview={setPreviewCustomerId}
          />
        ) : !state.error ? (
          <div
            role="status"
            className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700"
          >
            <SearchOffIcon className="text-slate-400" sx={{ fontSize: 40 }} />
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
              Nenhum resultado em {telephonyModes[mode].label.toLowerCase()}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ajuste os filtros aplicados ou atualize a lista.
            </p>
            <Button onClick={state.refetch} disabled={busy || cooldown > 0}>
              Atualizar lista
            </Button>
          </div>
        ) : null}
      </div>
      <TelephonyPagination state={state} />
      {activeLookup && (
        <TelephonyLookupDialog
          key={activeLookup}
          title={lookupFields[activeLookup].label}
          multiple={lookupFields[activeLookup].multiple}
          description={
            activeLookup === "customers"
              ? "Pesquise por código, nome, CPF/CNPJ ou telefone."
              : activeLookup === "cities"
                ? "As cidades pertencem aos estados selecionados."
                : activeLookup === "neighborhoods"
                  ? "Os bairros pertencem às cidades selecionadas. Cidade e estado identificam cada bairro."
                  : activeLookup === "operators"
                    ? "Filtra pelo operador vinculado ao cliente."
                    : undefined
          }
          initialSelection={getSelection(activeLookup)}
          loadPage={loadLookupPage}
          onConfirm={confirmLookup}
          onClose={() => setActiveLookup(null)}
        />
      )}
      {previewCustomerId !== null && (
        <Dialog
          open
          fullWidth
          maxWidth="xl"
          aria-label="Detalhes do cliente"
          onClose={() => setPreviewCustomerId(null)}
        >
          <CustomerCrmDetailModal
            customerId={previewCustomerId}
            canEdit={false}
            onClose={() => setPreviewCustomerId(null)}
          />
        </Dialog>
      )}
    </section>
  );
}

export default function TelephonyMonitor() {
  const { instance, user, token } = useAuthContext();
  return (
    <ScopedTelephonyMonitor
      key={JSON.stringify([instance, user?.CODIGO ?? null, Boolean(token)])}
    />
  );
}
