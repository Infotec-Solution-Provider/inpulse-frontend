"use client";

import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Alert, Button, IconButton, TextField, Tooltip } from "@mui/material";
import { TelephonyHeaderHost } from "./header-host";
import { useTelephony } from "./telephony-provider";
import { callPhaseLabels } from "./types";
import { UiIcon } from "@/lib/ui-system/icons";
import { MicOff, PhoneOff, Power, Phone, X } from "lucide-react";
import "./telephony-panel.css";

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
  const headerHost = useContext(TelephonyHeaderHost);
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
  const statusLabel = busy ? callPhaseLabels[state.phase] : labels[state.connection];
  const header = (
    <>
      <span
        role="status"
        aria-label={statusLabel}
        title={`${statusLabel}${state.extension ? ` · ${state.extension}` : ""}`}
        className={`ip-phone-status ip-phone-status--${state.connection}${busy ? "ip-phone-status--busy" : ""}`}
      />
      <Tooltip title={state.connection === "ready" ? "Desconectar" : "Conectar telefonia"}>
        <span>
          <IconButton
            size="small"
            aria-label={state.connection === "ready" ? "Desconectar" : "Conectar telefonia"}
            disabled={busy || state.connection === "connecting"}
            onClick={() => {
              if (state.connection === "ready") phone.disconnect();
              else {
                headerHost?.reveal();
                void phone.connect();
              }
            }}
          >
            <UiIcon icon={Power} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={open ? "Recolher telefone" : "Abrir telefone"}>
        <IconButton
          size="small"
          aria-label={open ? "Recolher telefone" : "Abrir telefone"}
          aria-expanded={open}
          onClick={() => {
            headerHost?.reveal();
            setExpanded(!expanded);
          }}
        >
          <UiIcon icon={open ? X : Phone} />
        </IconButton>
      </Tooltip>
    </>
  );
  return (
    <section
      aria-label="Telefone web"
      data-header-host={!!headerHost}
      data-controls-visible={
        !!(
          (open && (busy || state.connection === "ready")) ||
          state.error ||
          error ||
          phone.syncError ||
          phone.audioBlocked
        )
      }
      className={`ip-attendance-phone ip-attendance-phone--${placement} ${position} flex flex-col overflow-hidden rounded-md border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100`}
    >
      {headerHost ? (
        headerHost.element && createPortal(header, headerHost.element)
      ) : (
        <div className="ip-attendance-phone-heading flex shrink-0 items-center gap-2">
          <span className="mr-auto text-sm font-semibold">Telefonia</span>
          {header}
        </div>
      )}
      {((open && (busy || state.connection === "ready")) ||
        state.error ||
        error ||
        phone.syncError ||
        phone.audioBlocked) && (
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
              {state.connection === "ready" && open && (
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
