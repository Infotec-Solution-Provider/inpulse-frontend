"use client";

import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewAgendaOutlinedIcon from "@mui/icons-material/ViewAgendaOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import { Button, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import useMonitorContext from "../context";
import MonitorSummary from "./summary";

function sinceUpdated(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  if (seconds < 5) return "Atualizado agora";
  if (seconds < 60) return `Atualizado há ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Atualizado há ${minutes} min`;
  return `Atualizado há ${Math.floor(minutes / 60)} h`;
}

export default function MonitorToolbar() {
  const {
    totalCount,
    chats,
    lastUpdatedAt,
    isLoading,
    isRefreshing,
    autoRefresh,
    autoRefreshPaused,
    setAutoRefresh,
    viewMode,
    setViewMode,
    refetch,
    retryAfterUntil,
  } = useMonitorContext();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);
  const retrySeconds = retryAfterUntil
    ? Math.max(0, Math.ceil((retryAfterUntil - now) / 1_000))
    : 0;
  const updating = isLoading || isRefreshing;

  // One wrapping row: title, quick-filter indicators and actions share the width so the
  // conversation list keeps the height.
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">
          Monitoria de conversas
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <span className="text-slate-600 dark:text-slate-300">
            {isLoading
              ? "Carregando conversas…"
              : `${chats.length.toLocaleString("pt-BR")} de ${totalCount.toLocaleString("pt-BR")} conversas`}
          </span>
          {" · "}
          {updating
            ? "Atualizando…"
            : lastUpdatedAt
              ? sinceUpdated(now - lastUpdatedAt)
              : "Aguardando a primeira atualização"}
          {!autoRefresh && (
            <span className="ml-1 text-amber-700 dark:text-amber-300">· Atualização pausada</span>
          )}
          {autoRefreshPaused && (
            <span className="ml-1 text-amber-700 dark:text-amber-300">
              · Atualização pausada durante a consulta da conversa
            </span>
          )}
        </p>
      </div>
      <MonitorSummary />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          size="small"
          aria-label="Modo de visualização"
          onChange={(_event, value: "cards" | "compact" | null) => {
            if (value) setViewMode(value);
          }}
        >
          <ToggleButton value="cards" aria-label="Exibir cartões">
            <Tooltip title="Cartões">
              <ViewAgendaOutlinedIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="compact" aria-label="Exibir lista compacta">
            <Tooltip title="Lista compacta">
              <ViewListOutlinedIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
        <Button
          variant="outlined"
          size="small"
          startIcon={autoRefresh ? <PauseIcon /> : <PlayArrowIcon />}
          aria-label={
            autoRefresh ? "Pausar atualização automática" : "Retomar atualização automática"
          }
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          {autoRefresh ? "Pausar" : "Retomar"}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={
            <RefreshIcon className={updating ? "animate-spin motion-reduce:animate-none" : ""} />
          }
          disabled={updating || retrySeconds > 0}
          onClick={refetch}
        >
          {retrySeconds > 0 ? `Aguarde ${retrySeconds}s` : "Atualizar"}
        </Button>
      </div>
    </header>
  );
}
