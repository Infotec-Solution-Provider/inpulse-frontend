"use client";

import { Pause } from "lucide-react";
import { MonitorRefreshActions } from "@/lib/ui-system";
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
    <header className="ip-page-header ip-conversation-header">
      <div className="ip-conversation-heading min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ip-text)" }}>
          Monitoria de conversas
        </h1>
      </div>
      <MonitorRefreshActions
        autoRefresh={autoRefresh}
        busy={updating}
        retrySeconds={retrySeconds}
        onToggle={() => setAutoRefresh(!autoRefresh)}
        onRefresh={refetch}
      />
      <div className="ip-muted ip-conversation-refresh-status">
        <p>
          {isLoading
            ? "Carregando conversas…"
            : `${chats.length.toLocaleString("pt-BR")} de ${totalCount.toLocaleString("pt-BR")} conversas`}
        </p>
        <p title={lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString("pt-BR") : undefined}>
          {updating
            ? "Atualizando…"
            : lastUpdatedAt
              ? sinceUpdated(now - lastUpdatedAt)
              : "Aguardando a primeira atualização"}
          {lastUpdatedAt && !updating && (
            <time
              className="ip-conversation-update-time"
              dateTime={new Date(lastUpdatedAt).toISOString()}
            >
              {new Date(lastUpdatedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          )}
        </p>
        <p className="flex items-center gap-1.5" role="status">
          {error ? (
            <>
              <span
                className="h-1.5 w-1.5 rounded-full bg-[var(--ip-warning)]"
                aria-hidden="true"
              />
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
              <span
                className="h-1.5 w-1.5 rounded-full bg-[var(--ip-success)]"
                aria-hidden="true"
              />
              Atualização automática ativa
            </>
          )}
        </p>
      </div>
    </header>
  );
}
