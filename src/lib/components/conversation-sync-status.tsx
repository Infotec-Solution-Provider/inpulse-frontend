"use client";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { WebSocketStatus } from "../hooks/use-socket-activity";
import type { SyncStatus } from "../hooks/use-session-changes";

interface Props {
  connectionStatus: WebSocketStatus;
  lastWebSocketAt: number | null;
  sync: SyncStatus;
  onRefresh: () => void;
}
const statuses = {
  connected: { label: "Conectado", color: "bg-emerald-500" },
  connecting: { label: "Reconectando", color: "bg-amber-500" },
  disconnected: { label: "Desconectado", color: "bg-red-500" },
};
const format = (timestamp: number) => new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short", timeStyle: "medium",
}).format(new Date(timestamp));

export default function ConversationSyncStatus({ connectionStatus, lastWebSocketAt, sync, onRefresh }: Props) {
  const status = statuses[connectionStatus];
  return (
    <section aria-label="Atualização das conversas" className="mb-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5" title="Estado da conexão em tempo real">
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
          <span role="status" aria-live="polite">WebSocket: {status.label}</span>
        </span>
        <button type="button" onClick={onRefresh} disabled={sync.isRefreshing}
          aria-busy={sync.isRefreshing}
          title="Buscar mensagens novas agora"
          className="inline-flex min-h-8 items-center gap-1 rounded border border-slate-300 px-2 font-medium hover:bg-slate-200 disabled:cursor-wait disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-700">
          <RefreshIcon aria-hidden="true" sx={{ fontSize: 16 }} className={sync.isRefreshing ? "animate-spin" : ""} />
          {sync.isRefreshing ? "Atualizando..." : "Atualizar"}
        </button>
      </div>
      <div className="mt-1.5">
        Última atualização via WebSocket:{" "}
        {lastWebSocketAt === null ? <span>Aguardando eventos</span> :
          <time dateTime={new Date(lastWebSocketAt).toISOString()}>{format(lastWebSocketAt)}</time>}
      </div>
      {sync.lastSuccessAt !== null && <div className="mt-1 text-[11px]">
        Última busca: <time dateTime={new Date(sync.lastSuccessAt).toISOString()}>{format(sync.lastSuccessAt)}</time>
      </div>}
      {sync.error && <p role="alert" className="mt-1 text-red-700 dark:text-red-300">Não foi possível atualizar. Tente novamente.</p>}
    </section>
  );
}
