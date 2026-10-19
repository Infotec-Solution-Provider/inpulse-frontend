"use client";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
import { getCustomerSegmentsError } from "@/lib/customer-segments-error";
import crmUsersService from "@/lib/services/crm-users.service";
import {
  Alert,
  Autocomplete,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
interface ShiftOption {
  CODIGO: number;
  DESCRICAO: string | null;
}

export default function CrmUserShiftSelector({
  userId,
  token,
  instance,
  onSaved,
  onBusyChange,
  onDirtyChange,
}: {
  userId: number;
  token: string;
  instance: string;
  onSaved?: () => void;
  onBusyChange?: (busy: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [original, setOriginal] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<ShiftOption | null>(null);
  const [options, setOptions] = useState<ShiftOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const [success, setSuccess] = useState("");
  useEffect(() => {
    onDirtyChange?.(loaded && (selected?.CODIGO ?? null) !== original);
  }, [loaded, selected?.CODIGO, original, onDirtyChange]);
  const alive = useRef(true);
  const activeToken = useRef(token);
  activeToken.current = token;
  const writing = useRef(false);
  const sequence = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const load = useCallback(
    async (confirm = false) => {
      const request = ++sequence.current;
      const auth = token;
      setLoading(true);
      try {
        const { data: user } = await crmUsersService.getUserShift(userId, {
          token: auth,
          instance,
        });
        if (!alive.current || request !== sequence.current || activeToken.current !== auth) return;
        if (user.CODIGO !== userId || (user.HORARIO !== null && !Number.isInteger(user.HORARIO)))
          throw new Error("Invalid user shift");
        setOriginal(user.HORARIO);
        setLoaded(true);
        setSelected(
          user.HORARIO === null
            ? null
            : { CODIGO: user.HORARIO, DESCRICAO: `Expediente #${user.HORARIO}` },
        );
        if (confirm && !writing.current) {
          setBlocked(false);
          setError("");
        }
      } catch {
        if (alive.current && request === sequence.current) {
          setError("Não foi possível carregar o expediente do usuário. Recarregue os dados.");
          setLoaded(false);
        }
      } finally {
        if (alive.current && request === sequence.current) setLoading(false);
      }
    },
    [token, userId],
  );
  useEffect(() => {
    if (writing.current) {
      setBlocked(true);
      setError("Sua sessão mudou durante a gravação. Recarregue o expediente antes de continuar.");
    }
    void load();
  }, [load]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      crmUsersService.setAuth(token);
      setOptionsError("");
      void crmUsersService
        .list(
          "shifts",
          { page: 1, perPage: 100, ...(search.trim() ? { DESCRICAO: search.trim() } : {}) },
          { token, instance },
        )
        .then((response) => {
          if (!active) return;
          setOptions(response.data.filter((row) => row.CODIGO > 0));
          setSelected((current) =>
            current
              ? (response.data.find((row) => row.CODIGO === current.CODIGO) ?? current)
              : null,
          );
        })
        .catch(() => {
          if (active)
            setOptionsError("Não foi possível buscar os expedientes. Tente buscar novamente.");
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, token]);
  const save = async (target: number | null) => {
    if (
      !loaded ||
      saving ||
      loading ||
      blocked ||
      target === original ||
      (target !== null && target <= 0)
    )
      return;
    const auth = token;
    writing.current = true;
    setSaving(true);
    onBusyChange?.(true);
    setError("");
    setSuccess("");
    crmUsersService.setAuth(auth);
    try {
      const response = await crmUsersService.setShift(
        userId,
        target,
        { HORARIO: original },
        { token: auth, instance },
      );
      if (!alive.current || activeToken.current !== auth) return;
      if (response.data.CODIGO !== userId || response.data.HORARIO !== target)
        throw new Error("Invalid assignment confirmation");
      setOriginal(target);
      setSuccess("Expediente atualizado.");
      if (target === null) setSelected(null);
      onSaved?.();
    } catch (failure) {
      if (!alive.current || activeToken.current !== auth) return;
      const { status, outcome } = getCustomerSegmentsError(failure);
      setBlocked(
        status === 401 ||
          status === 409 ||
          outcome === "UNKNOWN" ||
          status === undefined ||
          status >= 500,
      );
      setError(
        outcome === "UNKNOWN" || status === undefined || status >= 500
          ? "Não foi possível confirmar a gravação. Recarregue o expediente antes de tentar novamente."
          : "O usuário ou o expediente pode ter sido alterado. Recarregue os dados antes de continuar.",
      );
    } finally {
      writing.current = false;
      if (alive.current) {
        setSaving(false);
        onBusyChange?.(false);
      }
    }
  };
  const list =
    selected && !options.some((option) => option.CODIGO === selected.CODIGO)
      ? [selected, ...options]
      : options;
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1">Expediente do usuário</Typography>
      <Autocomplete
        options={list}
        value={selected}
        disableClearable={selected !== null}
        filterOptions={(value) => value}
        loading={loading}
        disabled={!loaded || saving || blocked}
        onChange={(_, value) => setSelected(value)}
        onInputChange={(_, value, reason) => {
          if (reason === "input") setSearch(value);
        }}
        getOptionLabel={(option) => `${option.DESCRICAO ?? "Sem descrição"} (${option.CODIGO})`}
        isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO}
        getOptionDisabled={(option) =>
          option.CODIGO <= 0 || !options.some((current) => current.CODIGO === option.CODIGO)
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Expediente"
            helperText={optionsError || "Busque pelo nome do expediente."}
            error={Boolean(optionsError)}
          />
        )}
      />
      {error && <Alert severity={blocked ? "warning" : "error"}>{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button
          variant="outlined"
          disabled={
            !loaded ||
            loading ||
            saving ||
            blocked ||
            !selected ||
            selected.CODIGO <= 0 ||
            selected.CODIGO === original ||
            !options.some((option) => option.CODIGO === selected.CODIGO)
          }
          onClick={() => selected && void save(selected.CODIGO)}
        >
          Salvar expediente
        </Button>
        <Button
          color="error"
          disabled={!loaded || loading || saving || blocked || original === null}
          onClick={() => setClearOpen(true)}
        >
          Remover expediente
        </Button>
        <Button disabled={loading || saving} onClick={() => void load(true)}>
          Recarregar expediente
        </Button>
      </Stack>
      <Dialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        aria-labelledby="clear-user-shift-title"
      >
        <DialogTitle id="clear-user-shift-title">Remover expediente do usuário?</DialogTitle>
        <DialogContent>O cadastro do expediente será preservado.</DialogContent>
        <DialogActions>
          <Button onClick={() => setClearOpen(false)}>Cancelar</Button>
          <Button
            color="error"
            onClick={() => {
              setClearOpen(false);
              void save(null);
            }}
          >
            Remover vínculo
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
