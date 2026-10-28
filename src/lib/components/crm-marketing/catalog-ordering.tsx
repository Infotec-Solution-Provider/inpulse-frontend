"use client";
import {
  Alert,
  Button,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { crmError } from "@/lib/crm-marketing-form";
import type {
  CatalogOrderKind,
  CatalogOrderSnapshot,
} from "@/lib/sdk-local/types/crm-marketing.types";
import { useCrmMutation, useCrmSession } from "./shared";
import { VisualOrderList, type VisualOrderItem } from "./visual-order-list";

export function CatalogOrderingPanel({
  kind,
  active,
}: {
  kind: CatalogOrderKind;
  active: boolean;
}) {
  const { client } = useCrmSession(),
    mutation = useCrmMutation();
  const [original, setOriginal] = useState<CatalogOrderSnapshot | null>(null),
    [draft, setDraft] = useState<VisualOrderItem[]>([]),
    [scope, setScope] = useState(kind === "cities" ? "national" : "all"),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const originalRef = useRef(original),
    draftRef = useRef(draft),
    started = useRef(0),
    mounted = useRef(true),
    current = useRef(client),
    scopeRef = useRef(scope),
    busyRef = useRef(false),
    gateRef = useRef(false);
  originalRef.current = original;
  draftRef.current = draft;
  current.current = client;
  scopeRef.current = scope;
  busyRef.current = mutation.busy;
  gateRef.current = mutation.gate;
  const dirty = Boolean(
    original &&
      JSON.stringify(draft.map((item) => item.id)) !==
        JSON.stringify(original.items.map((item) => item.id)),
  );
  useCrmLeaveGuard(dirty, mutation.busy, mutation.gate);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      started.current++;
    };
  }, []);
  async function load(nextScope = scope, explicit = false) {
    const id = ++started.current,
      pinned = client;
    setLoading(true);
    setError("");
    try {
      const value = await pinned.catalogOrdering(kind, nextScope);
      if (!mounted.current || id !== started.current || current.current !== pinned) return;
      setOriginal(value);
      setDraft(value.items);
      setScope(nextScope);
      mutation.reconcile();
      if (explicit) mutation.setSuccess("Lista conferida. Revise as prioridades antes de salvar.");
    } catch (failure) {
      if (mounted.current && id === started.current && current.current === pinned)
        setError(crmError(failure).message);
    } finally {
      if (mounted.current && id === started.current) setLoading(false);
    }
  }
  useEffect(() => {
    // Token renewal must preserve a pending draft or an uncertain write.
    if (!active || gateRef.current) return;
    if (
      originalRef.current &&
      (busyRef.current ||
        JSON.stringify(draftRef.current.map((item) => item.id)) !==
          JSON.stringify(originalRef.current.items.map((item) => item.id)))
    )
      return;
    void load(scopeRef.current);
    return () => {
      started.current++;
    };
    // The current client is intentionally pinned for every request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, active]);
  function reload(nextScope = scope) {
    if (mutation.busy) return;
    if (dirty && !window.confirm("Descartar os movimentos não salvos e recarregar esta lista?"))
      return;
    void load(nextScope, true);
  }
  async function save() {
    if (!original || loading || error) return;
    const result = await mutation.write(() =>
      client.saveCatalogOrdering(kind, {
        scope,
        ids: draft.map((item) => item.id),
        revision: original.revision,
      }),
    );
    if (result) {
      setOriginal(result.value);
      setDraft(result.value.items);
      mutation.setSuccess("Prioridades salvas. Posições numeradas de 1 em diante.");
    }
  }
  const disabled = mutation.busy || mutation.gate || loading || Boolean(error);
  const normalized = original?.items.every((item, index) => item.storedOrder === index + 1) ?? true;
  return (
    <Stack gap={2}>
      {loading && <LinearProgress aria-label="Carregando prioridades" />}
      {error && <Alert severity="error">{error}</Alert>}
      {mutation.error && <Alert severity="error">{mutation.error}</Alert>}
      {mutation.success && <Alert severity="success">{mutation.success}</Alert>}
      {kind === "cities" && original && (
        <>
          <TextField
            select
            size="small"
            label="Lista de cidades"
            value={scope}
            disabled={mutation.busy || loading || mutation.gate}
            onChange={(event) => reload(event.target.value)}
          >
            <MenuItem value="national">Ordem nacional — todas as cidades</MenuItem>
            {original.states.map((state) => (
              <MenuItem key={state.id} value={state.id}>
                {state.id} — {state.name}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="body2">
            Modo em uso:{" "}
            {original.cityMode === "S"
              ? "ordem nacional"
              : original.cityMode === "N"
                ? "por estado"
                : "configuração histórica"}
            . Altere o modo na área Critérios. As duas sequências são preservadas.
          </Typography>
          {original.invalidUfCount > 0 && (
            <Alert severity="warning">
              {original.invalidUfCount} cidades têm UF inválida. Elas aparecem na lista nacional;
              corrija o cadastro para organizá-las por estado.
            </Alert>
          )}
        </>
      )}
      <Typography variant="body2">
        O primeiro item tem maior prioridade. Ao salvar, toda esta lista recebe posições
        consecutivas; os demais dados são preservados.
      </Typography>
      {dirty && <Alert severity="info">Há movimentos não salvos nesta lista.</Alert>}
      {original && (
        <VisualOrderList
          items={draft}
          disabled={disabled}
          onChange={(items) => {
            setDraft(items);
            mutation.setSuccess("");
          }}
        />
      )}
      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Button disabled={mutation.busy || loading} onClick={() => reload()}>
          {mutation.gate ? "Conferir lista" : "Recarregar"}
        </Button>
        <Button
          disabled={disabled || !dirty}
          onClick={() => {
            setDraft(original?.items ?? []);
            mutation.setSuccess("");
          }}
        >
          Desfazer movimentos
        </Button>
        <Button
          variant="contained"
          disabled={disabled || !original || (!dirty && normalized)}
          onClick={() => void save()}
        >
          {mutation.busy ? "Salvando…" : "Salvar prioridades"}
        </Button>
      </Stack>
    </Stack>
  );
}
