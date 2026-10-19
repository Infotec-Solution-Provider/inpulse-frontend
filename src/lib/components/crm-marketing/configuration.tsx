"use client";
import { crmError, initialSelection } from "@/lib/crm-marketing-form";
import type {
  CrmCampaignConfiguration,
  CrmSelectionCriteria,
  CrmSelectionPreview,
} from "@/lib/sdk-local/types/crm-marketing.types";
import { ExpandMore, PreviewOutlined, Refresh, SaveOutlined } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import {
  CrmLookup,
  CrmMarketingFrame,
  useCrmMutation,
  useCrmSession,
  type LookupKind,
} from "./shared";
import GenerationPanel from "./generation";
import CampaignMembers from "./campaign-members";

export default function CrmConfigurationPage({ campaignId }: { campaignId: number }) {
  return (
    <CrmMarketingFrame title={`Configurar campanha ${campaignId}`}>
      <ConfigurationPanel key={campaignId} campaignId={campaignId} />
    </CrmMarketingFrame>
  );
}
export function ConfigurationPanel({ campaignId }: { campaignId: number }) {
  const { client } = useCrmSession(),
    current = useRef(client),
    mutation = useCrmMutation();
  current.current = client;
  const [original, setOriginal] = useState<CrmCampaignConfiguration | null>(null),
    [criteria, setCriteria] = useState<CrmSelectionCriteria>(initialSelection),
    [preview, setPreview] = useState<CrmSelectionPreview | null>(null),
    [loading, setLoading] = useState(true),
    [previewing, setPreviewing] = useState(false),
    [loadError, setLoadError] = useState(""),
    [reload, setReload] = useState(0);
  const sequence = useRef(0),
    alive = useRef(true),
    explicitReload = useRef(false);
  const originalRef = useRef(original),
    criteriaRef = useRef(criteria);
  originalRef.current = original;
  criteriaRef.current = criteria;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      sequence.current++;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setPreview(null);
    sequence.current++;
    void client
      .configuration(campaignId)
      .then((data) => {
        if (!active) return;
        if (
          explicitReload.current ||
          !originalRef.current ||
          JSON.stringify(criteriaRef.current) ===
            JSON.stringify(originalRef.current.criteria ?? initialSelection)
        ) {
          setOriginal(data);
          setCriteria(data.criteria ?? { ...initialSelection });
        }
        if (explicitReload.current) {
          mutation.reconcile();
          explicitReload.current = false;
          mutation.setSuccess(
            "Configuração recarregada. Confira os critérios e gere uma nova prévia.",
          );
        }
      })
      .catch((error) => {
        if (active) setLoadError(crmError(error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, campaignId, reload]);
  function change(next: Partial<CrmSelectionCriteria>) {
    sequence.current++;
    setPreview(null);
    setPreviewing(false);
    setCriteria((current) => ({ ...current, ...next }));
    mutation.setSuccess("");
  }
  async function showPreview() {
    const version = ++sequence.current,
      started = client;
    setPreviewing(true);
    mutation.setError("");
    try {
      const result = await client.preview(criteria);
      if (alive.current && sequence.current === version && started === current.current)
        setPreview(result);
    } catch (error) {
      if (alive.current && sequence.current === version) mutation.setError(crmError(error).message);
    } finally {
      if (alive.current && sequence.current === version) setPreviewing(false);
    }
  }
  async function save() {
    if (!original || !preview || JSON.stringify(preview.criteria) !== JSON.stringify(criteria))
      return;
    const result = await mutation.write(() =>
      client.configure(campaignId, criteria, {
        SQL_CAMPANHA: original.SQL_CAMPANHA,
        GERADO_LISTA: original.GERADO_LISTA,
      }),
    );
    if (result) {
      setOriginal(result.value);
      setCriteria(result.value.criteria ?? criteria);
      mutation.setSuccess("Critérios salvos. A lista está marcada para geração.");
    }
  }
  function reloadConfiguration() {
    if (
      original &&
      JSON.stringify(criteria) !== JSON.stringify(original.criteria ?? initialSelection) &&
      !window.confirm(
        "Recarregar a configuração descarta os critérios ainda não salvos. Continuar?",
      )
    )
      return;
    explicitReload.current = true;
    setReload((value) => value + 1);
  }
  const disabled = loading || mutation.busy || mutation.gate,
    multi: {
      key: "segmentIds" | "groupIds" | "originIds" | "operatorIds";
      kind: LookupKind;
      label: string;
    }[] = [
      { key: "segmentIds", kind: "segments", label: "Segmentos" },
      { key: "groupIds", kind: "groups", label: "Grupos de clientes" },
      { key: "originIds", kind: "origins", label: "Origens" },
      { key: "operatorIds", kind: "operators", label: "Usuários responsáveis" },
    ];
  if (!Number.isSafeInteger(campaignId) || campaignId < -2147483648 || campaignId > 2147483647)
    return <Alert severity="error">Código de campanha inválido.</Alert>;
  return (
    <Stack gap={2}>
      {loading && <LinearProgress aria-label="Carregando configuração" />}
      {loadError && <Alert severity="error">{loadError}</Alert>}
      {mutation.error && <Alert severity="error">{mutation.error}</Alert>}
      {mutation.success && <Alert severity="success">{mutation.success}</Alert>}
      {original && !original.managed && original.SQL_CAMPANHA && (
        <Alert severity="info">
          Esta campanha usa uma seleção anterior. Os novos critérios substituirão essa seleção ao
          salvar. Confira a prévia do público.
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" mb={2}>
          Quem participa da campanha
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <TextField
            select
            label="Situação dos clientes"
            value={criteria.active}
            disabled={disabled}
            onChange={(event) =>
              change({ active: event.target.value as CrmSelectionCriteria["active"] })
            }
          >
            <MenuItem value="SIM">Ativos</MenuItem>
            <MenuItem value="NAO">Inativos</MenuItem>
            <MenuItem value="all">Todos</MenuItem>
          </TextField>
          <CrmLookup
            kind="units"
            label="Unidade"
            value={criteria.unitId === null ? null : String(criteria.unitId)}
            disabled={disabled}
            onChange={(value) =>
              change({ unitId: typeof value === "string" ? Number(value) : null })
            }
          />
          {multi.map((field) => (
            <CrmLookup
              key={field.key}
              kind={field.kind}
              label={field.label}
              multiple
              value={criteria[field.key].map(String)}
              disabled={disabled}
              onChange={(values) =>
                change({
                  [field.key]: Array.isArray(values)
                    ? values.map(Number).sort((a, b) => a - b)
                    : [],
                })
              }
            />
          ))}
          <CrmLookup
            kind="cities"
            label="Cidade"
            value={criteria.city}
            disabled={disabled}
            onChange={(value) => change({ city: typeof value === "string" ? value : null })}
          />
          <CrmLookup
            kind="states"
            label="Estado"
            value={criteria.state}
            disabled={disabled}
            onChange={(value) => change({ state: typeof value === "string" ? value : null })}
          />
        </Box>
        <Typography color="text.secondary" variant="body2" mt={2}>
          Campos vazios incluem todas as opções. As exceções globais de cidades, estados, clientes e
          segmentos são aplicadas ao público.
        </Typography>
      </Paper>
      <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
        <Button
          startIcon={<Refresh />}
          disabled={mutation.busy || loading}
          onClick={reloadConfiguration}
        >
          {mutation.gate ? "Conferir configuração" : "Recarregar configuração"}
        </Button>
        <Button
          startIcon={<PreviewOutlined />}
          disabled={disabled || previewing || !original}
          onClick={() => void showPreview()}
          variant="outlined"
        >
          {previewing ? "Consultando público…" : "Prévia do público"}
        </Button>
        <Button
          startIcon={<SaveOutlined />}
          disabled={
            disabled ||
            !original ||
            !preview ||
            JSON.stringify(preview.criteria) !== JSON.stringify(criteria)
          }
          variant="contained"
          onClick={() => void save()}
        >
          {mutation.busy ? "Salvando…" : "Salvar critérios"}
        </Button>
      </Stack>
      {preview && (
        <Alert severity="info">
          <Typography fontWeight={700}>
            {preview.totalRows.toLocaleString("pt-BR")} clientes na prévia
          </Typography>
          <Typography variant="body2">
            O público considera os dados atuais. Salvar os critérios prepara a configuração da
            campanha.
          </Typography>
        </Alert>
      )}
      <CampaignMembers campaignId={campaignId} />
      <GenerationPanel
        campaignId={campaignId}
        configuration={original}
        disabled={
          disabled ||
          JSON.stringify(criteria) !== JSON.stringify(original?.criteria ?? initialSelection)
        }
        onReload={() => setReload((value) => value + 1)}
      />
      {original?.SQL_CAMPANHA && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Consultar seleção salva</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
              value={original.SQL_CAMPANHA}
              slotProps={{ input: { readOnly: true } }}
              label="Consulta de seleção (somente leitura)"
            />
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
}
