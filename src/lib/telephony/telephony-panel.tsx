"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Chip, IconButton, TextField } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicOffIcon from "@mui/icons-material/MicOff";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTelephony } from "./telephony-provider";
import { callPhaseLabels } from "./types";

/** Place of the phone panel: the attendance area. Other screens show it only during a call (TelephonyProvider). */
export function TelephonyPanelSlot() {
  const { enabled, hostPanel } = useTelephony();
  useEffect(() => hostPanel(), [hostPanel]);
  return enabled ? <TelephonyPanel /> : null;
}

export function TelephonyPanel() {
  const phone = useTelephony();
  const { state, busy } = phone;
  const [expanded, setExpanded] = useState(false);
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const open = expanded || busy;
  const labels = { disconnected: "Desconectado", connecting: "Conectando", ready: "Ramal conectado", error: "Sem conexão" };
  const call = async () => {
    setError(null);
    try { await phone.dial(number); } catch (err) { setError(err instanceof Error ? err.message : "Falha ao ligar."); }
  };
  return <section aria-label="Telefone web" className="fixed bottom-4 right-4 z-[1250] w-[330px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-300 bg-white p-3 text-slate-800 shadow-xl dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
    <div className="flex items-center justify-between gap-2">
      <button type="button" className="flex flex-1 items-center gap-2 text-left text-sm font-semibold" onClick={() => setExpanded(!expanded)} aria-expanded={open}>
        <PhoneIcon fontSize="small" /> Telefone {state.extension && `· ${state.extension}`}
      </button>
      <Chip size="small" color={state.connection === "ready" ? "success" : "default"} label={busy ? callPhaseLabels[state.phase] : labels[state.connection]} />
      {!busy && <IconButton size="small" onClick={() => setExpanded(!expanded)} aria-label={open ? "Recolher telefone" : "Abrir telefone"}><ExpandMoreIcon /></IconButton>}
    </div>
    {open && <div className="mt-3 space-y-3">
      {(state.error || error) && <Alert severity="error">{error || state.error}</Alert>}
      {phone.syncError && <Alert severity="warning">{phone.syncError}</Alert>}
      {phone.audioBlocked && <Button size="small" variant="contained" onClick={phone.playAudio}>Ativar áudio da ligação</Button>}
      {busy ? <>
        <p className="text-sm"><strong>{state.number}</strong><br />{callPhaseLabels[state.phase]}</p>
        <div className="flex flex-wrap gap-2">
          {state.phase === "incoming" && <Button variant="contained" color="success" onClick={() => void phone.answer()}>Atender</Button>}
          <Button variant="contained" color="error" startIcon={<CallEndIcon />} onClick={phone.hangup}>{state.phase === "incoming" ? "Recusar" : "Desligar"}</Button>
          {state.phase === "active" && <Button variant="outlined" startIcon={<MicOffIcon />} onClick={phone.toggleMute} aria-pressed={state.muted}>{state.muted ? "Ativar microfone" : "Mudo"}</Button>}
        </div>
        {state.phase === "active" && <div className="grid grid-cols-3 gap-1" aria-label="Teclado da ligação">
          {"123456789*0#".split("").map(tone => <Button key={tone} variant="outlined" onClick={() => phone.sendTone(tone)}>{tone}</Button>)}
        </div>}
      </> : <>
        {state.connection !== "ready" ? <Button fullWidth variant="contained" disabled={state.connection === "connecting"} onClick={() => void phone.connect()}>{state.connection === "connecting" ? "Conectando…" : "Conectar telefonia"}</Button> : <>
          <TextField label="Telefone ou ramal" size="small" fullWidth value={number} onChange={event => setNumber(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void call(); }} slotProps={{ htmlInput: { inputMode: "tel", maxLength: 40 } }} />
          <div className="flex gap-2"><Button variant="contained" color="success" disabled={!number.trim()} onClick={() => void call()}>Ligar</Button><Button onClick={phone.disconnect}>Desconectar</Button></div>
        </>}
        {state.phase !== "idle" && <p className="text-xs text-slate-500">{callPhaseLabels[state.phase]} · {state.number}</p>}
      </>}
    </div>}
  </section>;
}
