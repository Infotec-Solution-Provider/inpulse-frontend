"use client";
import { UiIcon } from "@/lib/ui-system";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { CatalogOrderingPanel } from "./catalog-ordering";
import { VisualOrderList } from "./visual-order-list";
import { Tabs, Tab } from "@mui/material";
import { crmError } from "@/lib/crm-marketing-form";
import type { CrmOrderCriterion, CrmOrdering } from "@/lib/sdk-local/types/crm-marketing.types";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CrmMarketingFrame, useCrmMutation, useCrmSession } from "./shared";
export const orderLabels: Record<CrmOrderCriterion, string> = {
  TIPODEAGENDAMENTO: "Tipo de agendamento",
  PRIORIDADECAMPANHA: "Prioridade da campanha",
  DATAAGENDAMENTO: "Data do agendamento",
  CIDADES: "Ordem das cidades",
  ESTADOS: "Ordem dos estados",
  SEGMENTOS: "Ordem dos segmentos",
  POTENCIAL: "Potencial do cliente (maior primeiro)",
  CADASTRO: "Ordem de cadastro na campanha",
};
export default function CrmOrderingPage() {
  const [tab, setTab] = useState("criteria");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("list");
    if (["campaigns", "segments", "states", "cities"].includes(requested ?? "")) setTab(requested!);
  }, []);
  return (
    <CrmMarketingFrame title="Ordenar campanhas">
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Listas de ordenação"
      >
        {[
          ["criteria", "Critérios"],
          ["campaigns", "Campanhas"],
          ["segments", "Segmentos"],
          ["states", "Estados"],
          ["cities", "Cidades"],
        ].map(([value, label]) => (
          <Tab
            key={value}
            id={`ordering-tab-${value}`}
            aria-controls={`ordering-panel-${value}`}
            value={value}
            label={label}
          />
        ))}
      </Tabs>
      <Box
        role="tabpanel"
        id="ordering-panel-criteria"
        aria-labelledby="ordering-tab-criteria"
        hidden={tab !== "criteria"}
        sx={{ pt: 2 }}
      >
        <OrderingPanel />
      </Box>
      {(["campaigns", "segments", "states", "cities"] as const).map((kind) => (
        <Box
          key={kind}
          role="tabpanel"
          id={`ordering-panel-${kind}`}
          aria-labelledby={`ordering-tab-${kind}`}
          hidden={tab !== kind}
          sx={{ pt: 2 }}
        >
          <CatalogOrderingPanel kind={kind} active={tab === kind} />
        </Box>
      ))}
    </CrmMarketingFrame>
  );
}
export function OrderingPanel() {
  const { client, instance } = useCrmSession(),
    mutation = useCrmMutation(),
    [original, setOriginal] = useState<CrmOrdering | null>(null),
    [criteria, setCriteria] = useState<CrmOrderCriterion[]>([]),
    [cityMode, setCityMode] = useState<"S" | "N" | "">(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [explicitReload, setExplicitReload] = useState(false);
  const modeRef = useRef(cityMode);
  modeRef.current = cityMode;
  const dirty = Boolean(
    original &&
      (JSON.stringify(criteria) !== JSON.stringify(original.criteria) ||
        cityMode !== (original.data.ORDENACAO_APENAS_CIDADE ?? "")),
  );
  const originalRef = useRef(original),
    criteriaRef = useRef(criteria);
  originalRef.current = original;
  criteriaRef.current = criteria;
  const gateRef = useRef(false);
  gateRef.current = mutation.gate;
  useEffect(() => {
    if (gateRef.current && !explicitReload) return;
    let active = true;
    setLoading(true);
    setError("");
    void client
      .ordering()
      .then((data) => {
        if (active) {
          if (
            explicitReload ||
            !originalRef.current ||
            (JSON.stringify(criteriaRef.current) === JSON.stringify(originalRef.current.criteria) &&
              modeRef.current === (originalRef.current.data.ORDENACAO_APENAS_CIDADE ?? ""))
          ) {
            setOriginal(data);
            setCriteria(data.criteria);
            setCityMode(
              data.data.ORDENACAO_APENAS_CIDADE === "S"
                ? "S"
                : data.data.ORDENACAO_APENAS_CIDADE === "N"
                  ? "N"
                  : "",
            );
          }
          if (explicitReload) {
            mutation.reconcile();
            setExplicitReload(false);
            mutation.setSuccess("Ordem recarregada. Revise os critérios antes de salvar.");
          }
        }
      })
      .catch((error) => {
        if (active) setError(crmError(error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, reload]);
  async function save() {
    if (!original || !criteria.length) return;
    const result = await mutation.write(() =>
      client.saveOrdering(criteria, original.data, cityMode || undefined),
    );
    if (result) {
      setOriginal(result.value);
      setCriteria(result.value.criteria);
      setCityMode(result.value.data.ORDENACAO_APENAS_CIDADE === "S" ? "S" : "N");
      mutation.setSuccess("Ordem dos critérios salva.");
    }
  }
  function reloadOrder() {
    if (original && dirty && !window.confirm("Descartar a ordem ainda não salva e recarregar?"))
      return;
    setExplicitReload(true);
    setReload((value) => value + 1);
  }
  useCrmLeaveGuard(dirty, mutation.busy, mutation.gate);
  const disabled = mutation.busy || mutation.gate || loading || Boolean(error),
    available = (original?.supportedCriteria ?? []).filter((key) => !criteria.includes(key));
  return (
    <Stack gap={2}>
      {loading && <LinearProgress aria-label="Carregando ordenação" />}
      {error && <Alert severity="error">{error}</Alert>}
      {mutation.error && <Alert severity="error">{mutation.error}</Alert>}
      {mutation.success && <Alert severity="success">{mutation.success}</Alert>}
      {original && !original.managed && (
        <Alert severity="info">
          Revise a sequência e salve para atualizar a configuração de ordenação.
        </Alert>
      )}
      <Typography color="text.secondary">
        O primeiro critério tem precedência. A identificação do agendamento desempata resultados
        iguais.
      </Typography>
      <TextField
        select
        label="Modo de cidades"
        value={cityMode}
        disabled={disabled}
        onChange={(event) => setCityMode(event.target.value as "S" | "N")}
      >
        <MenuItem value="N">Por estado — cidades organizadas dentro de cada UF</MenuItem>
        <MenuItem value="S">Ordem nacional — cidades de todas as UFs</MenuItem>
      </TextField>
      <VisualOrderList
        items={criteria.map((key) => ({ id: key, name: orderLabels[key], showId: false }))}
        disabled={disabled}
        onChange={(items) => setCriteria(items.map((item) => item.id as CrmOrderCriterion))}
      />
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {criteria.map((key) => (
          <Button
            key={key}
            disabled={disabled}
            onClick={() => setCriteria(criteria.filter((value) => value !== key))}
          >
            Remover {orderLabels[key]}
          </Button>
        ))}
      </Stack>
      <Button
        disabled={disabled || !dirty}
        onClick={() => {
          if (original) {
            setCriteria(original.criteria);
            setCityMode(
              original.data.ORDENACAO_APENAS_CIDADE === "S"
                ? "S"
                : original.data.ORDENACAO_APENAS_CIDADE === "N"
                  ? "N"
                  : "",
            );
          }
        }}
      >
        Desfazer movimentos
      </Button>
      <TextField
        select
        label="Adicionar critério"
        value=""
        disabled={disabled || !available.length}
        onChange={(event) => setCriteria([...criteria, event.target.value as CrmOrderCriterion])}
      >
        {available.map((key) => (
          <MenuItem key={key} value={key}>
            {orderLabels[key]}
          </MenuItem>
        ))}
      </TextField>
      <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
        <Button
          startIcon={<UiIcon name="refresh" scale="row" />}
          disabled={mutation.busy || loading}
          onClick={reloadOrder}
        >
          {mutation.gate ? "Conferir ordenação" : "Recarregar"}
        </Button>
        <Button
          startIcon={<UiIcon name="finish" scale="row" />}
          variant="contained"
          disabled={
            disabled || !original || !criteria.length || (!dirty && original.managed) || !cityMode
          }
          onClick={() => void save()}
        >
          {mutation.busy ? "Salvando…" : "Salvar ordem"}
        </Button>
      </Stack>
      <Box>
        <Typography variant="subtitle2" mb={1}>
          Ajustar prioridades dos cadastros
        </Typography>
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
          {[
            ["Campanhas", "/crm-campaigns"],
            ["Cidades", "/crm-catalogs/cities"],
            ["Estados", "/crm-catalogs/states"],
            ["Segmentos", "/customer-segments"],
          ].map(([label, href]) => (
            <Button key={href} component={Link} href={`/${instance}${href}`} size="small">
              {label}
            </Button>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
