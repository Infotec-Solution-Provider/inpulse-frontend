"use client";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, CircularProgress, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useAuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";

interface Entry { id: number; body: string; occurredAt: string }
interface HistoryPage { entries: Entry[]; nextBeforeId: number | null }

/** Immutable legacy records remain plain text; no author is inferred from their body. */
export default function LegacyChatHistoryModal({ chatId, onClose }: { chatId: number; onClose: () => void }) {
  const { instance, user, token } = useAuthContext();
  const { wppApi, parameters } = useWhatsappContext();
  const scope = JSON.stringify([instance, user?.CODIGO, chatId]);
  const openedScope = useRef(scope).current;
  const close = useRef(onClose);
  close.current = onClose;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [before, setBefore] = useState<number | undefined>();
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const valid = openedScope === scope && Boolean(token) && isFeatureEnabled(parameters, FEATURE_FLAGS.legacyHistory);
  const live = useRef(valid); live.current = valid;

  useEffect(() => { if (!valid) close.current(); }, [valid]);
  useEffect(() => {
    if (!valid || !token) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const config = {
      signal: controller.signal,
      skipAuthInjection: true,
      skipAuthRefresh: true,
      headers: { Authorization: `Bearer ${token}`, "x-crm-instance": instance },
      params: { limit: 50, ...(before === undefined ? {} : { beforeId: before }) },
    };
    void wppApi.current.ax.get<{ data: HistoryPage }>(`/api/whatsapp/chats/${chatId}/legacy-history`, config)
      .then(response => {
        if (controller.signal.aborted || !live.current) return;
        const page = response.data.data;
        if (!Array.isArray(page?.entries) || !(page.nextBeforeId === null || Number.isSafeInteger(page.nextBeforeId))) throw new Error("Invalid history response");
        setEntries(previous => {
          const rows = before === undefined ? page.entries : [...previous, ...page.entries];
          return rows.filter((row, index) => rows.findIndex(other => other.id === row.id) === index);
        });
        setNext(page.nextBeforeId);
      })
      .catch(() => { if (!controller.signal.aborted && live.current) setError(true); })
      .finally(() => { if (!controller.signal.aborted && live.current) setLoading(false); });
    return () => controller.abort();
  }, [before, chatId, instance, retry, token, user?.CODIGO, valid, wppApi]);

  if (!valid) return null;
  return <section role="dialog" aria-modal="true" aria-labelledby="legacy-history-title" className="flex max-h-[85dvh] w-[42rem] max-w-[calc(100vw-2rem)] flex-col gap-4 overflow-y-auto rounded-lg bg-white p-4 text-slate-900 dark:bg-slate-800 dark:text-white">
    <header className="flex items-center justify-between gap-4">
      <h2 id="legacy-history-title" className="text-lg font-semibold">Histórico do sistema antigo</h2>
      <IconButton onClick={onClose} aria-label="Fechar histórico antigo"><CloseIcon /></IconButton>
    </header>
    {entries.map(entry => <article key={entry.id} className="rounded border border-slate-200 p-3 dark:border-slate-600">
      <p className="text-sm font-medium">Registro do sistema antigo</p>
      <time dateTime={entry.occurredAt} className="text-xs text-slate-500 dark:text-slate-300">{Number.isNaN(Date.parse(entry.occurredAt)) ? "Data não disponível" : new Date(entry.occurredAt).toLocaleString("pt-BR")}</time>
      <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.body}</p>
    </article>)}
    {!loading && !error && !entries.length && <Alert severity="info">Não há registros do sistema antigo para esta conversa.</Alert>}
    {error && <Alert severity="error">Não foi possível carregar o histórico antigo. <Button onClick={() => setRetry(value => value + 1)}>Tentar novamente</Button></Alert>}
    {loading && <CircularProgress size={24} aria-label="Carregando histórico antigo" />}
    {next !== null && <Button disabled={loading || error} onClick={() => setBefore(next)}>Carregar registros mais antigos</Button>}
  </section>;
}
