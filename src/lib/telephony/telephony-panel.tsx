"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Chip, IconButton, TextField } from "@mui/material";
import { useTelephony } from "./telephony-provider";
import { callPhaseLabels } from "./types";
import { UiIcon } from "@/lib/ui-system/icons";
import { MicOff, PhoneOff } from "lucide-react";

/** The attendance area hosts phone controls in its own layout. */
export function TelephonyPanelSlot({ className }: { className?: string }) {
  const { enabled, hostPanel } = useTelephony();
  useEffect(() => hostPanel(), [hostPanel]);
  return enabled ? (
    <div className={className}>
      <TelephonyPanel />
    </div>
  ) : null;
}

export function TelephonyPanel({ placement = "sidebar" }: { placement?: "sidebar" | "floating" }) {
  const phone = useTelephony();
  const { state, busy } = phone;
  const [expanded, setExpanded] = useState(busy);
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const open = expanded;
  useEffect(() => {
    if (busy) setExpanded(true);
  }, [busy, state.phase, state.number, state.startedAt]);
  const labels = {
    disconnected: "Desconectado",
    connecting: "Conectando",
    ready: "Ramal conectado",
    error: "Sem conexão",
  };
  const call = async () => {
    setError(null);
    try {
      await phone.dial(number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao ligar.");
    }
  };
  const position =
    placement === "floating"
      ? "fixed right-4 top-20 z-[1250] max-h-[calc(100dvh-14rem)] w-[330px] max-w-[calc(100vw-2rem)] shadow-xl"
      : "w-full min-w-0 shadow-sm";
  return (
    <section
      aria-label="Telefone web"
      className={`ip-attendance-phone ip-attendance-phone--${placement} ${position} flex flex-col overflow-hidden rounded-md border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100`}
    >
      <div className="ip-attendance-phone-heading flex shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={open}
        >
          <UiIcon name="phone" /> Telefone {state.extension && `· ${state.extension}`}
        </button>
        <Chip
          size="small"
          color={state.connection === "ready" ? "success" : "default"}
          label={busy ? callPhaseLabels[state.phase] : labels[state.connection]}
        />
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          aria-label={open ? "Recolher telefone" : "Abrir telefone"}
        >
          <UiIcon name="chevronDown" className={open ? "rotate-180" : ""} />
        </IconButton>
      </div>
      {open && (
        <div className="ip-attendance-phone-controls mt-3 max-h-[min(18rem,35dvh)] min-h-0 space-y-3 overflow-y-auto">
          {(state.error || error) && <Alert severity="error">{error || state.error}</Alert>}
          {phone.syncError && <Alert severity="warning">{phone.syncError}</Alert>}
          {phone.audioBlocked && (
            <Button size="small" variant="contained" onClick={phone.playAudio}>
              Ativar áudio da ligação
            </Button>
          )}
          {busy ? (
            <>
              <p className="text-sm">
                <strong>{state.number}</strong>
                <br />
                {callPhaseLabels[state.phase]}
              </p>
              <div className="flex flex-wrap gap-2">
                {state.phase === "incoming" && (
                  <Button variant="contained" color="success" onClick={() => void phone.answer()}>
                    Atender
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<UiIcon icon={PhoneOff} />}
                  onClick={phone.hangup}
                >
                  {state.phase === "incoming" ? "Recusar" : "Desligar"}
                </Button>
                {state.phase === "active" && (
                  <Button
                    variant="outlined"
                    startIcon={<UiIcon icon={MicOff} />}
                    onClick={phone.toggleMute}
                    aria-pressed={state.muted}
                  >
                    {state.muted ? "Ativar microfone" : "Mudo"}
                  </Button>
                )}
              </div>
              {state.phase === "active" && (
                <div className="grid grid-cols-3 gap-1" aria-label="Teclado da ligação">
                  {"123456789*0#".split("").map((tone) => (
                    <Button key={tone} variant="outlined" onClick={() => phone.sendTone(tone)}>
                      {tone}
                    </Button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {state.connection !== "ready" ? (
                <Button
                  fullWidth
                  variant="contained"
                  disabled={state.connection === "connecting"}
                  onClick={() => void phone.connect()}
                >
                  {state.connection === "connecting" ? "Conectando…" : "Conectar telefonia"}
                </Button>
              ) : (
                <>
                  <TextField
                    label="Telefone ou ramal"
                    size="small"
                    fullWidth
                    value={number}
                    onChange={(event) => setNumber(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void call();
                    }}
                    slotProps={{ htmlInput: { inputMode: "tel", maxLength: 40 } }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="contained"
                      color="success"
                      disabled={!number.trim()}
                      onClick={() => void call()}
                    >
                      Ligar
                    </Button>
                    <Button onClick={phone.disconnect}>Desconectar</Button>
                  </div>
                </>
              )}
              {state.phase !== "idle" && (
                <p className="text-xs text-slate-500">
                  {callPhaseLabels[state.phase]} · {state.number}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
