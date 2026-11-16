"use client";
import { useEffect, useState } from "react";
import { Alert, Button } from "@mui/material";
import { useTelephony } from "./telephony-provider";
export function CallRecoveryControls() {
  const phone = useTelephony(),
    status = phone.operatorState;
  const [error, setError] = useState<string | null>(null),
    [working, setWorking] = useState(false);
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
    const timer = setInterval(read, 5000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [phone.runtime]);
  const canRelease = !!status?.enabled && !!status.activeCallId && !phone.busy;
  if (!preparations.length && !canRelease && !phone.syncError && !error && !working) return null;
  async function releaseMedia() {
    if (
      !window.confirm(
        "Confirma que não há ligação em andamento? O histórico ficará com encerramento desconhecido.",
      )
    )
      return;
    setWorking(true);
    setError(null);
    try {
      await phone.runtime.commandPause("release_lost");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível confirmar o encerramento da mídia.");
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
      aria-label="Recuperação de ligações"
      className="space-y-2 rounded border border-slate-200 p-2 text-sm"
    >
      {phone.syncError && <Alert severity="warning">{phone.syncError}</Alert>}
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
      {canRelease && (
        <Button disabled={working} color="warning" onClick={() => void releaseMedia()}>
          Confirmar mídia encerrada
        </Button>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Button size="small" disabled={working} onClick={() => void reread()}>
        Conferir sincronização
      </Button>
    </section>
  );
}
