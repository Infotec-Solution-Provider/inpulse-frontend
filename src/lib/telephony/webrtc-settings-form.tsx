"use client";

import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import {
  Alert,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Switch,
  TextField,
} from "@mui/material";
import { useAuthContext } from "@/app/auth-context";
import { SettingsPanel } from "../ui-system/settings-sections";
import { OperationalIconButton } from "../ui-system/actions";
import { UiIcon } from "../ui-system/icons";
import { useCrmLeaveGuard } from "../ui-system/leave-guard";
import usersService, {
  type WebrtcConnectionMode,
  type WebrtcSettingsDTO,
} from "../services/users.service";

// Settings saved before the gateway existed have no mode or PBX address.
function normalize(settings: WebrtcSettingsDTO): WebrtcSettingsDTO {
  return { ...settings, mode: settings.mode ?? "direct", pbxAddress: settings.pbxAddress ?? "" };
}

export function WebrtcSettingsForm() {
  const { token, instance, user } = useAuthContext();
  return <SettingsForm key={`${instance}:${user?.CODIGO}:${!!token}`} token={token} />;
}

function SettingsForm({ token }: { token: string | null }) {
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const requestRef = useRef(0);
  const [form, setForm] = useState<WebrtcSettingsDTO | null>(null);
  const [saved, setSaved] = useState<WebrtcSettingsDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [mustReload, setMustReload] = useState(false);
  const [message, setMessage] = useState<{ severity: "error" | "success"; text: string } | null>(
    null,
  );

  const dirty = form !== null && JSON.stringify(form) !== JSON.stringify(saved);
  useCrmLeaveGuard(dirty, busy);

  async function load() {
    if (dirty && !window.confirm("Descartar alterações da telefonia web e atualizar?")) return;
    if (!tokenRef.current) return;
    const request = ++requestRef.current;
    setBusy(true);
    setMessage(null);
    try {
      usersService.setAuth(tokenRef.current);
      const settings = await usersService.getWebrtcSettings();
      if (request !== requestRef.current) return;
      setForm(normalize(settings));
      setSaved(normalize(settings));
      setMustReload(false);
    } catch {
      if (request !== requestRef.current) return;
      setMustReload(true);
      setMessage({
        severity: "error",
        text: "Não foi possível carregar a telefonia web. Tente atualizar. Se o erro persistir, contate o responsável pelo sistema.",
      });
    } finally {
      if (request === requestRef.current) setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    return () => {
      requestRef.current++;
    };
    // Identity changes remount the form. Token refresh preserves unsaved edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!form || !tokenRef.current || busy || mustReload) return;
    const request = ++requestRef.current;
    setBusy(true);
    setMessage(null);
    try {
      usersService.setAuth(tokenRef.current);
      const { gatewayAvailable: _readOnly, ...editable } = form;
      const settings = await usersService.saveWebrtcSettings({
        ...editable,
        iceServers: form.iceServers.map((server) => ({
          ...server,
          urls: server.urls.map((url) => url.trim()).filter(Boolean),
        })),
      });
      if (request !== requestRef.current) return;
      const next = normalize({
        ...settings,
        gatewayAvailable: settings.gatewayAvailable ?? form.gatewayAvailable,
      });
      setForm(next);
      setSaved(next);
      setMessage({
        severity: "success",
        text: "Telefonia web salva. Reconecte o telefone para usar a nova configuração.",
      });
    } catch (error) {
      if (request !== requestRef.current) return;
      if (isAxiosError(error) && error.response?.status === 400) {
        setMessage({
          severity: "error",
          text: sanitizeErrorMessage(error) || "Revise os campos da telefonia web.",
        });
        return;
      }
      setMustReload(true);
      setMessage({
        severity: "error",
        text: "Não foi possível confirmar a gravação. Atualize a telefonia web para conferir o que foi salvo antes de tentar novamente. Verifique os endereços e a conexão com o servidor.",
      });
    } finally {
      if (request === requestRef.current) setBusy(false);
    }
  }

  function changeIce(index: number, field: "urls" | "username" | "credential", value: string) {
    setForm(
      (current) =>
        current && {
          ...current,
          iceServers: current.iceServers.map((server, i) =>
            i === index
              ? { ...server, [field]: field === "urls" ? value.split("\n") : value }
              : server,
          ),
        },
    );
  }

  const disabled = busy || mustReload || !token;
  return (
    <SettingsPanel
      title="Telefonia pelo navegador"
      description="Configure a conexão WebRTC da empresa. As alterações valem na próxima conexão do telefone; desabilitar não encerra chamadas já conectadas."
    >
      {message && (
        <Alert severity={message.severity} className="mt-4">
          {message.text}
        </Alert>
      )}
      {form && (
        <fieldset disabled={disabled} className="mt-4 grid gap-4 border-0 p-0">
          <FormControlLabel
            label="Habilitar telefonia web"
            control={
              <Switch
                checked={form.enabled}
                disabled={disabled}
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              />
            }
          />
          <FormControl disabled={disabled}>
            <FormLabel id="webrtc-connection-mode">Conexão com a central</FormLabel>
            <RadioGroup
              aria-labelledby="webrtc-connection-mode"
              value={form.mode}
              onChange={(event) =>
                setForm({ ...form, mode: event.target.value as WebrtcConnectionMode })
              }
            >
              <FormControlLabel
                value="direct"
                control={<Radio />}
                label="Direta com a central (central com WebRTC)"
              />
              <FormControlLabel
                value="gateway"
                control={<Radio />}
                disabled={disabled || (!form.gatewayAvailable && form.mode !== "gateway")}
                label="Via gateway in.pulse (central sem WebRTC, como Asterisk 1.8)"
              />
            </RadioGroup>
          </FormControl>
          {form.mode === "direct" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Endereço WSS"
                placeholder="wss://pbx.suaempresa.com.br/ws"
                value={form.websocketUrl}
                disabled={disabled}
                size="small"
                fullWidth
                onChange={(event) => setForm({ ...form, websocketUrl: event.target.value })}
                helperText="Conexão segura do navegador com a central telefônica."
              />
              <TextField
                label="Domínio SIP"
                placeholder="pbx.suaempresa.com.br"
                value={form.domain}
                disabled={disabled}
                size="small"
                fullWidth
                onChange={(event) => setForm({ ...form, domain: event.target.value })}
                helperText="Domínio informado pelo responsável pela central, sem https://."
              />
            </div>
          ) : (
            <div className="grid gap-3">
              {!form.gatewayAvailable && (
                <Alert severity="warning" role="note">
                  O gateway não está configurado neste servidor. A telefonia web não conecta neste
                  modo até que ele seja configurado.
                </Alert>
              )}
              <TextField
                label="Endereço SIP da central"
                placeholder="172.22.0.10:5060"
                value={form.pbxAddress}
                disabled={disabled}
                size="small"
                className="md:max-w-md"
                onChange={(event) => setForm({ ...form, pbxAddress: event.target.value })}
                helperText="IP da central na rede do gateway (ZeroTier). Porta padrão: 5060."
              />
              <Alert severity="info" role="note">
                O áudio passa pelo servidor do in.pulse. O mesmo ramal não pode ficar registrado ao
                mesmo tempo no navegador e em um telefone de mesa: as chamadas recebidas tocariam em
                apenas um deles.
              </Alert>
            </div>
          )}
          <details>
            <summary>Rede e servidores STUN/TURN (opcional)</summary>
            <p className="mb-4 text-sm text-[var(--ip-muted)]">
              Ajudam o áudio a atravessar redes e roteadores. Preencha somente se houver servidores
              disponíveis para a empresa.
            </p>
            {form.iceServers.map((server, index) => (
              <div
                key={index}
                className="mb-3 grid gap-3 rounded border border-[var(--ip-border)] p-4"
              >
                <TextField
                  label={`Endereços STUN/TURN ${index + 1}`}
                  multiline
                  minRows={2}
                  value={server.urls.join("\n")}
                  disabled={disabled}
                  size="small"
                  onChange={(event) => changeIce(index, "urls", event.target.value)}
                  helperText="Um endereço por linha. Ex.: stun:servidor:3478 ou turn:servidor:3478."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField
                    label={`Usuário TURN ${index + 1}`}
                    value={server.username ?? ""}
                    disabled={disabled}
                    size="small"
                    autoComplete="off"
                    onChange={(event) => changeIce(index, "username", event.target.value)}
                  />
                  <TextField
                    label={`Senha TURN ${index + 1}`}
                    type="password"
                    value={server.credential ?? ""}
                    disabled={disabled}
                    size="small"
                    autoComplete="new-password"
                    onChange={(event) => changeIce(index, "credential", event.target.value)}
                  />
                </div>
                <Button
                  className="justify-self-start"
                  disabled={disabled}
                  onClick={() =>
                    setForm({ ...form, iceServers: form.iceServers.filter((_, i) => i !== index) })
                  }
                >
                  Remover servidor {index + 1}
                </Button>
              </div>
            ))}
            <Button
              className="justify-self-start"
              disabled={disabled || form.iceServers.length >= 10}
              onClick={() => setForm({ ...form, iceServers: [...form.iceServers, { urls: [""] }] })}
            >
              Adicionar servidor STUN/TURN
            </Button>
          </details>
        </fieldset>
      )}
      <footer className="ip-settings-footer mt-5">
        <p role="status">
          {dirty
            ? "Alterações da telefonia web não salvas"
            : "O ramal de cada operador fica no cadastro de usuários."}
        </p>
        <div className="ip-crud-actions">
          <OperationalIconButton
            label="Atualizar telefonia web"
            disabled={busy || !token}
            onClick={() => void load()}
          >
            <UiIcon name="refresh" scale="toolbar" />
          </OperationalIconButton>
          <Button
            disabled={disabled || !dirty}
            onClick={() => {
              if (window.confirm("Descartar alterações da telefonia web?")) setForm(saved);
            }}
          >
            Descartar
          </Button>
          <Button
            variant="contained"
            disabled={disabled || !form || !dirty}
            onClick={() => void save()}
          >
            {busy ? "Aguarde…" : "Salvar telefonia web"}
          </Button>
        </div>
      </footer>
    </SettingsPanel>
  );
}
