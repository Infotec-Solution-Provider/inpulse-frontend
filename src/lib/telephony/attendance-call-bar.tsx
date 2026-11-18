"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Alert, Button, Popover } from "@mui/material";
import { Grid3X3, Mic, MicOff, Pause, Phone, PhoneOff, Play } from "lucide-react";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import { UiIcon } from "@/lib/ui-system/icons";
import { useTelephony } from "./telephony-provider";
import { callPhaseLabels } from "./types";
import { TransferControls } from "./transfer-controls";
import "./attendance-call-bar.css";

export function AttendanceCallBar({ callContext }: { callContext?: ReactNode }) {
  const phone = useTelephony();
  const { state, hostPanel } = phone;
  const optionsId = useId();
  const [optionsAnchor, setOptionsAnchor] = useState<HTMLElement | null>(null);
  const [keypadOpen, setKeypadOpen] = useState(false);
  useEffect(() => hostPanel(), [hostPanel]);
  const incoming = state.phase === "incoming";
  const connected = state.phase === "active";
  const hasOptions = connected || Boolean(callContext);
  const paused = phone.operatorState?.state === "paused";
  const phase = state.held ? "Em espera" : callPhaseLabels[state.phase];

  return (
    <section className="attendance-call-bar" aria-label="Telefone web" data-incoming={incoming}>
      <div className="attendance-call-bar-row">
        <div className="attendance-call-signal" aria-hidden>
          <Phone size={16} />
        </div>
        <div className="attendance-call-status" role="status">
          <strong>{phase}</strong>
          <span>
            {state.number}
            {state.answeredAt && <CallDuration startedAt={state.answeredAt} />}
          </span>
        </div>
        <div className="attendance-call-actions">
          {connected && (
            <>
              <OperationalIconButton
                label={state.muted ? "Ativar microfone" : "Mudo"}
                aria-pressed={state.muted}
                onClick={phone.toggleMute}
              >
                <UiIcon icon={state.muted ? MicOff : Mic} scale="toolbar" />
              </OperationalIconButton>
              <OperationalIconButton
                label={state.held ? "Retomar ligação" : "Colocar em espera"}
                aria-pressed={!!state.held}
                disabled={state.holdPending || state.transferPending}
                onClick={phone.toggleHold}
              >
                <UiIcon icon={state.held ? Play : Pause} scale="toolbar" />
              </OperationalIconButton>
            </>
          )}
          {hasOptions && (
            <OperationalIconButton
              label="Opções da ligação"
              aria-haspopup="dialog"
              aria-expanded={Boolean(optionsAnchor)}
              aria-controls={optionsAnchor ? optionsId : undefined}
              onClick={(event) => setOptionsAnchor(event.currentTarget)}
            >
              <UiIcon name="more" scale="toolbar" />
            </OperationalIconButton>
          )}
          {incoming && (
            <Button
              size="small"
              variant="contained"
              color="success"
              onClick={() => void phone.answer()}
            >
              {paused ? "Retomar e atender" : "Atender"}
            </Button>
          )}
          <Button
            className="attendance-call-end"
            size="small"
            color="error"
            variant={incoming ? "text" : "contained"}
            startIcon={<UiIcon icon={PhoneOff} />}
            onClick={phone.hangup}
          >
            {incoming ? "Recusar" : "Desligar"}
          </Button>
        </div>
      </div>
      {(state.error || phone.syncError) && (
        <Alert severity="error" className="attendance-call-feedback">
          {state.error || phone.syncError}
        </Alert>
      )}
      {phone.audioBlocked && (
        <Button size="small" variant="outlined" onClick={phone.playAudio}>
          Ativar áudio da ligação
        </Button>
      )}
      <Popover
        id={optionsId}
        open={hasOptions && Boolean(optionsAnchor)}
        keepMounted
        anchorEl={optionsAnchor}
        onClose={() => setOptionsAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            className: "attendance-call-options",
            role: "dialog",
            "aria-label": "Opções da ligação",
          },
        }}
      >
        <header className="attendance-call-options-header">
          <strong>Opções da ligação</strong>
          <OperationalIconButton
            label="Fechar opções da ligação"
            onClick={() => setOptionsAnchor(null)}
          >
            <UiIcon name="close" scale="toolbar" />
          </OperationalIconButton>
        </header>
        {connected && (
          <>
            <Button
              size="small"
              aria-expanded={keypadOpen}
              startIcon={<Grid3X3 size={15} />}
              onClick={() => setKeypadOpen((open) => !open)}
            >
              Teclado DTMF
            </Button>
            {keypadOpen && (
              <div className="attendance-call-keypad" aria-label="Teclado da ligação">
                {"123456789*0#".split("").map((tone) => (
                  <Button
                    key={tone}
                    size="small"
                    variant="outlined"
                    onClick={() => phone.sendTone(tone)}
                  >
                    {tone}
                  </Button>
                ))}
              </div>
            )}
            <TransferControls />
          </>
        )}
        {callContext}
      </Popover>
    </section>
  );
}

function CallDuration({ startedAt }: { startedAt: string }) {
  const started = Date.parse(startedAt);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!Number.isFinite(started)) return null;
  const seconds = Math.max(0, Math.floor((now - started) / 1000));
  return (
    <span aria-hidden className="tabular-nums">
      {" "}
      · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
}
