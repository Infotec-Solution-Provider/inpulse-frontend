"use client";
import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import {
  crmDraft,
  crmExpected,
  crmLabels,
  crmPayload,
  type CrmDraft,
} from "@/lib/crm-marketing-form";
import type {
  CrmMarketingField,
  CrmMarketingRecord,
} from "@/lib/sdk-local/types/crm-marketing.types";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { CrmLookup, NullableCrmField, useCrmMutation, useCrmSession } from "./shared";
import { cycleLabels } from "./campaign-common";

/** The same editor serves the unit and the cross-unit entry point. */
export default function CampaignEditor({
  original,
  unitId,
  unitName,
  usedTypes = [],
  renameReason,
  onSaved,
  onCancel,
}: {
  original?: CrmMarketingRecord;
  unitId?: number;
  unitName?: string | null;
  usedTypes?: string[];
  renameReason?: string;
  onSaved: (record: CrmMarketingRecord) => void;
  onCancel: () => void;
}) {
  const { client } = useCrmSession(),
    mutation = useCrmMutation();
  const base = useRef(original).current,
    currentClient = useRef(client);
  currentClient.current = client;
  const attempt = useRef<{ baseline: number[]; name: string; unit: number } | null>(null);
  const [reconciling, setReconciling] = useState(false),
    [candidates, setCandidates] = useState<CrmMarketingRecord[]>([]);
  const [fields, setFields] = useState<CrmMarketingField[]>([]),
    [draft, setDraft] = useState<CrmDraft>({}),
    [initial, setInitial] = useState<CrmDraft>({}),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null),
    seeded = useRef(false);
  const [mode, setMode] = useState("audience-manual");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const occupiedTypes = unitId === undefined ? selectedTypes : usedTypes;
  const [unitNames, setUnitNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (original || unitId !== undefined || !draft.UNIDADE) return;
    let active = true;
    void client
      .unit(Number(draft.UNIDADE))
      .then((detail) => {
        if (!active) return;
        const types = detail.campaigns.map((c) => String(c.TIPO));
        setSelectedTypes(types);
        setDraft((current) =>
          types.includes(current.TIPO ?? "")
            ? { ...current, TIPO: Object.keys(cycleLabels).find((t) => !types.includes(t)) ?? null }
            : current,
        );
      })
      .catch(() => {
        if (active) setSelectedTypes([]);
      });
    return () => {
      active = false;
    };
  }, [client, draft.UNIDADE, original, unitId]);
  useEffect(() => {
    let active = true;
    void client
      .units()
      .then((result) => {
        if (active)
          setUnitNames(
            Object.fromEntries(
              result.data.map((unit) => [String(unit.CODIGO), unit.DESCRICAO ?? ""]),
            ),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [client]);
  useEffect(() => {
    let active = true;
    void client
      .schema("campaigns")
      .then(({ fields }) => {
        if (!active) return;
        setFields(fields);
        if (!seeded.current) {
          const next = crmDraft(fields, base);
          if (!original) {
            next.PAUSADA = "SIM";
            next.UNIDADE = unitId === undefined ? null : String(unitId);
            next.TIPO = Object.keys(cycleLabels).find((t) => !usedTypes.includes(t)) ?? null;
          }
          setDraft(next);
          setInitial(next);
          seeded.current = true;
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoadError("Não foi possível abrir os dados da campanha.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [client]);
  const dirty =
      JSON.stringify(draft) !== JSON.stringify(initial) ||
      (!original && mode !== "audience-manual"),
    locked = loading || mutation.busy || mutation.gate || reconciling;
  const selectedUnitName = unitName ?? unitNames[draft.UNIDADE ?? ""],
    canonicalName = selectedUnitName && draft.TIPO ? `${selectedUnitName} - ${draft.TIPO}` : "",
    displayName = !original && mode === "purchase-cycle" ? canonicalName : (draft.NOME ?? "");
  useCrmLeaveGuard(dirty, mutation.busy, mutation.gate);
  useEffect(() => {
    if (mutation.error) errorRef.current?.focus();
  }, [mutation.error]);
  const change = (key: string, value: string | null) =>
    setDraft((current) => ({ ...current, [key]: value }));
  async function save() {
    try {
      const payload = crmPayload(fields, { ...draft, NOME: displayName, CODIGO: "1" }, base);
      delete payload.CODIGO;
      if (!original) {
        if (draft.UNIDADE == null) throw new Error("Selecione a unidade da campanha.");
        payload.PAUSADA = "SIM";
        if (mode === "audience-manual") {
          payload.operationMode = mode;
          payload.organizationalUnitId = Number(draft.UNIDADE);
          payload.UNIDADE = null;
          payload.TIPO = null;
        }
      }
      if (!Object.keys(payload).length) {
        onCancel();
        return;
      }
      const result = await mutation.write(async () =>
        original
          ? client.patch("campaigns", original.CODIGO, {
              changes: payload,
              expected: crmExpected(fields, base!),
            })
          : (async () => {
              const before = await client.list("campaigns", {
                NOME: displayName,
                UNIDADE: String(draft.UNIDADE),
                page: 1,
                perPage: 100,
              });
              if (before.page.totalRows > 100)
                throw new Error(
                  "Refine o nome da campanha antes de criar; há muitos cadastros com nome semelhante.",
                );
              attempt.current = {
                baseline: before.data.map((row) => row.CODIGO),
                name: displayName,
                unit: Number(draft.UNIDADE),
              };
              return client.create("campaigns", payload);
            })(),
      );
      if (result) {
        setInitial(draft);
        onSaved(result.value);
      }
    } catch (error) {
      mutation.setError(error instanceof Error ? error.message : "Confira os campos.");
    }
  }
  async function reconcile(candidate?: CrmMarketingRecord) {
    const started = client;
    setReconciling(true);
    try {
      if (base || candidate) {
        const record = await client.detail("campaigns", (base ?? candidate)!.CODIGO);
        if (currentClient.current !== started) return;
        if (base) onCancel();
        else onSaved(record);
      } else if (attempt.current) {
        const snapshot = attempt.current;
        const response = await client.list("campaigns", {
          NOME: snapshot.name,
          UNIDADE: String(snapshot.unit),
          page: 1,
          perPage: 100,
        });
        if (currentClient.current !== started) return;
        const matches = response.data.filter(
          (row) => !snapshot.baseline.includes(row.CODIGO) && row.NOME === snapshot.name,
        );
        setCandidates(matches);
        mutation.setError(
          matches.length
            ? "Confira abaixo o cadastro encontrado. A criação permanece bloqueada até abrir o resultado."
            : "O resultado ainda não foi localizado. A criação permanece bloqueada para evitar repetição.",
        );
      } else
        mutation.setError(
          "Não foi possível identificar a solicitação. Confira os cadastros gravados antes de iniciar uma nova criação.",
        );
    } catch (error) {
      mutation.setError(
        error instanceof Error ? error.message : "Não foi possível conferir o resultado.",
      );
    } finally {
      setReconciling(false);
    }
  }
  const advanced = fields.filter(
    (field) =>
      !field.readOnly &&
      ![
        "CODIGO",
        "NOME",
        "DESCRICAO",
        "TIPO",
        "UNIDADE",
        "PAUSADA",
        "PRIORIDADE",
        "SQL_CAMPANHA",
        "GERADO_LISTA",
      ].includes(field.key),
  );
  return (
    <Stack
      component="form"
      gap={2}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      sx={{ maxWidth: 820 }}
    >
      {loading && <LinearProgress aria-label="Carregando dados da campanha" />}
      {loadError && <Alert severity="error">{loadError}</Alert>}
      {mutation.error && (
        <Alert severity="error" ref={errorRef} tabIndex={-1}>
          {mutation.error}
        </Alert>
      )}
      {mutation.gate && (
        <Alert severity="warning">
          Confira a campanha gravada antes de tentar novamente. Seu texto foi preservado.{" "}
          <Button disabled={reconciling} onClick={() => void reconcile()}>
            Conferir campanha
          </Button>
        </Alert>
      )}
      {candidates.map((record) => (
        <Button
          key={record.CODIGO}
          variant="outlined"
          disabled={reconciling}
          onClick={() => void reconcile(record)}
        >
          Abrir resultado: {record.NOME} · código {record.CODIGO}
        </Button>
      ))}
      {unitName && <Typography color="text.secondary">Unidade: {unitName}</Typography>}
      <TextField
        required
        autoFocus
        label="Nome da campanha"
        value={displayName}
        disabled={locked || Boolean(renameReason) || (!original && mode === "purchase-cycle")}
        onChange={(e) => change("NOME", e.target.value)}
        inputProps={{ maxLength: 150 }}
        helperText={
          renameReason ||
          (!original && mode === "purchase-cycle"
            ? "O nome do ciclo é gerado pela unidade e pelo papel para manter a compatibilidade do CRM."
            : undefined)
        }
      />
      {!original && (
        <>
          {unitId === undefined && (
            <CrmLookup
              kind="units"
              label="Unidade da campanha"
              value={draft.UNIDADE ?? null}
              disabled={locked}
              onChange={(v) => change("UNIDADE", typeof v === "string" ? v : null)}
            />
          )}
          <TextField
            select
            label="Forma de operação"
            value={mode}
            disabled={locked}
            onChange={(e) => setMode(e.target.value)}
          >
            <MenuItem value="audience-manual">Público definido · geração manual</MenuItem>
            <MenuItem
              value="purchase-cycle"
              disabled={Object.keys(cycleLabels).every((type) => occupiedTypes.includes(type))}
            >
              Ciclo de compra
            </MenuItem>
          </TextField>
          {mode === "purchase-cycle" && (
            <TextField
              select
              label="Papel no ciclo de compra"
              value={draft.TIPO ?? ""}
              disabled={locked}
              onChange={(e) => change("TIPO", e.target.value)}
              helperText="O papel define o comportamento do ciclo de compra. Cada papel pode aparecer uma vez na unidade."
            >
              {Object.entries(cycleLabels)
                .filter(([type]) => !occupiedTypes.includes(type))
                .map(([type, name]) => (
                  <MenuItem key={type} value={type}>
                    {name}
                  </MenuItem>
                ))}
            </TextField>
          )}
          {mode === "audience-manual" && (
            <Typography variant="body2" color="text.secondary">
              Defina o público após criar. Um cliente pode participar de mais de uma campanha. O
              responsável é escolhido em cada lote; alterações afetam as próximas gerações.
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            A campanha será criada pausada. Depois, configure seu público e prepare os agendamentos.
          </Typography>
        </>
      )}
      {fields.some((f) => f.key === "DESCRICAO") && (
        <TextField
          label="Descrição"
          multiline
          minRows={3}
          value={draft.DESCRICAO ?? ""}
          disabled={locked}
          onChange={(e) => change("DESCRICAO", e.target.value)}
          inputProps={{ maxLength: fields.find((f) => f.key === "DESCRICAO")?.maxLength ?? 65535 }}
        />
      )}
      {!!advanced.length && (
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Configurações avançadas</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}
            >
              {advanced.map((field) => (
                <NullableCrmField
                  key={field.key}
                  field={field}
                  label={crmLabels[field.key] ?? field.key}
                  value={draft[field.key] ?? null}
                  onChange={(v) => change(field.key, v)}
                  disabled={locked}
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
      {dirty && (
        <Typography variant="caption" color="text.secondary">
          Alterações não salvas
        </Typography>
      )}
      <Stack direction="row" gap={1} justifyContent="flex-end" flexWrap="wrap">
        <Button
          disabled={mutation.busy || mutation.gate}
          onClick={() => {
            if (!dirty || window.confirm("Descartar alterações não salvas?")) onCancel();
          }}
        >
          Cancelar
        </Button>
        <Button variant="contained" type="submit" disabled={locked || !displayName.trim()}>
          {mutation.busy ? "Salvando…" : original ? "Salvar alterações" : "Criar campanha"}
        </Button>
      </Stack>
    </Stack>
  );
}
