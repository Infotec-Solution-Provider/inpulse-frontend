"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import parameterSettingsService from "@/lib/services/parameter-settings.service";
import { ParameterSettingsPanel } from "./parameter-settings-panel";
import type { ParameterScope, ParameterTarget, ParameterTargets } from "./parameter-settings.types";

const identity = (target: ParameterTarget) =>
  `${target.scope}:${target.sectorId ?? target.userId ?? ""}`;

export function WhatsappParameterSettings({ onSaved }: { onSaved: () => Promise<void> }) {
  const [target, setTarget] = useState<ParameterTarget>({ scope: "INSTANCE" });
  const [pendingTarget, setPendingTarget] = useState<ParameterTarget | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState<ParameterTargets | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selections, setSelections] = useState<Record<string, { id: number; name: string }>>({});

  useEffect(() => {
    if (target.scope === "INSTANCE") {
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setTargets(null);
    setError(null);
    const timer = window.setTimeout(() => {
      void parameterSettingsService
        .getTargets(target.scope as "SECTOR" | "USER", search, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setTargets(data);
        })
        .catch((err) => {
          if (!controller.signal.aborted)
            setError(
              err instanceof Error ? err.message : "Não foi possível carregar setores e usuários.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [target.scope, search, retry]);

  const apply = (next: ParameterTarget) => {
    setDirty(false);
    if (next.scope !== target.scope) {
      setSearch("");
      setTargets(null);
    }
    setTarget(next);
    setPendingTarget(null);
  };
  const choose = (next: ParameterTarget) => {
    if (saving || identity(next) === identity(target)) return;
    if (dirty) setPendingTarget(next);
    else apply(next);
  };
  const ready =
    target.scope === "INSTANCE" ||
    (target.scope === "SECTOR" ? !!target.sectorId : !!target.userId);
  const options = target.scope === "SECTOR" ? (targets?.sectors ?? []) : (targets?.users ?? []);
  const currentId = target.sectorId ?? target.userId;
  const currentOption =
    options.find((option) => option.id === currentId) ?? selections[identity(target)] ?? null;

  return (
    <div className="space-y-5">
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Typography fontWeight={600} sx={{ mb: 2 }}>
          Aplicar configurações para
        </Typography>
        <div className="flex flex-col gap-3 sm:flex-row">
          <TextField
            select
            label="Escopo"
            size="small"
            value={target.scope}
            disabled={saving}
            sx={{ width: { xs: "100%", sm: 220 } }}
            slotProps={{
              select: {
                SelectDisplayProps: { "aria-label": "Escopo", "aria-labelledby": undefined },
              },
            }}
            onChange={(event) => choose({ scope: event.target.value as ParameterScope })}
          >
            <MenuItem value="INSTANCE">Instância</MenuItem>
            <MenuItem value="SECTOR">Setor</MenuItem>
            <MenuItem value="USER">Usuário</MenuItem>
          </TextField>
          {target.scope !== "INSTANCE" && (
            <Autocomplete
              options={options}
              value={currentOption}
              disabled={saving}
              loading={loading}
              sx={{ flex: 1, minWidth: 0 }}
              size="small"
              getOptionLabel={(option) =>
                `${option.name} (#${option.id})${"active" in option && !option.active ? " · Inativo" : ""}`
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={target.scope === "USER" ? (options) => options : undefined}
              onInputChange={(_, value, reason) => {
                if (reason === "input" || reason === "clear") setSearch(value);
              }}
              onChange={(_, option) => {
                const next: ParameterTarget =
                  target.scope === "SECTOR"
                    ? { scope: "SECTOR", ...(option ? { sectorId: option.id } : {}) }
                    : { scope: "USER", ...(option ? { userId: option.id } : {}) };
                if (option) setSelections((current) => ({ ...current, [identity(next)]: option }));
                choose(next);
              }}
              noOptionsText={loading ? "Carregando..." : "Nenhum resultado"}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={target.scope === "SECTOR" ? "Setor" : "Usuário"}
                  helperText={
                    target.scope === "USER"
                      ? targets?.hasMoreUsers
                        ? "Há mais usuários. Busque pelo nome ou código para refinar."
                        : "Busque pelo nome ou código do usuário."
                      : "Selecione um setor da instância."
                  }
                />
              )}
            />
          )}
        </div>
        {loading && (
          <CircularProgress size={18} sx={{ mt: 2 }} aria-label="Carregando setores e usuários" />
        )}
        {error && (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
            action={
              <Button color="inherit" onClick={() => setRetry((value) => value + 1)}>
                Tentar novamente
              </Button>
            }
          >
            {error}
          </Alert>
        )}
      </Paper>
      {ready ? (
        <ParameterSettingsPanel
          key={identity(target)}
          source="whatsapp"
          target={target}
          onSaved={onSaved}
          onDirtyChange={setDirty}
          onSavingChange={setSaving}
        />
      ) : (
        <Alert severity="info">
          Selecione {target.scope === "SECTOR" ? "um setor" : "um usuário"} para consultar e
          configurar seus parâmetros.
        </Alert>
      )}
      <Dialog open={!!pendingTarget} onClose={() => setPendingTarget(null)}>
        <DialogTitle>Alterações pendentes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Há alterações que ainda não foram salvas. Deseja descartá-las para mudar o escopo ou a
            seleção?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingTarget(null)}>Continuar editando</Button>
          <Button color="warning" onClick={() => pendingTarget && apply(pendingTarget)}>
            Descartar e trocar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
