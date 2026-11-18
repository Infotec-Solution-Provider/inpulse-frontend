"use client";

import { useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Alert, Button, IconButton, TextField, Tooltip } from "@mui/material";
import { TelephonyHeaderHost } from "./header-host";
import { useTelephony } from "./telephony-provider";
import { callPhaseLabels } from "./types";
import { UiIcon } from "@/lib/ui-system/icons";
import { Grid3X3, MicOff, Pause, PhoneOff, Play, Power, Phone, X } from "lucide-react";
import "./telephony-panel.css";
import { PhoneSettings } from "./phone-settings";
import { TransferControls } from "./transfer-controls";
import { CallRecoveryControls } from "./operator-controls";
import { OperatorDashboardDialog } from "./operator-dashboard";

/** The attendance area hosts phone controls in its own layout. */
export function TelephonyPanelSlot({ className, integrated, callContext }: {
  className?: string;
  integrated?: boolean;
  callContext?: ReactNode;
}) {
  const { enabled, hostPanel } = useTelephony();
  useEffect(() => hostPanel(), [hostPanel]);
  return enabled ? (
    <div className={className}>
      <TelephonyPanel integrated={integrated} callContext={callContext} />
    </div>
  ) : null;
}

export function TelephonyPanel({ placement = "sidebar", integrated = false, callContext }: {
  placement?: "sidebar" | "floating";
  integrated?: boolean;
  callContext?: ReactNode;
}) {
  const phone = useTelephony();
  const headerHost = useContext(TelephonyHeaderHost);
  const { state, busy } = phone;
  const [expanded, setExpanded] = useState(busy);
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [keypadOpen, setKeypadOpen] = useState(false);
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
  const statusLabel = busy ? (state.held ? "Em espera" : callPhaseLabels[state.phase]) : labels[state.connection];
  const connectionAction = state.connection === "ready" ? "Desconectar" : "Conectar telefonia";
  const connectionHint = state.extension ? `${statusLabel} · ${state.extension}` : statusLabel;
  const controlsVisible = !!(
    (open && (busy || state.connection === "ready")) ||
    (phone.operatorState?.enabled && phone.operatorState.activeCallId && !busy) ||
    state.error ||
    error ||
    phone.syncError ||
    phone.audioBlocked
  );
  const header = (
    <>
      <Tooltip describeChild title={`${connectionAction} · ${connectionHint}`}>
        <span className="ip-phone-connection">
          <IconButton
            size="small"
            aria-label={connectionAction}
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
          <span
            role="status"
            aria-label={statusLabel}
            className={`ip-phone-status ip-phone-status--${state.connection}${busy ? " ip-phone-status--busy" : ""}`}
          />
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
      {placement === "sidebar" && phone.operatorState?.enabled && (
        <OperatorDashboardDialog metrics={phone.metrics} state={phone.operatorState} phone={state} />
      )}
      <PhoneSettings />
    </>
  );
  return (
    <section
      aria-label="Telefone web"
      data-header-host={!!headerHost}
      data-controls-visible={controlsVisible}
      data-integrated={integrated}
      className={`ip-attendance-phone ip-attendance-phone--${placement} ${position} flex flex-col overflow-hidden rounded-md border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100`}
    >
      {headerHost ? (
        headerHost.element && createPortal(header, headerHost.element)
      ) : (
        <div className="ip-attendance-phone-heading flex shrink-0 items-center gap-2">
          <span className="mr-auto text-sm font-semibold">{integrated ? connectionHint : "Telefonia"}</span>
          {header}
        </div>
      )}
      {controlsVisible && (
        <div className="ip-attendance-phone-controls mt-3 max-h-[min(18rem,35dvh)] min-h-0 space-y-3 overflow-y-auto">
          {(state.error || error) && <Alert severity="error">{error || state.error}</Alert>}
          {phone.audioBlocked && (
            <Button size="small" variant="contained" onClick={phone.playAudio}>
              Ativar áudio da ligação
            </Button>
          )}
          {busy ? (
            <>
              <p className="text-sm" role={integrated ? "status" : undefined}>
                <strong>{state.number}</strong>{integrated ? " · " : <br />}
                {statusLabel}
                {integrated && state.answeredAt && <CallDuration startedAt={state.answeredAt} />}
              </p>
              <div className="flex flex-wrap gap-2">
                {state.phase === "incoming" && (
                  <Button variant="contained" color="success" onClick={() => void phone.answer()}>
                    {phone.operatorState?.state === "paused" ? "Retomar e atender" : "Atender"}
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
                {integrated && state.phase === "active" && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<UiIcon icon={state.held ? Play : Pause} />}
                      onClick={phone.toggleHold}
                      disabled={state.holdPending || state.transferPending}
                      aria-pressed={!!state.held}
                    >
                      {state.holdPending ? "Aguarde…" : state.held ? "Retomar ligação" : "Colocar em espera"}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<UiIcon icon={Grid3X3} />}
                      onClick={() => setKeypadOpen((previous) => !previous)}
                      aria-expanded={keypadOpen}
                    >
                      Teclado DTMF
                    </Button>
                  </>
                )}
              </div>
              {callContext}
              {state.phase === "active" && <TransferControls />}
              {state.phase === "active" && (!integrated || keypadOpen) && (
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
          <CallRecoveryControls />
        </div>
      )}
    </section>
  );
}

function CallDuration({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  return <span aria-live="off" className="tabular-nums"> · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>;
}
