"use client";

import { Pause, Play, RefreshCw } from "lucide-react";
import { Button } from "@mui/material";
import { useEffect, useState } from "react";
import useMonitorContext from "../context";

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
    refetch,
    retryAfterUntil,
    error,
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

  return (
    <header className="ip-page-header flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ip-text)" }}>
          Monitoria de conversas
        </h1>
        <p className="ip-muted mt-1 text-sm">
          {isLoading
            ? "Carregando conversas…"
            : `${chats.length.toLocaleString("pt-BR")} de ${totalCount.toLocaleString("pt-BR")} conversas`}
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          {updating
            ? "Atualizando…"
            : lastUpdatedAt
              ? sinceUpdated(now - lastUpdatedAt)
              : "Aguardando a primeira atualização"}
        </p>
        <p className="ip-muted mt-1 flex flex-wrap items-center gap-1.5 text-xs" role="status">
          {error ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
              Dados podem estar desatualizados
            </>
          ) : !autoRefresh ? (
            <>
              <Pause size={12} aria-hidden="true" />
              Atualização automática pausada
            </>
          ) : autoRefreshPaused ? (
            <>
              <Pause size={12} aria-hidden="true" />
              Atualização pausada durante a interação
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
              Atualização automática ativa
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="text"
          size="small"
          startIcon={autoRefresh ? <Pause size={16} /> : <Play size={16} />}
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
            <RefreshCw
              size={16}
              className={updating ? "animate-spin motion-reduce:animate-none" : ""}
            />
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
