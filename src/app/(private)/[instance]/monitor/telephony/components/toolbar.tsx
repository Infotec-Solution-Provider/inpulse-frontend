"use client";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Button, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import type { TelephonyMonitorMode } from "../types";
import type useTelephonyMonitor from "../use-telephony-monitor";
import { telephonyModes } from "./presentation";

interface TelephonyToolbarProps {
  mode: TelephonyMonitorMode;
  onModeChange: (mode: TelephonyMonitorMode) => void;
  state: ReturnType<typeof useTelephonyMonitor>;
  now: number;
}

export default function TelephonyToolbar({
  mode,
  onModeChange,
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
  const indicator =
    "whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800";
  // One wrapping row: title, view, indicators and actions share the width so the
  // filters and results keep the height.
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">
          Monitoria de telefonia
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {busy
            ? "Atualizando…"
            : !state.lastUpdatedAt
              ? "Aguardando atualização"
              : elapsedMinutes < 1
                ? "Atualizado agora"
                : `Atualizado há ${elapsedMinutes} min`}
          {!state.autoRefresh || state.autoRefreshPaused ? " · Atualização automática pausada" : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <ToggleButtonGroup
          exclusive
          value={mode}
          aria-label="Visualizar telefonia"
          size="small"
          onChange={(_event, value: TelephonyMonitorMode | null) => {
            if (value) onModeChange(value);
          }}
        >
          {(Object.keys(telephonyModes) as TelephonyMonitorMode[]).map((value) => (
            <ToggleButton key={value} value={value} sx={{ textTransform: "none", py: 0.5 }}>
              {telephonyModes[value].label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Tooltip describeChild title={telephonyModes[mode].description}>
          <InfoOutlinedIcon
            tabIndex={0}
            aria-label={telephonyModes[mode].description}
            className="text-slate-400"
            fontSize="small"
          />
        </Tooltip>
      </div>
      <div
        className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300"
        aria-label="Indicadores de telefonia"
      >
        <p className={indicator}>
          <strong className="tabular-nums text-slate-900 dark:text-slate-100">
            {state.isLoading ? "—" : state.totalCount.toLocaleString("pt-BR")}
          </strong>{" "}
          {telephonyModes[mode].unit}
        </p>
        {mode !== "unscheduled" && (
          <p className={indicator}>
            <strong className="tabular-nums text-slate-900 dark:text-slate-100">
              {state.summary?.customerCount.toLocaleString("pt-BR") ?? "—"}
            </strong>{" "}
            clientes distintos
          </p>
        )}
        {mode === "schedules" && (
          <p className={indicator}>
            <strong className="tabular-nums text-amber-700 dark:text-amber-300">
              {state.summary?.overdueCount?.toLocaleString("pt-BR") ?? "—"}
            </strong>{" "}
            vencidos
          </p>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          size="small"
          variant="outlined"
          startIcon={state.autoRefresh ? <PauseIcon /> : <PlayArrowIcon />}
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
            <RefreshIcon className={busy ? "animate-spin motion-reduce:animate-none" : ""} />
          }
          disabled={busy || cooldown > 0}
          onClick={state.refetch}
        >
          {cooldown > 0 ? `Aguarde ${cooldown}s` : "Atualizar"}
        </Button>
      </div>
    </header>
  );
}
