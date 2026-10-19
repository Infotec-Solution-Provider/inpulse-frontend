"use client";

import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { MonitorRefreshActions, UiIcon } from "@/lib/ui-system";
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
    <header className="ip-telephony-toolbar shrink-0">
      <div className="ip-page-header min-w-0">
        <div className="min-w-0">
          <h1>Monitoria de telefonia</h1>
          <p
            className="ip-telephony-metadata ip-muted mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1"
            role="status"
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${paused ? "bg-[var(--ip-warning)]" : "bg-[var(--ip-success)]"}`}
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
      </div>
      <MonitorRefreshActions
        autoRefresh={state.autoRefresh}
        busy={busy}
        retrySeconds={cooldown}
        onToggle={() => state.setAutoRefresh(!state.autoRefresh)}
        onRefresh={state.refetch}
      />
      <div className="ip-telephony-modes flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
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
              <UiIcon name="info" scale="metadata" />
            </span>
          </Tooltip>
        </div>
        <div
          className="ip-telephony-metadata ip-muted flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1"
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
          sx={{ display: { xs: "none", lg: "inline-flex" } }}
          value={view}
          exclusive
          size="small"
          aria-label="Modo de visualização"
          onChange={(_event, value: TelephonyMonitorView | null) => {
            if (value) onViewChange(value);
          }}
        >
          <Tooltip title="Lista compacta" describeChild>
            <ToggleButton value="compact" aria-label="Exibir lista compacta">
              <UiIcon name="list" scale="toolbar" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Cartões" describeChild>
            <ToggleButton value="cards" aria-label="Exibir cartões">
              <UiIcon name="cards" scale="toolbar" />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      </div>
    </header>
  );
}
