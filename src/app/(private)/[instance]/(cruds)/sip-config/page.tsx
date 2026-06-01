"use client";

import { useAuthContext } from "@/app/auth-context";
import usersService, {
  GlobalSipConfigDTO,
  UpsertGlobalSipConfigPayload,
} from "@/lib/services/users.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import SaveIcon from "@mui/icons-material/Save";
import SettingsPhoneIcon from "@mui/icons-material/SettingsPhone";
import {
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
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

const stringFields: Array<{ key: keyof UpsertGlobalSipConfigPayload; label: string; type?: string }> = [
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
  const { token } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<GlobalSipConfigDTO>(initialForm);

  const loadData = async () => {
    if (!token) {
      setForm(initialForm);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      usersService.setAuth(token);
      const data = await usersService.getGlobalSipConfig();
      setForm(normalizeForm(data));
    } catch (err) {
      toast.error(`Falha ao carregar configuração global de SIP: ${sanitizeErrorMessage(err)}`);
      setForm(initialForm);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [token]);

  const handleChangeField = (key: keyof GlobalSipConfigDTO, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleField = (
    key: keyof GlobalSipConfigDTO,
    checked: boolean,
    trueValue: string,
    falseValue: string
  ) => {
    setForm((prev) => ({ ...prev, [key]: checked ? trueValue : falseValue }));
  };

  const handleSave = async () => {
    if (!token) {
      return;
    }

    setIsSaving(true);

    try {
      usersService.setAuth(token);

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
      setForm(normalizeForm(data));
      toast.success("Configuração global de SIP salva com sucesso.");
    } catch (err) {
      toast.error(`Falha ao salvar configuração global de SIP: ${sanitizeErrorMessage(err)}`);
    } finally {
      setIsSaving(false);
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
            onChange={(event) => handleChangeField(field.key as keyof GlobalSipConfigDTO, event.target.value)}
            disabled={isLoading || isSaving}
            fullWidth
            className="bg-white dark:bg-slate-700"
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
                checked={String(form[field.key] ?? field.falseValue) === field.trueValue}
                onChange={(event) =>
                  handleToggleField(
                    field.key as keyof GlobalSipConfigDTO,
                    event.target.checked,
                    field.trueValue,
                    field.falseValue
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
    <div className="flex min-h-screen w-full flex-col gap-6 bg-slate-50 px-4 py-5 md:px-8 dark:bg-slate-900/40">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
            <SettingsPhoneIcon sx={{ fontSize: 16 }} />
            SIP global
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Configuração global de SIP</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Defina os parâmetros de telefonia do tenant na tabela legacy de parâmetros. As credenciais por operador continuam na tela de usuários.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button variant="outlined" onClick={() => void loadData()} disabled={isLoading || isSaving}>
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => void handleSave()}
            disabled={isLoading || isSaving}
          >
            Salvar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Paper className="border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-center py-20">
            <CircularProgress size={28} />
          </div>
        </Paper>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <Paper className="border border-slate-200 p-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Conectividade SIP / Asterisk</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Dados principais de conexão e autenticação com a infraestrutura de telefonia.</p>
            </div>
            {renderTextFields(["ASTERISK_SERVER", "ASTERISK_PORTA", "ASTERISK_PROXY", "SIP_ID", "SIP_KEY"])}
          </Paper>

          <Paper className="border border-slate-200 p-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Dispositivos e roteamento</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Defina os devices usados para entrada, saída e toque das chamadas.</p>
            </div>
            {renderTextFields(["CALL_IN_DEVICE", "CALL_OUT_DEVICE", "RING_DEVICE"])}
          </Paper>

          <Paper className="border border-slate-200 p-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Comportamento da chamada</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Controle flags globais de experiência, discagem imediata e gravação.</p>
            </div>
            {renderSwitchFields(["SIP_EMITE_BIP", "SIP_VOLUME_AUTOMATICO", "LIGACAO_IMEDIATA", "GRAVAR_LIGACAO"])}
          </Paper>

          <Paper className="border border-slate-200 p-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Integração Telnet</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Parâmetros auxiliares usados em integrações legadas de telefonia.</p>
            </div>
            {renderTextFields(["IP_TELNET", "PORTA_TELNET", "USUARIO_TELNET", "SENHA_TELNET"])}
          </Paper>

          <Paper className="border border-slate-200 p-6 dark:border-slate-700 dark:bg-slate-800 xl:col-span-2">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Pausa de ramal</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Configura a pausa automática de ramal e os códigos usados para pausa e retorno.</p>
            </div>
            <div className="mb-4">{renderSwitchFields(["PAUSARRAMAL"])}</div>
            {renderTextFields(["RAMALPAUSA", "RAMALDESPAUSA"])}
          </Paper>
        </div>
      )}
    </div>
  );
}
