"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  MenuItem,
  TextField,
} from "@mui/material";
import { useOptionalTelephony } from "./telephony-provider";
import { useAuthContext } from "@/app/auth-context";
import type { RuntimeCall } from "./runtime-client";
const stateLabels: Record<string, string> = {
  prepared: "Preparada",
  sent: "Ligação enviada",
  ringing: "Chamando",
  answered: "Em conversa",
  ended: "Encerrada",
  failed: "Não completada",
  rejected: "Recusada",
  transferred: "Transferida",
  observation_lost: "Encerramento não confirmado",
};
export function CallHistory({ monitor = false }: { monitor?: boolean }) {
  const phone = useOptionalTelephony();
  return phone ? <BoundCallHistory phone={phone} monitor={monitor} /> : null;
}
function BoundCallHistory({
  phone,
  monitor,
}: {
  phone: NonNullable<ReturnType<typeof useOptionalTelephony>>;
  monitor: boolean;
}) {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false),
    [calls, setCalls] = useState<RuntimeCall[]>([]),
    [error, setError] = useState<string | null>(null),
    [operator, setOperator] = useState(""),
    [editing, setEditing] = useState<RuntimeCall | null>(null),
    [rating, setRating] = useState<RuntimeCall["rating"]>(null),
    [comment, setComment] = useState(""),
    [working, setWorking] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  async function load(more = false) {
    setError(null);
    try {
      const next = (
        await phone.runtime.listCalls(
          operator ? Number(operator) : undefined,
          more ? calls.at(-1)?.cursor : undefined,
        )
      ).calls;
      setCalls((previous) => (more ? [...previous, ...next] : next));
      setHasMore(next.length === 50);
      setNeedsRefresh(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível consultar o histórico.");
    }
  }
  useEffect(() => {
    if (open) void load();
  }, [open]);
  useEffect(() => {
    if (
      phone.operatorState?.enabled &&
      phone.state.callId &&
      ["ended", "failed"].includes(phone.state.phase) &&
      lastPrompt !== phone.state.callId
    ) {
      setLastPrompt(phone.state.callId);
    }
  }, [phone.state.callId, phone.state.phase, phone.operatorState?.enabled, lastPrompt]);
  if (!phone.operatorState?.enabled && !(monitor && user?.NIVEL === "ADMIN")) return null;
  const prompt = lastPrompt && !calls.some((call) => call.callId === lastPrompt && call.rating);
  async function save() {
    if (!editing) return;
    setWorking(true);
    setError(null);
    try {
      const result = await phone.runtime.review(editing, rating, comment);
      setCalls((old) =>
        old.map((c) =>
          c.callId === editing.callId
            ? { ...c, rating, comment, reviewVersion: result.version }
            : c,
        ),
      );
      setEditing(null);
    } catch (e) {
      setNeedsRefresh(true);
      setEditing(null);
      setError(
        e instanceof Error
          ? e.message
          : "A avaliação não foi confirmada. Releia o histórico antes de tentar novamente.",
      );
    } finally {
      setWorking(false);
    }
  }
  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        {prompt ? "Avaliar áudio da última ligação" : "Histórico e qualidade das ligações"}
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!working) setOpen(false);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Ligações e qualidade técnica do áudio</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error">{error}</Alert>}
          {needsRefresh && <Button onClick={() => void load()}>Reconsultar avaliações</Button>}
          {user?.NIVEL === "ADMIN" && (
            <div className="my-3 flex gap-2">
              <TextField
                size="small"
                label="Código do operador (vazio: minhas ligações)"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                inputMode="numeric"
              />
              <Button onClick={() => void load()}>Consultar</Button>
            </div>
          )}
          <p className="my-2 text-sm">
            A avaliação é opcional e descreve a qualidade técnica do áudio.
          </p>
          {!calls.length && <p>Nenhuma ligação encontrada.</p>}
          {calls.map((call) => (
            <article key={call.callId} className="my-2 rounded border p-3 text-sm">
              <strong>{call.number}</strong> ·{" "}
              {call.direction === "incoming" ? "Recebida" : "Realizada"} ·{" "}
              {new Date(call.preparedAt).toLocaleString("pt-BR")}
              <p>
                {stateLabels[call.state] || "Estado não confirmado"} ·{" "}
                {call.rating || "Sem avaliação"}
              </p>
              {call.comment && <p>{call.comment}</p>}
              {Number(user?.CODIGO) === call.operatorId &&
                (call.sentAt || call.direction === "incoming") && (
                  <Button
                    size="small"
                    disabled={needsRefresh || (!call.endedAt && call.state !== "observation_lost")}
                    onClick={() => {
                      setEditing(call);
                      setRating(call.rating);
                      setComment(call.comment);
                    }}
                  >
                    Avaliar áudio
                  </Button>
                )}
            </article>
          ))}
          {hasMore && <Button onClick={() => void load(true)}>Carregar ligações anteriores</Button>}
          {editing && (
            <div className="my-3 space-y-3 rounded border p-3">
              <TextField
                select
                fullWidth
                size="small"
                label="Qualidade do áudio"
                value={rating || ""}
                onChange={(e) => setRating((e.target.value || null) as RuntimeCall["rating"])}
              >
                <MenuItem value="">Sem nota</MenuItem>
                {["RUIM", "MÉDIA", "BOA"].map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                multiline
                label="Comentário opcional"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                inputProps={{ maxLength: 1000 }}
              />
              <Button disabled={working} onClick={() => void save()}>
                Salvar avaliação
              </Button>
              <Button disabled={working} onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={working} onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
