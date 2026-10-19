"use client";

import { useAuthContext } from "@/app/auth-context";
import customersService from "@/lib/services/customers.service";
import { subscribeCustomerSegmentsChanged } from "@/lib/customer-segments-events";
import { getCustomerSegmentsError } from "@/lib/customer-segments-error";
import type { CustomerLookupOption, CustomerSegmentAssignment } from "@/lib/sdk-local";
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

interface Props {
  customerId: number;
  segmentId: number | null;
  segmentName: string | null;
  canEdit: boolean;
  reloadRequired?: boolean;
  onRequireReload?: () => void;
  onSaved: (assignment: CustomerSegmentAssignment) => void;
  onReload: () => Promise<void>;
}

function errorDetails(error: unknown): { message: string; needsReload: boolean } {
  const candidate = error as { message?: string };
  const { status } = getCustomerSegmentsError(error);
  return {
    message: candidate?.message || "Não foi possível atualizar o segmento.",
    needsReload: status === 401 || status === 409 || (status !== undefined && status >= 500) || !status,
  };
}

export default function CustomerSegmentSelector({
  customerId,
  segmentId,
  segmentName,
  canEdit,
  reloadRequired = false,
  onRequireReload,
  onSaved,
  onReload,
}: Props) {
  const { token, instance, user } = useAuthContext();
  const [options, setOptions] = useState<CustomerLookupOption[]>([]);
  const [selected, setSelected] = useState<CustomerLookupOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localReloadRequired, setNeedsReload] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);
  const pendingContext = useRef<{ customerId: number; instance: string; epoch: number } | null>(
    null,
  );
  const epoch = useRef(0);
  const editable = canEdit && user?.NIVEL === "ADMIN" && customerId > 0;
  const needsReload = reloadRequired || localReloadRequired;

  useEffect(() => {
    epoch.current += 1;
    setSelected(segmentId === null ? null : { CODIGO: segmentId, NOME: segmentName });
    const pending =
      pendingContext.current?.customerId === customerId &&
      pendingContext.current?.instance === instance;
    setError(null);
    setNeedsReload(pending);
    setSaving(false);
    setReloading(false);
    setClearOpen(false);
    if (pending) onRequireReload?.();
    return () => {
      epoch.current += 1;
    };
  }, [customerId, instance, token, segmentId, segmentName]);

  useEffect(
    () => subscribeCustomerSegmentsChanged(instance, () => setCatalogVersion((value) => value + 1)),
    [instance],
  );
  useEffect(() => {
    if (!editable || !token) {
      setOptions([]);
      setLoading(false);
      return;
    }
    let active = true;
    setOptions([]);
    setLoading(true);
    customersService.setAuth(token);
    customersService
      .getSegments({ token, instance })
      .then((rows) => {
        if (active) {
          setOptions(rows.filter((row) => Number.isInteger(row.CODIGO) && row.CODIGO > 0));
          setSelected((current) =>
            current ? (rows.find((row) => row.CODIGO === current.CODIGO) ?? current) : null,
          );
        }
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar os segmentos. Recarregue as opções.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [editable, token, instance, catalogVersion]);

  const save = async (target: number | null) => {
    if (
      !token ||
      !editable ||
      (target !== null && target <= 0) ||
      target === segmentId ||
      saving ||
      needsReload
    )
      return;
    const requestEpoch = epoch.current;
    pendingContext.current = { customerId, instance, epoch: requestEpoch };
    setSaving(true);
    setError(null);
    customersService.setAuth(token);
    try {
      const response = await customersService.setCustomerSegment(customerId, {
        SEGMENTO: target,
        expected: { SEGMENTO: segmentId },
      }, { token, instance });
      if (requestEpoch !== epoch.current) return;
      if (
        response.data.CODIGO !== customerId ||
        response.data.SEGMENTO !== target ||
        (target === null
          ? response.data.segment !== null
          : response.data.segment?.CODIGO !== target)
      )
        throw new Error("Não foi possível confirmar o segmento salvo. Recarregue o cliente.");
      pendingContext.current = null;
      onSaved(response.data);
    } catch (cause) {
      if (requestEpoch !== epoch.current) return;
      const details = errorDetails(cause);
      setError(details.message);
      setNeedsReload(details.needsReload);
      if (details.needsReload) onRequireReload?.();
    } finally {
      if (pendingContext.current?.epoch === requestEpoch) pendingContext.current = null;
      if (requestEpoch === epoch.current) setSaving(false);
    }
  };

  const reload = async () => {
    const requestEpoch = epoch.current;
    setReloading(true);
    try {
      await onReload();
      if (requestEpoch !== epoch.current) return;
      setSelected(segmentId === null ? null : { CODIGO: segmentId, NOME: segmentName });
      setNeedsReload(false);
      setError(null);
      setCatalogVersion((value) => value + 1);
    } catch {
      if (requestEpoch === epoch.current)
        setError("Não foi possível recarregar o cliente. Tente novamente.");
    } finally {
      if (requestEpoch === epoch.current) setReloading(false);
    }
  };

  if (!editable)
    return (
      <TextField
        label="Segmento"
        value={segmentName ?? (segmentId === null ? "—" : `Código ${segmentId}`)}
        slotProps={{ input: { readOnly: true } }}
      />
    );
  const list =
    selected && !options.some((option) => option.CODIGO === selected.CODIGO)
      ? [selected, ...options]
      : options;
  return (
    <div className="grid gap-2">
      <Autocomplete
        options={list}
        value={selected}
        loading={loading}
        disableClearable={selected !== null}
        disabled={saving || reloading || needsReload}
        getOptionLabel={(option) => `${option.NOME ?? "Sem nome"} (${option.CODIGO})`}
        isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO}
        getOptionDisabled={(option) =>
          option.CODIGO <= 0 || !options.some((current) => current.CODIGO === option.CODIGO)
        }
        onChange={(_event, value) => setSelected(value)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Segmento"
            helperText={loading ? "Carregando segmentos…" : undefined}
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading && <CircularProgress size={16} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
      {(error || needsReload) && (
        <Alert severity={needsReload ? "warning" : "error"}>
          {error || "Recarregue os dados do cliente para confirmar o segmento antes de salvar."}
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="small"
          variant="outlined"
          onClick={() => selected && void save(selected.CODIGO)}
          disabled={
            saving ||
            loading ||
            reloading ||
            needsReload ||
            !selected ||
            selected.CODIGO <= 0 ||
            selected.CODIGO === segmentId ||
            !options.some((option) => option.CODIGO === selected.CODIGO)
          }
        >
          {saving ? "Salvando…" : "Salvar segmento"}
        </Button>
        <Button
          size="small"
          color="error"
          disabled={saving || loading || reloading || needsReload || segmentId === null}
          onClick={() => setClearOpen(true)}
        >
          Remover segmento
        </Button>
        {needsReload ? (
          <Button size="small" disabled={reloading} onClick={reload}>
            {reloading ? "Recarregando…" : "Recarregar cliente"}
          </Button>
        ) : (
          <Button
            size="small"
            disabled={loading || saving || reloading}
            onClick={() => {
              setError(null);
              setCatalogVersion((value) => value + 1);
            }}
          >
            Atualizar opções
          </Button>
        )}
      </div>
      <Dialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        aria-labelledby="clear-segment-title"
      >
        <DialogTitle id="clear-segment-title">Remover segmento do cliente?</DialogTitle>
        <DialogContent>
          O cliente ficará sem segmento. O cadastro do segmento será preservado.
        </DialogContent>
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
    </div>
  );
}
