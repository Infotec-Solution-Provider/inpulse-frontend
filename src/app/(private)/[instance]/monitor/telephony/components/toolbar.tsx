"use client";

import { Button, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { CircleHelp, LayoutGrid, List, Pause, Play, RefreshCw } from "lucide-react";
import type { TelephonyMonitorMode, TelephonyMonitorView } from "../types";
import type useTelephonyMonitor from "../use-telephony-monitor";
import { telephonyModes } from "./presentation";

interface TelephonyToolbarProps {
  mode: TelephonyMonitorMode;
  onModeChange: (mode: TelephonyMonitorMode) => void;
  view: TelephonyMonitorView;
  onViewChange: (view: TelephonyMonitorView) => void;
  state: ReturnType<typeof useTelephonyMonitor>;
  now: number;
}

export default function TelephonyToolbar({
  mode,
  onModeChange,
  view,
  onViewChange,
  state,
  now,
}: TelephonyToolbarProps) {
  const elapsedMinutes = state.lastUpdatedAt
    ? Math.max(0, Math.floor((now - state.lastUpdatedAt) / 60_000))
    : 0;
  const cooldown = state.retryAfterUntil
    ? Math.max(0, Math.ceil((state.retryAfterUntil - now) / 1_000))
    : 0;
  const busy = state.isLoading || state.isRefreshing;
  const paused = !state.autoRefresh || state.autoRefreshPaused;
  const updatedAt = state.lastUpdatedAt
    ? new Date(state.lastUpdatedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;
  return (
    <header className="flex shrink-0 flex-col gap-3">
      <div className="ip-page-header flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1>Monitoria de telefonia</h1>
          <p
            className="ip-muted mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs"
            role="status"
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${paused ? "bg-amber-500" : "bg-emerald-500"}`}
              aria-hidden="true"
            />
            <span>
              {busy
                ? "Atualizando…"
                : paused
                  ? "Atualização automática pausada"
                  : "Atualização automática ativa"}
            </span>
            {updatedAt && (
              <span title={`Última consulta às ${updatedAt}`}>
                · {updatedAt}
                {elapsedMinutes > 0 ? ` (${elapsedMinutes} min)` : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <Button
            size="small"
            variant="text"
            startIcon={state.autoRefresh ? <Pause size={15} /> : <Play size={15} />}
            aria-label={
              state.autoRefresh
                ? "Pausar atualização automática da telefonia"
                : "Retomar atualização automática da telefonia"
            }
            onClick={() => state.setAutoRefresh(!state.autoRefresh)}
          >
            {state.autoRefresh ? "Pausar" : "Retomar"}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={
              <RefreshCw
                size={15}
                className={busy ? "animate-spin motion-reduce:animate-none" : ""}
              />
            }
            disabled={busy || cooldown > 0}
            onClick={state.refetch}
          >
            {cooldown > 0 ? `Aguarde ${cooldown}s` : "Atualizar"}
          </Button>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto pb-0.5">
          <ToggleButtonGroup
            exclusive
            value={mode}
            aria-label="Visualizar telefonia"
            size="small"
            sx={{
              flexShrink: 0,
              "& .MuiToggleButton-root": { px: { xs: 1, sm: 1.5 }, whiteSpace: "nowrap" },
            }}
            onChange={(_event, value: TelephonyMonitorMode | null) => {
              if (value) onModeChange(value);
            }}
          >
            {(Object.keys(telephonyModes) as TelephonyMonitorMode[]).map((value) => (
              <ToggleButton key={value} value={value}>
                {telephonyModes[value].label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Tooltip describeChild title={telephonyModes[mode].description}>
            <span
              tabIndex={0}
              aria-label={telephonyModes[mode].description}
              className="ip-muted hidden shrink-0 rounded p-1 sm:inline-flex"
            >
              <CircleHelp size={15} />
            </span>
          </Tooltip>
        </div>
        <div
          className="ip-muted flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs"
          aria-label="Indicadores de telefonia"
        >
          <p className="whitespace-nowrap">
            <strong className="font-semibold tabular-nums text-[var(--ip-text)]">
              {state.isLoading ? "—" : state.totalCount.toLocaleString("pt-BR")}
            </strong>{" "}
            {telephonyModes[mode].unit}
          </p>
          {mode !== "unscheduled" && (
            <p className="whitespace-nowrap">
              <strong className="font-semibold tabular-nums text-[var(--ip-text)]">
                {state.summary?.customerCount.toLocaleString("pt-BR") ?? "—"}
              </strong>{" "}
              clientes distintos
            </p>
          )}
          {mode === "schedules" && (
            <p className="whitespace-nowrap text-[var(--ip-warning)]">
              <strong className="font-semibold tabular-nums">
                {state.summary?.overdueCount?.toLocaleString("pt-BR") ?? "—"}
              </strong>{" "}
              vencidos
            </p>
          )}
        </div>
        <ToggleButtonGroup
          className="ml-auto"
          value={view}
          exclusive
          size="small"
          aria-label="Modo de visualização"
          onChange={(_event, value: TelephonyMonitorView | null) => {
            if (value) onViewChange(value);
          }}
        >
          <ToggleButton value="compact" aria-label="Exibir lista compacta">
            <Tooltip title="Lista compacta">
              <List size={16} />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="cards" aria-label="Exibir cartões">
            <Tooltip title="Cartões">
              <LayoutGrid size={16} />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
    </header>
  );
}
