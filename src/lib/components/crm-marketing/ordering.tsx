"use client";
import { CrmToolbar, OperationalIconButton, UiIcon } from "@/lib/ui-system";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { useCrmQueryState } from "@/lib/ui-system/query-state";
import { ArrowUp, ArrowDown } from "lucide-react";
import { crmError } from "@/lib/crm-marketing-form";
import type { CrmOrderCriterion, CrmOrdering } from "@/lib/sdk-local/types/crm-marketing.types";
import {
  ArrowDownward,
  ArrowUpward,
  DeleteOutline,
  Refresh,
  SaveOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
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
  return (
    <CrmMarketingFrame title="Ordenar campanhas">
      <OrderingPanel />
    </CrmMarketingFrame>
  );
}
export function OrderingPanel() {
  const { client, instance } = useCrmSession(),
    mutation = useCrmMutation(),
    [original, setOriginal] = useState<CrmOrdering | null>(null),
    [criteria, setCriteria] = useState<CrmOrderCriterion[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [explicitReload, setExplicitReload] = useState(false);
  const originalRef = useRef(original),
    criteriaRef = useRef(criteria);
  originalRef.current = original;
  criteriaRef.current = criteria;
  useEffect(() => {
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
            JSON.stringify(criteriaRef.current) === JSON.stringify(originalRef.current.criteria)
          ) {
            setOriginal(data);
            setCriteria(data.criteria);
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
    const result = await mutation.write(() => client.saveOrdering(criteria, original.data));
    if (result) {
      setOriginal(result.value);
      setCriteria(result.value.criteria);
      mutation.setSuccess("Ordem dos critérios salva.");
    }
  }
  function move(index: number, step: number) {
    const next = [...criteria],
      target = index + step;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCriteria(next);
    mutation.setSuccess("");
  }
  function reloadOrder() {
    if (
      original &&
      JSON.stringify(criteria) !== JSON.stringify(original.criteria) &&
      !window.confirm("Descartar a ordem ainda não salva e recarregar?")
    )
      return;
    setExplicitReload(true);
    setReload((value) => value + 1);
  }
  useCrmLeaveGuard(
    Boolean(original && JSON.stringify(criteria) !== JSON.stringify(original.criteria)),
    mutation.busy,
    mutation.gate,
  );
  const disabled = mutation.busy || mutation.gate || loading,
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
      <Stack gap={1}>
        {criteria.map((key, index) => (
          <Paper
            variant="outlined"
            key={key}
            sx={{
              p: { xs: 1, md: 1.5 },
              display: "flex",
              alignItems: "center",
              gap: { xs: 0, md: 1 },
              minWidth: 0,
            }}
          >
            <Typography color="text.secondary" sx={{ minWidth: 24 }}>
              {index + 1}.
            </Typography>
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13, overflowWrap: "anywhere" }}>
              {orderLabels[key]}
            </Typography>
            <OperationalIconButton
              label={`Subir ${orderLabels[key]}`}
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
            >
              <UiIcon icon={ArrowUp} scale="row" />
            </OperationalIconButton>
            <OperationalIconButton
              label={`Descer ${orderLabels[key]}`}
              disabled={disabled || index === criteria.length - 1}
              onClick={() => move(index, 1)}
            >
              <UiIcon icon={ArrowDown} scale="row" />
            </OperationalIconButton>
            <OperationalIconButton
              label={`Remover ${orderLabels[key]}`}
              disabled={disabled}
              onClick={() => setCriteria(criteria.filter((value) => value !== key))}
            >
              <UiIcon name="delete" scale="row" />
            </OperationalIconButton>
          </Paper>
        ))}
      </Stack>
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
            disabled ||
            !original ||
            !criteria.length ||
            JSON.stringify(criteria) === JSON.stringify(original.criteria)
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
