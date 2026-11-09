"use client";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useAuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import filesService from "@/lib/services/files.service";

interface Entry {
  id: number; contactId: number; chatId: null; body: string; type: string; sentAt: string | null;
  userId: number | null; agentId: number | null; from: string; to: string; status: string;
  fileId: number | null; fileName: string | null; fileType: string | null; fileSize: string | null;
}
interface HistoryPage { entries: Entry[]; nextBeforeId: number | null }
const positiveId = (id: unknown): id is number => Number.isSafeInteger(id) && Number(id) > 0;
function checkedPage(value: HistoryPage, contactId: number, before: number | undefined): HistoryPage {
  if (!Array.isArray(value?.entries) || value.entries.length > 50 ||
    !(value.nextBeforeId === null || (positiveId(value.nextBeforeId) && (before === undefined || value.nextBeforeId < before))) ||
    value.entries.some(entry => !positiveId(entry.id) || entry.contactId !== contactId || entry.chatId !== null ||
      (before !== undefined && entry.id >= before) || typeof entry.body !== "string" || typeof entry.type !== "string" ||
      !(entry.sentAt === null || typeof entry.sentAt === "string") ||
      !(entry.userId === null || Number.isSafeInteger(entry.userId)) ||
      !(entry.agentId === null || Number.isSafeInteger(entry.agentId)) ||
      !(entry.fileId === null || positiveId(entry.fileId)) || !(entry.fileName === null || typeof entry.fileName === "string") ||
      typeof entry.from !== "string" || typeof entry.to !== "string" || typeof entry.status !== "string")) {
    throw new Error("Invalid legacy message response");
  }
  return value;
}

/** Read-only contact archive: plain text and explicit file links; never starts a chat or loads file bytes. */
export default function LegacyContactHistoryModal({ contactId, onClose }: { contactId: number; onClose: () => void }) {
  const { instance, user, token } = useAuthContext();
  const { wppApi, parameters } = useWhatsappContext();
  const scope = JSON.stringify([instance, user?.CODIGO, contactId]);
  const openedScope = useRef(scope).current;
  const valid = openedScope === scope && Boolean(token) && user?.NIVEL === "ADMIN" &&
    positiveId(contactId) && isFeatureEnabled(parameters, FEATURE_FLAGS.legacyHistory);
  const live = useRef(valid); live.current = valid;
  const close = useRef(onClose); close.current = onClose;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [before, setBefore] = useState<number | undefined>();
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => { if (!valid) close.current(); }, [valid]);
  useEffect(() => {
    if (!valid) return;
    // Pagination can remove the focused button; Escape must still close the open archive.
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close.current(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [valid]);
  useEffect(() => {
    if (!valid || !token) return;
    const controller = new AbortController();
    setLoading(true); setError(false);
    const config = {
      signal: controller.signal, skipAuthInjection: true, skipAuthRefresh: true,
      headers: { Authorization: `Bearer ${token}`, "x-crm-instance": instance },
      params: { limit: 50, ...(before === undefined ? {} : { beforeId: before }) },
    };
    void wppApi.current.ax.get<{ data: HistoryPage }>(`/api/whatsapp/contacts/${contactId}/legacy-messages`, config).then(response => {
      if (controller.signal.aborted || !live.current) return;
      const page = checkedPage(response.data.data, contactId, before);
      setEntries(previous => {
        const rows = before === undefined ? page.entries : [...previous, ...page.entries];
        return rows.filter((row, index) => rows.findIndex(other => other.id === row.id) === index);
      });
      setNext(page.nextBeforeId);
    }).catch(() => { if (!controller.signal.aborted && live.current) setError(true); })
      .finally(() => { if (!controller.signal.aborted && live.current) setLoading(false); });
    return () => controller.abort();
  }, [before, contactId, instance, retry, token, user?.CODIGO, valid, wppApi]);

  if (!valid) return null;
  return <Dialog open onClose={onClose} aria-labelledby="legacy-contact-history-title" fullWidth maxWidth="sm">
    <DialogTitle id="legacy-contact-history-heading" className="flex items-center justify-between gap-4">
      <span id="legacy-contact-history-title">Histórico sem atendimento</span>
      <IconButton onClick={onClose} aria-label="Fechar histórico sem atendimento"><CloseIcon /></IconButton>
    </DialogTitle>
    <DialogContent dividers>
      <p className="mb-4 text-sm text-slate-500">Mensagens antigas deste contato que não possuem atendimento vinculado.</p>
      {entries.map(entry => <article key={entry.id} className="mb-3 rounded border border-slate-300 p-3">
        <p className="text-sm font-medium">Mensagem antiga · {entry.type}</p>
        <time dateTime={entry.sentAt ?? undefined} className="text-xs text-slate-500">
          {entry.sentAt === null || Number.isNaN(Date.parse(entry.sentAt)) ? "Data não disponível" : new Date(entry.sentAt).toLocaleString("pt-BR")}
        </time>
        <p className="text-xs">{entry.userId === null ? "Autor não informado" : `Autor · ID legado: ${entry.userId}`}</p>
        {entry.agentId !== null && <p className="text-xs">Agente · ID: {entry.agentId}</p>}
        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.body}</p>
        <details className="mt-2 text-xs">
          <summary>Detalhes da mensagem</summary>
          <p>De: {entry.from}</p><p>Para: {entry.to}</p><p>Status: {entry.status}</p>
        </details>
        {entry.fileId !== null && <a className="mt-2 inline-block underline" href={filesService.getFileDownloadUrl(entry.fileId)} target="_blank" rel="noopener noreferrer">
          {entry.fileName || `Abrir arquivo #${entry.fileId}`}
        </a>}
      </article>)}
      {!loading && !error && !entries.length && <Alert severity="info">Não há mensagens antigas sem atendimento para este contato.</Alert>}
      {error && <Alert severity="error">Não foi possível carregar o histórico sem atendimento. <Button onClick={() => setRetry(value => value + 1)}>Tentar novamente</Button></Alert>}
      {loading && <CircularProgress size={24} aria-label="Carregando histórico sem atendimento" />}
    </DialogContent>
    {next !== null && <DialogActions><Button disabled={loading || error} onClick={() => setBefore(next)}>Carregar mensagens mais antigas</Button></DialogActions>}
  </Dialog>;
}
