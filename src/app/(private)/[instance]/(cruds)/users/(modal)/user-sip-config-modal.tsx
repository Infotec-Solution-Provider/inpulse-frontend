"use client";

import usersService, { UpsertSipConfigPayload } from "@/lib/services/users.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import {
  Button,
  Dialog,
  IconButton,
  TextField,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

interface UserSipConfigModalProps {
  open: boolean;
  userId: number;
  userName: string;
  token?: string;
  onClose: () => void;
}

const initialForm: Required<UpsertSipConfigPayload> = {
  RAMAL_SIP: "",
  IP_SERVIDOR_SIP: "",
  LOGIN_SIP: "",
  SENHA_SIP: "",
  USRID_SIP: "",
  CODECS_SIP: "",
  CFG_CONFIG_SIP: "",
};

export default function UserSipConfigModal({ open, userId, userName, token, onClose }: UserSipConfigModalProps) {
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadSipConfig() {
      setIsLoading(true);

      try {
        if (token) {
          usersService.setAuth(token);
        }

        const data = await usersService.getUserSipConfig(userId);

        if (!cancelled) {
          setForm({
            RAMAL_SIP: data?.RAMAL_SIP ?? "",
            IP_SERVIDOR_SIP: data?.IP_SERVIDOR_SIP ?? "",
            LOGIN_SIP: data?.LOGIN_SIP ?? "",
            SENHA_SIP: data?.SENHA_SIP ?? "",
            USRID_SIP: data?.USRID_SIP ?? "",
            CODECS_SIP: data?.CODECS_SIP ?? "",
            CFG_CONFIG_SIP: data?.CFG_CONFIG_SIP ?? "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(`Falha ao carregar SIP do operador: ${sanitizeErrorMessage(err)}`);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSipConfig();

    return () => {
      cancelled = true;
    };
  }, [open, token, userId]);

  const formFields = useMemo(
    (): Array<{ key: keyof UpsertSipConfigPayload; label: string; type?: string }> => [
      { key: "RAMAL_SIP", label: "Ramal SIP" },
      { key: "IP_SERVIDOR_SIP", label: "IP Servidor SIP" },
      { key: "LOGIN_SIP", label: "Login SIP" },
      { key: "SENHA_SIP", label: "Senha SIP", type: "password" },
      { key: "USRID_SIP", label: "USRID SIP" },
      { key: "CODECS_SIP", label: "Codecs SIP" },
      { key: "CFG_CONFIG_SIP", label: "Config SIP" },
    ],
    []
  );

  const onChangeField = (key: keyof UpsertSipConfigPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (token) {
        usersService.setAuth(token);
      }

      await usersService.upsertUserSipConfig(userId, {
        RAMAL_SIP: form.RAMAL_SIP || null,
        IP_SERVIDOR_SIP: form.IP_SERVIDOR_SIP || null,
        LOGIN_SIP: form.LOGIN_SIP || null,
        SENHA_SIP: form.SENHA_SIP || null,
        USRID_SIP: form.USRID_SIP || null,
        CODECS_SIP: form.CODECS_SIP || null,
        CFG_CONFIG_SIP: form.CFG_CONFIG_SIP || null,
      });

      toast.success("Configuração SIP salva com sucesso.");
      onClose();
    } catch (err) {
      toast.error(`Falha ao salvar SIP do operador: ${sanitizeErrorMessage(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div className="flex flex-col bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Configuração SIP do Operador</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">{userName}</p>
          </div>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          {formFields.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              type={field.type || "text"}
              value={form[field.key] || ""}
              onChange={(event) => onChangeField(field.key, event.target.value)}
              disabled={isLoading || isSaving}
              fullWidth
              className="bg-white dark:bg-slate-700"
            />
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <Button onClick={onClose} variant="outlined" disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSave()}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={isLoading || isSaving}
          >
            Salvar SIP
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
