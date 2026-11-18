"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Alert, Button, Dialog, DialogContent, FormControlLabel, IconButton, MenuItem, Switch, TextField, Tooltip } from "@mui/material";
import { Settings } from "lucide-react";
import { UiIcon } from "@/lib/ui-system/icons";
import { useTelephony } from "./telephony-provider";
import { audioConstraints } from "./audio-preferences";
import { TelephonyDialogTitle } from "./dialog-title";

export function PhoneSettings() {
  const phone = useTelephony();
  const [open, setOpen] = useState(false), [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const titleId = useId();
  const close = () => setOpen(false);
  const [error, setError] = useState<string | null>(null), [level, setLevel] = useState<number | null>(null);
  const stopTest = useRef<() => void>(() => {});
  const prefs = phone.audioPreferences;
  const supported = typeof navigator === "undefined" ? {} : navigator.mediaDevices?.getSupportedConstraints?.() ?? {};
  const outputSupported = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
  const codecNames = typeof RTCRtpReceiver === "undefined" ? [] : [...new Set(RTCRtpReceiver.getCapabilities?.("audio")?.codecs.map(codec => codec.mimeType).filter(name => !/telephone-event|CN|red/i.test(name)) ?? [])];
  const codecOrder = [...prefs.codecOrder.filter(name => codecNames.includes(name)), ...codecNames.filter(name => !prefs.codecOrder.includes(name))];
  async function refresh(permission = false) {
    setError(null);
    try {
      if (permission) { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach(track => track.stop()); }
      setDevices(await navigator.mediaDevices.enumerateDevices());
    } catch { setError("Não foi possível listar os aparelhos. Permita o microfone e confira o navegador."); }
  }
  useEffect(() => {
    if (!open) return;
    void refresh();
    const change = () => void refresh();
    navigator.mediaDevices?.addEventListener("devicechange", change);
    return () => { navigator.mediaDevices?.removeEventListener("devicechange", change); stopTest.current(); };
  }, [open]);
  useEffect(() => { if (phone.busy) stopTest.current(); }, [phone.busy]);
  async function testMicrophone() {
    stopTest.current();
    if (phone.busy) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(prefs, supported) });
      const context = new AudioContext(), analyser = context.createAnalyser();
      context.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let frame = 0;
      const tick = () => { analyser.getByteTimeDomainData(data); setLevel(Math.min(100, Math.round(Math.max(...data.map(n => Math.abs(n - 128))) / 128 * 100))); frame = requestAnimationFrame(tick); };
      tick();
      stopTest.current = () => { cancelAnimationFrame(frame); stream.getTracks().forEach(track => track.stop()); void context.close(); setLevel(null); };
    } catch { setError("O microfone selecionado não está disponível ou não foi autorizado."); }
  }
  function deviceField(key: "microphoneId" | "outputId" | "ringOutputId", label: string, kind: MediaDeviceKind) {
    const available = devices.filter(device => device.kind === kind), value = prefs[key];
    return <TextField select fullWidth size="small" label={label} value={value} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} disabled={phone.busy || (kind === "audiooutput" && !outputSupported)} onChange={event => phone.saveAudioPreferences({ ...prefs, [key]: event.target.value })}>
      <MenuItem value="">Padrão do sistema</MenuItem>
      {value && !available.some(device => device.deviceId === value) && <MenuItem value={value}>Aparelho indisponível — selecione outro</MenuItem>}
      {available.filter(device => device.deviceId).map(device => <MenuItem key={device.deviceId} value={device.deviceId}>{device.label || "Aparelho sem identificação"}</MenuItem>)}
    </TextField>;
  }
  return <>
    <Tooltip title="Configurações da telefonia">
      <IconButton size="small" aria-label="Configurações da telefonia" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <UiIcon icon={Settings} />
      </IconButton>
    </Tooltip>
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      <TelephonyDialogTitle id={titleId} onClose={close}>Aparelhos e áudio</TelephonyDialogTitle>
      <DialogContent className="space-y-4 pt-3">
      {error && <Alert severity="warning">{error}</Alert>}
      <p className="text-sm">Preferências deste usuário neste navegador. Alterações são usadas na próxima ligação.</p>
      {phone.busy && <Alert severity="info">Encerre a ligação para mudar os aparelhos ou testar o microfone.</Alert>}
      <Button disabled={phone.busy} onClick={() => void refresh(true)}>Permitir e atualizar aparelhos</Button>
      {deviceField("microphoneId", "Microfone", "audioinput")}
      {deviceField("outputId", "Saída da conversa", "audiooutput")}
      {deviceField("ringOutputId", "Saída do toque", "audiooutput")}
      {!outputSupported && <p className="text-sm">Este navegador usa a saída padrão do sistema.</p>}
      <div className="flex items-center gap-3"><Button disabled={phone.busy} onClick={() => level === null ? void testMicrophone() : stopTest.current()}>{level === null ? "Testar microfone" : "Parar teste"}</Button>{level !== null && <meter aria-label="Nível do microfone" min={0} max={100} value={level} />}</div>
      <Button disabled={phone.busy} onClick={phone.testAudio}>Testar som na saída da conversa</Button>
      <TextField label="Volume de reprodução (%)" type="number" size="small" value={Math.round(prefs.outputVolume * 100)} disabled={phone.busy} onChange={event => phone.saveAudioPreferences({ ...prefs, outputVolume: Math.min(1, Math.max(0, Number(event.target.value) / 100)) })} />
      {(["echoCancellation", "noiseSuppression", "autoGainControl"] as const).map((key,index) => <FormControlLabel key={key} label={["Cancelamento de eco", "Redução de ruído", "Ganho automático do microfone"][index]} control={<Switch checked={prefs[key]} disabled={phone.busy || !supported[key]} onChange={event => phone.saveAudioPreferences({ ...prefs, [key]: event.target.checked })} />} />)}
      <FormControlLabel label="Tocar ao receber chamada" control={<Switch checked={prefs.ringEnabled} disabled={phone.busy} onChange={event => phone.saveAudioPreferences({ ...prefs, ringEnabled: event.target.checked })} />} />
      <FormControlLabel label="Tom durante discagem" control={<Switch checked={prefs.dialToneEnabled} disabled={phone.busy} onChange={event => phone.saveAudioPreferences({ ...prefs, dialToneEnabled: event.target.checked })} />} />
      <FormControlLabel label="Atender automaticamente" control={<Switch checked={prefs.autoAnswer} disabled={phone.busy || !phone.allowAutoAnswer} onChange={event => phone.saveAudioPreferences({ ...prefs, autoAnswer: event.target.checked })} />} />
      {!phone.allowAutoAnswer && <p className="text-sm">O administrador precisa permitir atendimento automático para esta empresa.</p>}
      <details><summary>Preferência de codecs</summary><p className="text-sm">Somente codecs disponíveis neste navegador. A central negocia o codec final.</p>{codecOrder.map((name,index) => <div className="flex items-center justify-between" key={name}><span>{name}</span><Button size="small" disabled={phone.busy || index === 0} onClick={() => { const order = [...codecOrder]; [order[index-1],order[index]] = [order[index]!,order[index-1]!]; phone.saveAudioPreferences({ ...prefs, codecOrder: order }); }}>Subir</Button></div>)}<Button disabled={phone.busy} onClick={() => phone.saveAudioPreferences({ ...prefs, codecOrder: [] })}>Usar negociação automática</Button></details>
      </DialogContent>
    </Dialog>
  </>;
}
