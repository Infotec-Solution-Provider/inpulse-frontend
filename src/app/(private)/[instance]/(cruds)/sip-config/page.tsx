"use client";

import { CrmPage, OperationalIconButton, UiIcon } from "@/lib/ui-system";
import { useAuthContext } from "@/app/auth-context";
import { WebrtcSettingsForm } from "@/lib/telephony/webrtc-settings-form";
import usersService, {
  GlobalSipConfigDTO,
  UpsertGlobalSipConfigPayload,
} from "@/lib/services/users.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { Save as SaveIcon } from "@/lib/ui-system/crm-icons";
import { SettingsPhone as SettingsPhoneIcon } from "@/lib/ui-system/crm-icons";
import {
  Alert,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { SettingsSections, SettingsPanel } from "@/lib/ui-system/settings-sections";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { toast } from "react-toastify";

const initialForm: GlobalSipConfigDTO = {
  CODIGO: 0,
  ASTERISK_SERVER: "",
  ASTERISK_PORTA: "",
  ASTERISK_PROXY: "",
  SIP_EMITE_BIP: "N",
  SIP_VOLUME_AUTOMATICO: "N",
  CALL_IN_DEVICE: "",
  CALL_OUT_DEVICE: "",
  RING_DEVICE: "",
  IP_TELNET: "",
  PORTA_TELNET: "",
  USUARIO_TELNET: "",
  SENHA_TELNET: "",
  PAUSARRAMAL: "N",
  RAMALPAUSA: "",
  RAMALDESPAUSA: "",
  LIGACAO_IMEDIATA: "NAO",
  SIP_ID: "",
  SIP_KEY: "",
  GRAVAR_LIGACAO: "N",
};

const stringFields: Array<{
  key: keyof UpsertGlobalSipConfigPayload;
  label: string;
  type?: string;
}> = [
  { key: "ASTERISK_SERVER", label: "Servidor Asterisk" },
  { key: "ASTERISK_PORTA", label: "Porta do Asterisk", type: "number" },
  { key: "ASTERISK_PROXY", label: "Proxy SIP" },
  { key: "SIP_ID", label: "SIP ID" },
  { key: "SIP_KEY", label: "SIP Key", type: "password" },
  { key: "CALL_IN_DEVICE", label: "Dispositivo de entrada" },
  { key: "CALL_OUT_DEVICE", label: "Dispositivo de saída" },
  { key: "RING_DEVICE", label: "Dispositivo de toque" },
  { key: "IP_TELNET", label: "IP Telnet" },
  { key: "PORTA_TELNET", label: "Porta Telnet", type: "number" },
  { key: "USUARIO_TELNET", label: "Usuário Telnet" },
  { key: "SENHA_TELNET", label: "Senha Telnet", type: "password" },
  { key: "RAMALPAUSA", label: "Ramal pausa" },
  { key: "RAMALDESPAUSA", label: "Ramal despausa" },
];

const switchFields: Array<{
  key: keyof UpsertGlobalSipConfigPayload;
  label: string;
  trueValue: string;
  falseValue: string;
}> = [
  { key: "SIP_EMITE_BIP", label: "Emitir bip no SIP", trueValue: "S", falseValue: "N" },
  { key: "SIP_VOLUME_AUTOMATICO", label: "Volume automático", trueValue: "S", falseValue: "N" },
  { key: "LIGACAO_IMEDIATA", label: "Ligação imediata", trueValue: "SIM", falseValue: "NAO" },
  { key: "GRAVAR_LIGACAO", label: "Gravar ligação", trueValue: "S", falseValue: "N" },
  { key: "PAUSARRAMAL", label: "Pausar ramal", trueValue: "S", falseValue: "N" },
];

function normalizeForm(data: GlobalSipConfigDTO | null): GlobalSipConfigDTO {
  if (!data) {
    return initialForm;
  }

  return {
    CODIGO: data.CODIGO || 0,
    ASTERISK_SERVER: data.ASTERISK_SERVER ?? "",
    ASTERISK_PORTA: data.ASTERISK_PORTA ?? "",
    ASTERISK_PROXY: data.ASTERISK_PROXY ?? "",
    SIP_EMITE_BIP: data.SIP_EMITE_BIP ?? "N",
    SIP_VOLUME_AUTOMATICO: data.SIP_VOLUME_AUTOMATICO ?? "N",
    CALL_IN_DEVICE: data.CALL_IN_DEVICE ?? "",
    CALL_OUT_DEVICE: data.CALL_OUT_DEVICE ?? "",
    RING_DEVICE: data.RING_DEVICE ?? "",
    IP_TELNET: data.IP_TELNET ?? "",
    PORTA_TELNET: data.PORTA_TELNET ?? "",
    USUARIO_TELNET: data.USUARIO_TELNET ?? "",
    SENHA_TELNET: data.SENHA_TELNET ?? "",
    PAUSARRAMAL: data.PAUSARRAMAL ?? "N",
    RAMALPAUSA: data.RAMALPAUSA ?? "",
    RAMALDESPAUSA: data.RAMALDESPAUSA ?? "",
    LIGACAO_IMEDIATA: data.LIGACAO_IMEDIATA ?? "NAO",
    SIP_ID: data.SIP_ID ?? "",
    SIP_KEY: data.SIP_KEY ?? "",
    GRAVAR_LIGACAO: data.GRAVAR_LIGACAO ?? "N",
  };
}

function toNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export default function SipConfigPage() {
  const { instance, user } = useAuthContext();
  return <SipSettings key={`${instance}:${user?.CODIGO}`} />;
}

function SipSettings() {
  const { token } = useAuthContext();
  const [section, setSection] = useState("web");
  const [saved, setSaved] = useState<GlobalSipConfigDTO>(initialForm);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(0);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<GlobalSipConfigDTO>(initialForm);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useCrmLeaveGuard(dirty, isSaving);

  const loadData = async () => {
    if (dirty && !window.confirm("Descartar alterações da central e atualizar?")) return;
    const request = ++requestRef.current;
    if (!token) {
      setForm(initialForm);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFailed(false);

    try {
      usersService.setAuth(token);
      const data = await usersService.getGlobalSipConfig();
      if (request !== requestRef.current) return;
      const next = normalizeForm(data);
      setForm(next);
      setSaved(next);
    } catch (err) {
      toast.error(`Falha ao carregar configuração global de SIP: ${sanitizeErrorMessage(err)}`);
      if (request === requestRef.current) setFailed(true);
    } finally {
      if (request === requestRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    return () => {
      requestRef.current++;
    };
  }, []);

  const handleChangeField = (key: keyof GlobalSipConfigDTO, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleField = (
    key: keyof GlobalSipConfigDTO,
    checked: boolean,
    trueValue: string,
    falseValue: string,
  ) => {
    setForm((prev) => ({ ...prev, [key]: checked ? trueValue : falseValue }));
  };

  const handleSave = async () => {
    if (!tokenRef.current || isSaving || failed) return;
    const request = ++requestRef.current;
    setIsSaving(true);

    try {
      usersService.setAuth(tokenRef.current);

      const payload: UpsertGlobalSipConfigPayload = {
        ASTERISK_SERVER: toNullableString(form.ASTERISK_SERVER ?? ""),
        ASTERISK_PORTA: toNullableString(form.ASTERISK_PORTA ?? ""),
        ASTERISK_PROXY: toNullableString(form.ASTERISK_PROXY ?? ""),
        SIP_EMITE_BIP: form.SIP_EMITE_BIP,
        SIP_VOLUME_AUTOMATICO: form.SIP_VOLUME_AUTOMATICO,
        CALL_IN_DEVICE: toNullableString(form.CALL_IN_DEVICE ?? ""),
        CALL_OUT_DEVICE: toNullableString(form.CALL_OUT_DEVICE ?? ""),
        RING_DEVICE: toNullableString(form.RING_DEVICE ?? ""),
        IP_TELNET: toNullableString(form.IP_TELNET ?? ""),
        PORTA_TELNET: toNullableString(form.PORTA_TELNET ?? ""),
        USUARIO_TELNET: toNullableString(form.USUARIO_TELNET ?? ""),
        SENHA_TELNET: toNullableString(form.SENHA_TELNET ?? ""),
        PAUSARRAMAL: form.PAUSARRAMAL,
        RAMALPAUSA: toNullableString(form.RAMALPAUSA ?? ""),
        RAMALDESPAUSA: toNullableString(form.RAMALDESPAUSA ?? ""),
        LIGACAO_IMEDIATA: form.LIGACAO_IMEDIATA,
        SIP_ID: toNullableString(form.SIP_ID ?? ""),
        SIP_KEY: toNullableString(form.SIP_KEY ?? ""),
        GRAVAR_LIGACAO: form.GRAVAR_LIGACAO,
      };

      const data = await usersService.upsertGlobalSipConfig(payload);
      if (request !== requestRef.current) return;
      const next = normalizeForm(data);
      setForm(next);
      setSaved(next);
      toast.success("Configuração global de SIP salva com sucesso.");
    } catch (err) {
      toast.error(`Falha ao salvar configuração global de SIP: ${sanitizeErrorMessage(err)}`);
    } finally {
      if (request === requestRef.current) setIsSaving(false);
    }
  };

  const renderTextFields = (keys: Array<keyof UpsertGlobalSipConfigPayload>) => (
    <div className="grid gap-4 md:grid-cols-2">
      {stringFields
        .filter((field) => keys.includes(field.key))
        .map((field) => (
          <TextField
            key={field.key}
            size="small"
            label={field.label}
            type={field.type || "text"}
            value={String(form[field.key] ?? "")}
            onChange={(event) =>
              handleChangeField(field.key as keyof GlobalSipConfigDTO, event.target.value)
            }
            disabled={isLoading || isSaving || failed}
            fullWidth
            className="bg-[var(--ip-surface)]"
          />
        ))}
    </div>
  );

  const renderSwitchFields = (keys: Array<keyof UpsertGlobalSipConfigPayload>) => (
    <div className="grid gap-2 md:grid-cols-2">
      {switchFields
        .filter((field) => keys.includes(field.key))
        .map((field) => (
          <FormControlLabel
            key={field.key}
            control={
              <Switch
                size="small"
                disabled={isLoading || isSaving || failed}
                checked={String(form[field.key] ?? field.falseValue) === field.trueValue}
                onChange={(event) =>
                  handleToggleField(
                    field.key as keyof GlobalSipConfigDTO,
                    event.target.checked,
                    field.trueValue,
                    field.falseValue,
                  )
                }
              />
            }
            label={field.label}
          />
        ))}
    </div>
  );

  return (
    <CrmPage
      title="Configuração SIP"
      description="Configure a central telefônica da empresa. As credenciais por operador ficam no cadastro de usuários."
      breadcrumbs={[{ label: "Configurações" }, { label: "Configuração SIP" }]}
    >
      <SettingsSections
        label="Seções da configuração SIP"
        value={section}
        onChange={setSection}
        sections={[
          { id: "web", label: "Telefonia web", content: <WebrtcSettingsForm /> },
          {
            id: "central",
            label: "Central e chamadas",
            content: (
              <>
                <SettingsPanel
                  title="Conexão com a central"
                  description="Dados globais de conexão SIP / Asterisk. O ramal e a senha de cada operador ficam no cadastro de usuários."
                >
                  {isLoading ? (
                    <CircularProgress size={24} aria-label="Carregando central" />
                  ) : failed ? (
                    <Alert severity="error">
                      Não foi possível carregar a central. Atualize antes de editar.
                    </Alert>
                  ) : (
                    renderTextFields([
                      "ASTERISK_SERVER",
                      "ASTERISK_PORTA",
                      "ASTERISK_PROXY",
                      "SIP_ID",
                      "SIP_KEY",
                    ])
                  )}
                </SettingsPanel>
                <SettingsPanel
                  title="Comportamento das chamadas"
                  description="Preferências de áudio, discagem e gravação para a empresa."
                >
                  {renderSwitchFields([
                    "SIP_EMITE_BIP",
                    "SIP_VOLUME_AUTOMATICO",
                    "LIGACAO_IMEDIATA",
                    "GRAVAR_LIGACAO",
                  ])}
                </SettingsPanel>
              </>
            ),
          },
          {
            id: "advanced",
            label: "Avançado",
            content: (
              <>
                <SettingsPanel
                  title="Dispositivos e roteamento"
                  description="Identificadores dos dispositivos utilizados pela central."
                >
                  {renderTextFields(["CALL_IN_DEVICE", "CALL_OUT_DEVICE", "RING_DEVICE"])}
                </SettingsPanel>
                <SettingsPanel
                  title="Pausa de ramal"
                  description="Códigos usados para pausar e retomar o ramal."
                >
                  <div className="mb-4">{renderSwitchFields(["PAUSARRAMAL"])}</div>
                  {renderTextFields(["RAMALPAUSA", "RAMALDESPAUSA"])}
                </SettingsPanel>
                <details>
                  <summary>Integração legada via Telnet</summary>
                  {renderTextFields([
                    "IP_TELNET",
                    "PORTA_TELNET",
                    "USUARIO_TELNET",
                    "SENHA_TELNET",
                  ])}
                </details>
              </>
            ),
          },
        ]}
      />
      {section !== "web" && (
        <footer className="ip-settings-footer">
          <p role="status">
            {dirty
              ? "Alterações da central não salvas"
              : "As seções Central e Avançado são salvas juntas."}
          </p>
          <div className="ip-crud-actions">
            <OperationalIconButton
              label="Atualizar central"
              onClick={() => void loadData()}
              disabled={isLoading || isSaving}
            >
              <UiIcon name="refresh" scale="toolbar" />
            </OperationalIconButton>
            <Button
              disabled={!dirty || isSaving}
              onClick={() => {
                if (window.confirm("Descartar alterações da central?")) setForm(saved);
              }}
            >
              Descartar
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => void handleSave()}
              disabled={isLoading || isSaving || failed || !dirty}
            >
              {isSaving ? "Salvando…" : "Salvar central"}
            </Button>
          </div>
        </footer>
      )}
    </CrmPage>
  );
}
