"use client";

import { useAuthContext } from "@/app/auth-context";
import telephonyMonitorService from "@/lib/services/telephony-monitor.service";
import { Alert, Button, Skeleton } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import CustomerCrmDetailModal from "../../../(main)/(chats-menu)/(start-chat-modal)/customer-crm-detail-modal";
import useTelephonyMonitor from "../use-telephony-monitor";
import { telephonyViewStorageKey } from "../filter-state";
import type {
  TelephonyLookupKind,
  TelephonyLookupOption,
  TelephonyMonitorMode,
  TelephonyMonitorView,
} from "../types";
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
import ScheduleEditDialog from "./schedule-edit-dialog";
import { MonitorEmptyState, OperationalPanel } from "@/lib/ui-system";
import "./customer-detail-panel.css";

function ScopedTelephonyMonitor() {
  const { instance, user } = useAuthContext();
  const viewKey = instance && user ? telephonyViewStorageKey(instance, user.CODIGO) : null;
  const [mode, setMode] = useState<TelephonyMonitorMode>("schedules");
  // The table stays the default; storage is optional (private mode, quota).
  const [view, setView] = useState<TelephonyMonitorView>(() => {
    try {
      return viewKey && localStorage.getItem(viewKey) === "cards" ? "cards" : "compact";
    } catch {
      return "compact";
    }
  });
  useEffect(() => {
    if (!viewKey) return;
    try {
      localStorage.setItem(viewKey, view);
    } catch {
      /* The choice just is not remembered. */
    }
  }, [viewKey, view]);
  const [activeLookup, setActiveLookup] = useState<TelephonyLookupKind | null>(null);
  const [previewCustomerId, setPreviewCustomerId] = useState<number | null>(null);
  const [editScheduleId, setEditScheduleId] = useState<number | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [knownOptions, setKnownOptions] = useState<
    Partial<Record<TelephonyLookupKind, TelephonyLookupOption[]>>
  >({});
  const [now, setNow] = useState(Date.now);
  const state = useTelephonyMonitor(mode, {
    modalOpen:
      filtersOpen || activeLookup !== null || previewCustomerId !== null || editScheduleId !== null,
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
  const closeLookup = () => {
    const kind = activeLookup;
    setActiveLookup(null);
    if (kind)
      window.requestAnimationFrame(() =>
        document.getElementById(`telephony-lookup-${kind}`)?.focus(),
      );
  };
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
    closeLookup();
  };
  const cooldown = state.retryAfterUntil
    ? Math.max(0, Math.ceil((state.retryAfterUntil - now) / 1_000))
    : 0;
  const busy = state.isLoading || state.isRefreshing;

  return (
    <section
      className="ip-page flex min-h-0 w-full min-w-0 flex-col gap-4 lg:h-full lg:overflow-hidden"
      aria-label="Monitoria de telefonia"
    >
      <TelephonyToolbar
        mode={mode}
        onModeChange={(next) => {
          setEditScheduleId(null);
          setSavedNotice(false);
          setMode(next);
        }}
        view={view}
        onViewChange={setView}
        state={state}
        now={now}
      />
      {savedNotice && (
        <Alert severity="success" onClose={() => setSavedNotice(false)}>
          Agendamento atualizado.
        </Alert>
      )}
      <TelephonyFilters
        state={state}
        onLookup={setActiveLookup}
        getSelection={getSelection}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onLookupBack={closeLookup}
        lookupTitle={activeLookup ? lookupFields[activeLookup].label : undefined}
        lookupContent={
          activeLookup ? (
            <TelephonyLookupDialog
              embedded
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
              onClose={closeLookup}
            />
          ) : undefined
        }
      >
        <TelephonyAppliedFilters
          state={state}
          knownOptions={knownOptions}
          onShowAll={() => setFiltersOpen(true)}
        />
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
        className="min-h-0 min-w-0 flex-1 lg:min-h-32 lg:overflow-y-auto"
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
            view={view}
            referenceMonth={state.appliedFilters.referenceMonth}
            onPreview={setPreviewCustomerId}
            onEditSchedule={(id) => {
              setSavedNotice(false);
              setEditScheduleId(id);
            }}
          />
        ) : !state.error ? (
          <MonitorEmptyState
            title={`Nenhum resultado em ${telephonyModes[mode].label.toLowerCase()}`}
            description="Ajuste os filtros aplicados ou atualize a lista."
            onRefresh={state.refetch}
            busy={busy || cooldown > 0}
          />
        ) : null}
      </div>
      <TelephonyPagination state={state} />
      {mode === "schedules" && editScheduleId !== null && (
        <ScheduleEditDialog
          key={editScheduleId}
          scheduleId={editScheduleId}
          onClose={() => setEditScheduleId(null)}
          onSaved={() => {
            setEditScheduleId(null);
            setSavedNotice(true);
            state.refetch();
          }}
        />
      )}
      {previewCustomerId !== null && (
        <OperationalPanel
          open
          title="Detalhes do cliente"
          description={`Cliente #${previewCustomerId} · Somente leitura`}
          width={720}
          onClose={() => setPreviewCustomerId(null)}
        >
          <CustomerCrmDetailModal
            customerId={previewCustomerId}
            canEdit={false}
            presentation="panel"
            onClose={() => setPreviewCustomerId(null)}
          />
        </OperationalPanel>
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
