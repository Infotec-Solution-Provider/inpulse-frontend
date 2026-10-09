"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
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
  ParameterTarget,
} from "./parameter-settings.types";

interface Props {
  source: ParameterSource;
  onSaved?: () => Promise<void>;
  target?: ParameterTarget;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
}
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível concluir a operação.";
const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function ParameterSettingsPanel({
  source,
  onSaved,
  target,
  onDirtyChange,
  onSavingChange,
}: Props) {
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
      const data = await parameterSettingsService.get(source, controller.signal, target);
      if (mounted.current && !controller.signal.aborted) accept(data);
    } catch (err) {
      if (mounted.current && !controller.signal.aborted) setError(message(err));
    } finally {
      if (mounted.current && !controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

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
    onDirtyChange?.(changes.length > 0);
  }, [changes.length, onDirtyChange]);

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
      const data = await parameterSettingsService.save(source, changes, target);
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
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        {source === "whatsapp"
          ? "Prioridade: usuário → setor → instância → padrão. Personalize uma opção para definir uma exceção ou restaure o valor herdado. As mudanças chegam às outras sessões no próximo carregamento."
          : "Configuração global do CRM legado. Usar padrão restaura o valor definido pelo banco. Algumas mudanças são percebidas no próximo carregamento do CRM."}
      </div>
      {source === "whatsapp" && snapshot?.target && (
        <Typography variant="body2" color="text.secondary">
          Configurando: <strong>{snapshot.target.name}</strong>
          {snapshot.target.scope === "USER" &&
            (snapshot.target.inheritedSectorName
              ? ` · Herda do setor ${snapshot.target.inheritedSectorName}, da instância e do padrão.`
              : " · Sem setor WhatsApp vinculado; herda da instância e do padrão.")}
        </Typography>
      )}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
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
              <section
                key={group}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-700 dark:bg-slate-800 sm:px-5">
                  <Typography component="h2" variant="subtitle1" fontWeight={600}>
                    {group}
                  </Typography>
                  <Chip
                    label={catalog.filter((setting) => setting.group === group).length}
                    size="small"
                  />
                </div>
                <div className="px-4 sm:px-5">
                  {catalog
                    .filter((setting) => setting.group === group)
                    .map((setting) => (
                      <ParameterSettingControl
                        key={setting.key}
                        setting={setting}
                        source={source}
                        scoped={
                          source === "whatsapp" &&
                          target?.scope !== undefined &&
                          target.scope !== "INSTANCE"
                        }
                        inherited={snapshot.inherited?.[setting.key]}
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
                </div>
              </section>
            ))}
            {!catalog.length && (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <Typography color="text.secondary">
                  {snapshot.catalog.length
                    ? "Nenhuma configuração encontrada para esta busca."
                    : "Nenhuma das configurações suportadas está disponível nesta instância."}
                </Typography>
              </div>
            )}
            <div className="sticky bottom-0 z-10 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
            </div>
          </>
        )
      )}
    </div>
  );
}
