"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import ReplayIcon from "@mui/icons-material/Replay";
import { toast } from "react-toastify";
import parameterSettingsService from "@/lib/services/parameter-settings.service";
import { ParameterSettingControl } from "./parameter-setting-control";
import type {
  ParameterChange,
  ParameterSettingsSnapshot,
  ParameterSource,
} from "./parameter-settings.types";

interface Props {
  source: ParameterSource;
  onSaved?: () => Promise<void>;
}
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível concluir a operação.";
const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function ParameterSettingsPanel({ source, onSaved }: Props) {
  const [snapshot, setSnapshot] = useState<ParameterSettingsSnapshot | null>(null);
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const [resets, setResets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const request = useRef<AbortController | null>(null);

  const accept = (data: ParameterSettingsSnapshot) => {
    setSnapshot(data);
    setDraft({ ...data.values });
    setResets(new Set());
    setError(null);
  };
  const load = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = await parameterSettingsService.get(source, controller.signal);
      if (mounted.current && !controller.signal.aborted) accept(data);
    } catch (err) {
      if (mounted.current && !controller.signal.aborted) setError(message(err));
    } finally {
      if (mounted.current && !controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, [source]);

  const changes: ParameterChange[] =
    snapshot?.catalog.flatMap((setting) => {
      const value = draft[setting.key] ?? null;
      const previousValue = snapshot.values[setting.key] ?? null;
      return resets.has(setting.key) || value !== previousValue
        ? [{ key: setting.key, value: resets.has(setting.key) ? null : value, previousValue }]
        : [];
    }) ?? [];
  const errors: Record<string, string> = {};
  for (const change of changes) {
    const setting = snapshot!.catalog.find((entry) => entry.key === change.key)!;
    if (setting.type !== "number" || change.value === null) continue;
    const value = Number(change.value);
    const multiplier = setting.multiplier ?? 1;
    if (
      !/^\d+$/.test(change.value) ||
      !Number.isSafeInteger(value) ||
      value < (setting.min ?? 0) * multiplier ||
      value > (setting.max ?? 2147483647) * multiplier
    ) {
      errors[change.key] =
        `Informe um valor de ${setting.min ?? 0} a ${setting.max ?? 2147483647}.`;
    }
  }

  useEffect(() => {
    if (!changes.length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changes.length]);

  const save = async () => {
    if (!changes.length || Object.keys(errors).length || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const data = await parameterSettingsService.save(source, changes);
      if (!mounted.current) return;
      accept(data);
      toast.success(`Parâmetros do ${source === "whatsapp" ? "WhatsApp" : "CRM"} salvos.`);
      try {
        await onSaved?.();
      } catch {
        if (mounted.current)
          toast.warning(
            "Configurações salvas. Recarregue a página para atualizar os recursos da sessão.",
          );
      }
    } catch (err) {
      if (mounted.current)
        setError(
          `${message(err)} Suas alterações foram mantidas. Se houve falha de conexão, recarregue para conferir o que foi gravado.`,
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const catalog =
    snapshot?.catalog.filter((setting) =>
      searchable(`${setting.label} ${setting.description} ${setting.group}`).includes(
        searchable(query),
      ),
    ) ?? [];
  const groups = [...new Set(catalog.map((setting) => setting.group))];
  const disabled = loading || saving;

  return (
    <div className="space-y-5">
      <Alert severity="info">
        {source === "whatsapp"
          ? "Estas opções configuram a instância. Ajustes específicos de setor ou usuário continuam prevalecendo quando aplicáveis. Os recursos da sua sessão são atualizados ao salvar."
          : "Estas opções configuram o CRM legado. Algumas mudanças são percebidas no próximo carregamento do CRM. Usar padrão restaura o valor definido pelo banco para aquela opção."}
      </Alert>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TextField
          placeholder="Buscar configuração"
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ width: { xs: "100%", sm: 360 } }}
          slotProps={{
            htmlInput: { "aria-label": "Buscar configuração" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          startIcon={<ReplayIcon />}
          disabled={disabled || changes.length > 0}
          onClick={() => void load()}
        >
          Recarregar
        </Button>
      </div>
      {error && (
        <Alert
          severity="error"
          action={
            !snapshot ? (
              <Button color="inherit" size="small" onClick={() => void load()} disabled={loading}>
                Tentar novamente
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      )}
      {loading ? (
        <div className="flex justify-center py-16">
          <CircularProgress aria-label="Carregando configurações" />
        </div>
      ) : (
        snapshot && (
          <>
            {groups.map((group) => (
              <Paper
                key={group}
                variant="outlined"
                sx={{ px: { xs: 2, sm: 3 }, py: 1, borderRadius: 3 }}
              >
                <div className="flex items-center gap-2 py-3">
                  <Typography component="h2" variant="h6" fontWeight={700}>
                    {group}
                  </Typography>
                  <Chip
                    label={catalog.filter((setting) => setting.group === group).length}
                    size="small"
                  />
                </div>
                {catalog
                  .filter((setting) => setting.group === group)
                  .map((setting) => (
                    <ParameterSettingControl
                      key={setting.key}
                      setting={setting}
                      source={source}
                      value={draft[setting.key] ?? null}
                      disabled={disabled}
                      changed={changes.some((change) => change.key === setting.key)}
                      resetting={resets.has(setting.key)}
                      error={errors[setting.key]}
                      onChange={(value) => {
                        setDraft((current) => ({ ...current, [setting.key]: value }));
                        setResets((current) => {
                          const next = new Set(current);
                          next.delete(setting.key);
                          return next;
                        });
                      }}
                      onReset={() => setResets((current) => new Set(current).add(setting.key))}
                    />
                  ))}
              </Paper>
            ))}
            {!catalog.length && (
              <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  {snapshot.catalog.length
                    ? "Nenhuma configuração encontrada para esta busca."
                    : "Nenhuma das configurações suportadas está disponível nesta instância."}
                </Typography>
              </Paper>
            )}
            <Paper
              elevation={3}
              sx={{ p: 2, borderRadius: 3, position: "sticky", bottom: 12, zIndex: 1 }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Typography variant="body2" color="text.secondary" role="status">
                  {changes.length
                    ? `${changes.length} alteração(ões) pendente(s) nesta aba`
                    : "Nenhuma alteração pendente"}
                </Typography>
                <div className="flex justify-end gap-2">
                  <Button disabled={disabled || !changes.length} onClick={() => accept(snapshot)}>
                    Descartar alterações
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={
                      saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />
                    }
                    disabled={disabled || !changes.length || !!Object.keys(errors).length}
                    onClick={() => void save()}
                  >
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </div>
              </div>
            </Paper>
          </>
        )
      )}
    </div>
  );
}
