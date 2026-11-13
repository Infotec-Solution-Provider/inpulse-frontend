"use client";
import { useEffect, useState } from "react";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import { useTelephony } from "./telephony-provider";
const duration = (seconds: number) =>
  `${Math.floor(seconds / 3600)
    .toString()
    .padStart(
      2,
      "0",
    )}:${Math.floor(seconds / 60) % 60 < 10 ? "0" : ""}${Math.floor(seconds / 60) % 60}:${Math.floor(seconds) % 60 < 10 ? "0" : ""}${Math.floor(seconds) % 60}`;
export function OperatorControls() {
  const phone = useTelephony(),
    status = phone.operatorState;
  const [reason, setReason] = useState(0),
    [error, setError] = useState<string | null>(null),
    [working, setWorking] = useState(false),
    [now, setNow] = useState(Date.now());
  const [preparations, setPreparations] = useState<Array<{ callId: string; number: string }>>([]);
  useEffect(() => {
    let current = true;
    const read = () => {
      void phone.runtime
        .pendingPreparations()
        .then((items) => {
          if (current) setPreparations(items);
        })
        .catch(() => {});
    };
    read();
    const timer = setInterval(() => {
      setNow(Date.now());
      read();
    }, 5000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [phone.runtime]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!status?.enabled && !preparations.length) return null;
  const seconds = status?.startedAt ? Math.max(0, (now - Date.parse(status.startedAt)) / 1000) : 0;
  const exceeded = !!status?.maxSeconds && seconds > status.maxSeconds;
  async function command(kind: string) {
    setWorking(true);
    setError(null);
    try {
      await phone.runtime.commandPause(kind, reason || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível confirmar a pausa.");
    } finally {
      setWorking(false);
    }
  }
  async function reread() {
    setWorking(true);
    setError(null);
    try {
      await phone.runtime.waitForSync();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Há registros pendentes.");
    } finally {
      try {
        await phone.runtime.refreshState();
        setPreparations(await phone.runtime.pendingPreparations());
      } catch {
        setError("Não foi possível conferir o estado da telefonia.");
      }
      setWorking(false);
    }
  }
  async function confirm(callId: string, number: string) {
    if (
      !window.confirm(
        `Confirma que nenhuma ligação foi enviada para ${number}? Uma chamada com evidência de envio ou atendimento não será encerrada por esta ação.`,
      )
    )
      return;
    setWorking(true);
    setError(null);
    try {
      await phone.runtime.confirmUnsentPreparation(callId);
      setPreparations(await phone.runtime.pendingPreparations());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível conferir a preparação.");
    } finally {
      setWorking(false);
    }
  }
  return (
    <section
      aria-label="Pausa telefônica"
      className="space-y-2 rounded border border-slate-200 p-2 text-sm"
    >
      {preparations.length > 0 && (
        <Alert severity="warning">
          Há preparação de ligação sem confirmação. Confira antes de iniciar outra saída.
          {preparations.map((item) => (
            <div key={item.callId} className="mt-2">
              <span>{item.number}</span>
              <Button
                disabled={working || phone.busy}
                onClick={() => void confirm(item.callId, item.number)}
              >
                Confirmar que não houve discagem
              </Button>
            </div>
          ))}
        </Alert>
      )}
      {status?.enabled && (
        <>
          <strong>
            {status.state === "paused"
              ? `Em pausa · ${status.reason || ""}`
              : status.state === "pending"
                ? "Pausa após finalizar o atendimento"
                : "Disponível para telefonia"}
          </strong>
          {status.state === "paused" && (
            <p role="timer" className={exceeded ? "font-bold text-red-600" : ""}>
              {duration(seconds)}
              {status.maxSeconds ? ` / ${duration(status.maxSeconds)}` : " · sem limite"}
            </p>
          )}
          {exceeded && <Alert severity="warning">Tempo previsto de pausa excedido.</Alert>}
          {status.pbx && status.pbx.status !== "not_configured" && (
            <p>
              Central:{" "}
              {(
                {
                  pending: "aguardando confirmação",
                  confirmed: "sincronizada",
                  failed: "falha ao sincronizar",
                  unknown: "confirmação pendente",
                } as Record<string, string>
              )[status.pbx.status] || status.pbx.status}
            </p>
          )}
          {(status.state !== "paused" || status.allowChangeReason) && (
            <TextField
              select
              label={status.state === "paused" ? "Novo motivo da pausa" : "Motivo da pausa"}
              size="small"
              fullWidth
              value={reason}
              onChange={(e) => setReason(Number(e.target.value))}
            >
              <MenuItem value={0}>Selecione</MenuItem>
              {status.reasons.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <div className="flex flex-wrap gap-2">
            {status.state === "available" && (
              <>
                <Button
                  disabled={working || !reason || phone.busy || !!status.activeCallId}
                  onClick={() => void command("now")}
                >
                  Pausar agora
                </Button>
                <Button
                  disabled={working || !reason || !phone.state.scheduleId}
                  onClick={() => void command("after_attendance")}
                >
                  Após atendimento
                </Button>
              </>
            )}
            {status.state === "pending" && (
              <Button disabled={working} onClick={() => void command("cancel_pending")}>
                Cancelar pausa agendada
              </Button>
            )}
            {status.state === "paused" && (
              <Button disabled={working} variant="contained" onClick={() => void command("resume")}>
                Retomar
              </Button>
            )}
            {status.state === "paused" && status.allowChangeReason && (
              <Button
                disabled={working || !reason || reason === status.reasonId}
                onClick={() => void command("change_reason")}
              >
                Trocar motivo
              </Button>
            )}
            {status.activeCallId && !phone.busy && (
              <Button
                disabled={working}
                color="warning"
                onClick={() => {
                  if (
                    window.confirm(
                      "Confirma que não há ligação em andamento? O histórico ficará com encerramento desconhecido.",
                    )
                  )
                    void command("release_lost");
                }}
              >
                Confirmar mídia encerrada
              </Button>
            )}
          </div>
        </>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Button size="small" disabled={working} onClick={() => void reread()}>
        Conferir sincronização
      </Button>
      {status?.pbx&&["failed","unknown"].includes(status.pbx.status)&&<Button size="small" disabled={working} onClick={()=>void command("retry_pbx")}>Sincronizar central</Button>}
    </section>
  );
}
