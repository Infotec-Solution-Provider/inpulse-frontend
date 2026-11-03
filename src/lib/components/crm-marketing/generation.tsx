"use client";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
import { CrmToolbar, OperationalIconButton, UiIcon } from "@/lib/ui-system";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { useCrmQueryState } from "@/lib/ui-system/query-state";
import CrmCampaignGenerationClient, {
  type CrmGenerationPreview,
} from "@/lib/sdk-local/crm-campaign-generation.client";
import type { CrmCampaignConfiguration } from "@/lib/sdk-local/types/crm-marketing.types";
import { crmError } from "@/lib/crm-marketing-form";
import {
  Alert,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { CrmLookup, useCrmMutation, useCrmSession } from "./shared";
function localCivil() {
  const date = new Date(),
    pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}
export default function GenerationPanel({
  campaignId,
  configuration,
  disabled,
  onReload,
}: {
  campaignId: number;
  configuration: CrmCampaignConfiguration | null;
  disabled: boolean;
  onReload: () => void;
}) {
  const { client, token, instance } = useCrmSession(),
    api = useMemo(
      () =>
        new CrmCampaignGenerationClient(
          process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002",
          token,
          instance,
        ),
      [token, instance],
    ),
    mutation = useCrmMutation();
  const [confirm, setConfirm] = useState(false);
  const [operator, setOperator] = useState<string | null>(null),
    [date, setDate] = useState(localCivil),
    [preview, setPreview] = useState<CrmGenerationPreview | null>(null),
    [reading, setReading] = useState(false),
    [knownGenerated, setKnownGenerated] = useState(false),
    sequence = useRef(0),
    alive = useRef(true),
    current = useRef(api);
  current.current = api;
  const initialDate = useRef(date);
  useCrmLeaveGuard(
    !knownGenerated && Boolean(operator || date !== initialDate.current),
    mutation.busy,
    mutation.gate,
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      sequence.current++;
    };
  }, []);
  useEffect(() => {
    sequence.current++;
    setPreview(null);
    setKnownGenerated(configuration?.GERADO_LISTA === "SIM");
  }, [api, configuration?.SQL_CAMPANHA, configuration?.GERADO_LISTA]);
  function invalidate() {
    sequence.current++;
    setPreview(null);
    setReading(false);
    mutation.setSuccess("");
  }
  function input() {
    const scheduledAt = date.replace("T", " "),
      parsed = new Date(`${date}Z`);
    if (
      !operator ||
      !/^[1-9]\d*$/.test(operator) ||
      Number(operator) > 2147483647 ||
      !/^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(scheduledAt) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 19) !== date
    )
      throw new Error("Selecione um usuário e uma data/hora válida para os agendamentos.");
    return { operatorId: Number(operator), scheduledAt };
  }
  async function inspect() {
    let data;
    try {
      data = input();
    } catch (error) {
      mutation.setError(error instanceof Error ? error.message : "Confira os campos.");
      return;
    }
    const version = ++sequence.current,
      started = api;
    setReading(true);
    mutation.setError("");
    try {
      const response = await api.preview(campaignId, data);
      if (alive.current && version === sequence.current && started === current.current)
        setPreview(response);
    } catch (error) {
      if (alive.current && version === sequence.current) mutation.setError(crmError(error).message);
    } finally {
      if (alive.current && version === sequence.current) setReading(false);
    }
  }
  async function generate() {
    if (!preview) return;
    const result = await mutation.write(() =>
      api.generate(campaignId, {
        operatorId: preview.operatorId,
        scheduledAt: preview.scheduledAt,
        expectedCount: preview.batchCount,
        expected: preview.expected,
      }),
    );
    if (result) {
      setPreview(null);
      setKnownGenerated(result.value.GERADO_LISTA === "SIM");
      mutation.setSuccess(
        `${result.value.insertedCount.toLocaleString("pt-BR")} agendamentos gerados.${result.value.hasMore ? " Confira o próximo lote antes de gerar." : ""}`,
      );
      onReload();
      if (result.value.hasMore) await inspect();
    }
  }
  async function reconcile() {
    const version = ++sequence.current,
      started = api;
    setReading(true);
    try {
      const config = await client.configuration(campaignId);
      if (!alive.current || version !== sequence.current || started !== current.current) return;
      setKnownGenerated(config.GERADO_LISTA === "SIM");
      setPreview(null);
      mutation.reconcile();
      mutation.setSuccess(
        "Situação da campanha conferida. Revise os agendamentos antes de continuar.",
      );
      onReload();
    } catch (error) {
      if (alive.current) mutation.setError(crmError(error).message);
    } finally {
      if (alive.current && version === sequence.current) setReading(false);
    }
  }
  const blocked = disabled || mutation.busy || mutation.gate || !configuration?.managed;
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack gap={2}>
        <Typography variant="h6">Gerar agendamentos</Typography>
        <Typography color="text.secondary" variant="body2">
          Escolha o responsável e a data/hora dos novos agendamentos. Clientes já vinculados a esta
          campanha são preservados.
        </Typography>
        {!configuration?.managed && (
          <Alert severity="info">
            Salve os critérios estruturados da campanha para preparar a geração.
          </Alert>
        )}
        {knownGenerated && (
          <Alert severity="info">
            Uma geração já foi concluída. Prepare uma nova prévia para acrescentar clientes
            elegíveis; os vínculos existentes serão preservados.
          </Alert>
        )}
        {mutation.error && <Alert severity="error">{mutation.error}</Alert>}
        {mutation.success && <Alert severity="success">{mutation.success}</Alert>}
        {reading && <LinearProgress aria-label="Conferindo geração" />}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <CrmLookup
            kind="operators"
            label="Responsável pelos novos agendamentos"
            value={operator}
            disabled={blocked}
            onChange={(value) => {
              invalidate();
              setOperator(typeof value === "string" ? value : null);
            }}
          />
          <TextField
            label="Data e hora no CRM"
            type="datetime-local"
            value={date}
            disabled={blocked}
            onChange={(event) => {
              invalidate();
              setDate(
                event.target.value.length === 16 ? `${event.target.value}:00` : event.target.value,
              );
            }}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 1 } }}
          />
        </Box>
        {preview && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack gap={1}>
              <Typography fontWeight={700}>Revisão do próximo lote</Typography>
              {preview.selectedCount !== undefined && (
                <Typography variant="body2">
                  Público correspondente: {preview.selectedCount.toLocaleString("pt-BR")} clientes
                </Typography>
              )}
              <Typography variant="body2">
                Novos elegíveis: {preview.eligibleCount.toLocaleString("pt-BR")}
              </Typography>
              <Typography variant="body2">
                Já vinculados{" "}
                {preview.alreadyLinkedInSelectionCount === undefined
                  ? "à campanha"
                  : "neste público"}
                :{" "}
                {(
                  preview.alreadyLinkedInSelectionCount ?? preview.alreadyLinkedCount
                ).toLocaleString("pt-BR")}
              </Typography>
              {preview.withoutDialablePhoneCount !== undefined && (
                <Typography variant="body2">
                  Sem telefone válido neste público:{" "}
                  {preview.withoutDialablePhoneCount.toLocaleString("pt-BR")}
                </Typography>
              )}
              <Typography fontWeight={700}>
                Este lote: {preview.batchCount.toLocaleString("pt-BR")} agendamentos
              </Typography>
              <Typography variant="caption">
                Limite de {preview.limit.toLocaleString("pt-BR")} por lote. Data e hora no CRM:{" "}
                {preview.scheduledAt}.
              </Typography>
              {preview.batchCount === 0 && (
                <Alert severity="info">Nenhum novo cliente elegível para gerar agora.</Alert>
              )}
            </Stack>
          </Paper>
        )}
        <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
          {mutation.gate && (
            <Button disabled={reading || mutation.busy} onClick={() => void reconcile()}>
              Conferir geração
            </Button>
          )}
          <Button
            variant="outlined"
            disabled={blocked || reading || !operator}
            onClick={() => void inspect()}
          >
            Prévia dos agendamentos
          </Button>
          <Button
            variant="contained"
            disabled={
              blocked ||
              reading ||
              !preview ||
              preview.batchCount < 1 ||
              preview.batchCount > preview.limit
            }
            onClick={() => setConfirm(true)}
          >
            {mutation.busy
              ? "Gerando…"
              : preview
                ? `Gerar próximos ${preview.batchCount.toLocaleString("pt-BR")} de ${preview.eligibleCount.toLocaleString("pt-BR")}`
                : "Gerar agendamentos"}
          </Button>
        </Stack>
      </Stack>
      <Dialog
        open={confirm}
        onClose={() => {
          if (!mutation.busy) setConfirm(false);
        }}
        aria-labelledby="generation-confirm-title"
      >
        <DialogTitle id="generation-confirm-title">Confirmar geração do lote?</DialogTitle>
        <DialogContent>
          {preview?.batchCount.toLocaleString("pt-BR")} novos agendamentos serão gerados para o
          usuário selecionado em {date.replace("T", " ")}. Confira a prévia antes de confirmar.
        </DialogContent>
        <DialogActions>
          <Button disabled={mutation.busy} onClick={() => setConfirm(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={
              blocked ||
              reading ||
              !preview ||
              preview.batchCount < 1 ||
              preview.batchCount > preview.limit
            }
            onClick={() => {
              setConfirm(false);
              void generate();
            }}
          >
            Confirmar lote
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
