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
    <section aria-label="Atualização das conversas" className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">
      <div className="flex items-center gap-2">
        <span role="status" aria-live="polite" className="inline-flex shrink-0 items-center" title={`Conexão: ${status.label.toLowerCase()}`}>
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.color}`} />
          <span className="sr-only">{status.label}</span>
        </span>
        <span className="min-w-0 flex-1">
          Última atualização:{" "}
          {lastWebSocketAt === null ? <span>Aguardando</span> :
            <time dateTime={new Date(lastWebSocketAt).toISOString()}>{format(lastWebSocketAt)}</time>}
        </span>
        <button type="button" onClick={onRefresh} disabled={sync.isRefreshing}
          aria-busy={sync.isRefreshing}
          aria-label="Atualizar"
          title="Buscar mensagens novas agora"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-slate-800">
          <RefreshIcon aria-hidden="true" sx={{ fontSize: 14 }} className={sync.isRefreshing ? "animate-spin" : ""} />
        </button>
      </div>
      {sync.error && <p role="alert" className="mt-1 text-red-700 dark:text-red-300">Não foi possível atualizar. Tente novamente.</p>}
    </section>
  );
}
