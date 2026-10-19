"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";
import { LockKeyhole } from "lucide-react";
import { UiIcon } from "@/lib/ui-system";
import telephonyMonitorService from "@/lib/services/telephony-monitor.service";
import { dialogPaperSx } from "../../surface";
import { scheduleChanges, scheduleFailureStatus, scheduleOutcomeUnknown } from "../schedule-edit";
import type {
  TelephonyLookupOption,
  TelephonyScheduleDetail,
  TelephonySchedulePatch,
} from "../types";
import TelephonyLookupDialog, { type LookupPageRequest } from "./lookup-dialog";

interface Props {
  scheduleId: number;
  onClose: () => void;
  onSaved: () => void;
}

const failureMessage = (failure: unknown, fallback: string) =>
  failure instanceof Error ? failure.message : fallback;

export default function ScheduleEditDialog({ scheduleId, onClose, onSaved }: Props) {
  const [detail, setDetail] = useState<TelephonyScheduleDetail | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [operator, setOperator] = useState<TelephonyLookupOption | null>(null);
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [unknown, setUnknown] = useState<TelephonySchedulePatch | null>(null);
  const [verification, setVerification] = useState<string | null>(null);
  const mounted = useRef(false);
  const busy = useRef(false);
  const request = useRef<AbortController | null>(null);

  const readDetail = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const current = await telephonyMonitorService.schedule(scheduleId, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      setDetail(current);
      setScheduledAt(current.scheduledAt ?? "");
      setOperator(
        current.operatorId === null
          ? null
          : {
              id: String(current.operatorId),
              label: current.operatorName || `Operador #${current.operatorId}`,
            },
      );
      setConflict(false);
    } catch (failure) {
      if (mounted.current && !controller.signal.aborted)
        setError(failureMessage(failure, "Não foi possível carregar o agendamento."));
    } finally {
      if (mounted.current && !controller.signal.aborted) setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    mounted.current = true;
    void readDetail();
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, [readDetail]);

  const loadOperators = useCallback(
    ({ signal, ...params }: LookupPageRequest) =>
      telephonyMonitorService.scheduleOperators(scheduleId, params, signal),
    [scheduleId],
  );

  const save = async () => {
    if (!detail?.editable || loading || busy.current || unknown || conflict) return;
    let changes: TelephonySchedulePatch["changes"];
    try {
      changes = scheduleChanges(
        detail,
        scheduledAt,
        operator === null ? null : Number(operator.id),
      );
      if (Object.keys(changes).length === 0) {
        setError("Altere a data e hora ou o operador antes de salvar.");
        return;
      }
    } catch (failure) {
      setError(failureMessage(failure, "Confira os campos do agendamento."));
      return;
    }
    const patch: TelephonySchedulePatch = {
      operationId: crypto.randomUUID(),
      version: detail.version,
      changes,
    };
    const controller = new AbortController();
    request.current = controller;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await telephonyMonitorService.updateSchedule(scheduleId, patch, controller.signal);
      if (mounted.current && !controller.signal.aborted) onSaved();
    } catch (failure) {
      if (!mounted.current || controller.signal.aborted) return;
      if (scheduleOutcomeUnknown(failure)) {
        setUnknown(patch);
        setVerification(
          "A resposta da gravação não foi confirmada. Seus campos estão preservados. Verifique a gravação antes de continuar.",
        );
      } else {
        setConflict(scheduleFailureStatus(failure) === 409);
        setError(failureMessage(failure, "Não foi possível salvar o agendamento."));
      }
    } finally {
      busy.current = false;
      if (mounted.current && !controller.signal.aborted) setSaving(false);
    }
  };

  const verify = async () => {
    if (!unknown || busy.current) return;
    const controller = new AbortController();
    request.current = controller;
    busy.current = true;
    setVerifying(true);
    try {
      const receipt = await telephonyMonitorService.scheduleReceipt(
        scheduleId,
        unknown.operationId,
        controller.signal,
      );
      if (!mounted.current || controller.signal.aborted) return;
      if (receipt.status === "applied") onSaved();
      else
        setVerification(
          "A gravação ainda não pôde ser confirmada. Isso não confirma que ela foi desfeita. Aguarde e verifique novamente; os campos continuam bloqueados para evitar uma nova gravação.",
        );
    } catch {
      if (mounted.current && !controller.signal.aborted)
        setVerification(
          "Não foi possível consultar a confirmação. A gravação continua sem confirmação. Aguarde e verifique novamente.",
        );
    } finally {
      busy.current = false;
      if (mounted.current && !controller.signal.aborted) setVerifying(false);
    }
  };

  const disabled = loading || saving || Boolean(unknown) || !detail?.editable;
  const closeOperator = () => {
    setOperatorOpen(false);
    window.requestAnimationFrame(() => document.getElementById("schedule-edit-operator")?.focus());
  };
  const close = () => {
    if (!busy.current) {
      if (operatorOpen) closeOperator();
      else onClose();
    }
  };

  return (
    <>
      <Dialog
        open
        fullWidth
        maxWidth="sm"
        onClose={close}
        aria-labelledby="schedule-edit-title"
        aria-describedby="schedule-edit-description"
        slotProps={{
          paper: {
            sx: {
              ...dialogPaperSx,
              borderRadius: 3,
              m: { xs: 1.5, sm: 4 },
              width: { xs: "calc(100% - 24px)", sm: "calc(100% - 64px)" },
              maxHeight: "calc(100dvh - 24px)",
            },
          },
        }}
      >
        <DialogTitle
          component="div"
          id="schedule-edit-heading"
          className="flex items-start justify-between gap-3"
          sx={{ pb: 2 }}
        >
          <div>
            {operatorOpen && (
              <IconButton
                size="small"
                onClick={closeOperator}
                aria-label="Voltar ao agendamento"
                sx={{ ml: -0.5, mb: 1 }}
              >
                <UiIcon name="back" scale="toolbar" />
              </IconButton>
            )}
            <h2 id="schedule-edit-title" className="block text-lg font-semibold">
              {operatorOpen ? "Operador do agendamento" : "Editar agendamento"}
            </h2>
            <span
              id="schedule-edit-description"
              className="ip-muted mt-1 block text-sm font-normal"
            >
              {operatorOpen
                ? "Escolha o responsável por esta agenda."
                : "Atualize a data, o horário e o responsável."}
            </span>
          </div>
          <IconButton
            aria-label={
              operatorOpen ? "Fechar seleção de operador" : "Fechar edição de agendamento"
            }
            onClick={close}
            disabled={saving || verifying}
          >
            <UiIcon name="close" scale="toolbar" />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={
            operatorOpen
              ? { display: "flex", minHeight: 0, flexDirection: "column", overflow: "hidden" }
              : undefined
          }
        >
          {operatorOpen ? (
            <TelephonyLookupDialog
              embedded
              title="Operador do agendamento"
              multiple={false}
              allowEmpty={false}
              initialSelection={operator ? [operator] : []}
              description="Selecione um operador ativo disponível no seu escopo."
              selectionHint="A seleção é mantida ao pesquisar ou trocar de página. Confirme para alterar o operador no formulário."
              loadPage={loadOperators}
              onClose={closeOperator}
              onConfirm={(options) => {
                if (options[0]) setOperator(options[0]);
                closeOperator();
              }}
            />
          ) : (
            <>
              {loading && (
                <div role="status" className="flex items-center gap-2 py-4 text-sm">
                  <CircularProgress size={22} /> Carregando agendamento…
                </div>
              )}
              {error && (
                <Alert severity="error" className="mb-4">
                  {error}
                </Alert>
              )}
              {unknown && (
                <Alert severity="warning" className="mb-4">
                  {verification}
                </Alert>
              )}
              {conflict && (
                <Alert severity="warning" className="mb-4">
                  O agendamento mudou ou deixou de permitir a edição. Recarregar substitui seu
                  rascunho pelos dados atuais.
                  <Button color="inherit" onClick={() => void readDetail()} disabled={loading}>
                    Recarregar agendamento
                  </Button>
                </Alert>
              )}
              {!detail && !loading && (
                <Button onClick={() => void readDetail()}>Tentar carregar novamente</Button>
              )}
              {detail && (
                <div className="flex flex-col gap-4">
                  <div className="border-b border-[var(--ip-border)] pb-3 text-sm">
                    <p className="font-semibold text-[var(--ip-text)]">
                      {detail.customer.name || `Cliente #${detail.customer.id}`}
                    </p>
                    <p className="ip-telephony-metadata ip-muted mt-1">
                      Cliente #{detail.customer.id} · Agendamento #{detail.id}
                      <span aria-hidden="true"> · </span>
                      {detail.campaign?.name ||
                        (detail.campaign ? `Campanha #${detail.campaign.id}` : "Sem campanha")}
                    </p>
                  </div>
                  {!detail.editable && (
                    <Alert severity="warning">
                      {detail.blockedReason || "Este agendamento não permite edição neste momento."}
                    </Alert>
                  )}
                  <div>
                    <TextField
                      label="Data e hora do agendamento"
                      type="datetime-local"
                      size="small"
                      fullWidth
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                      disabled={disabled}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: {
                          step: 1,
                          min: "1000-01-01T00:00:00",
                          max: "9999-12-31T23:59:59",
                        },
                      }}
                      helperText={
                        detail.scheduledAt === null
                          ? "Data atual não informada. Preencha somente se desejar alterá-la. Horário do CRM."
                          : "Horário local do CRM."
                      }
                    />
                  </div>
                  <div>
                    <p className="ip-telephony-metadata ip-muted mb-1 font-medium">
                      Operador do agendamento
                    </p>
                    <Button
                      id="schedule-edit-operator"
                      size="small"
                      variant="outlined"
                      fullWidth
                      endIcon={<UiIcon name="chevronDown" scale="metadata" />}
                      aria-label="Alterar operador"
                      aria-describedby="schedule-edit-operator-value schedule-edit-operator-help"
                      disabled={disabled}
                      onClick={() => setOperatorOpen(true)}
                      sx={{
                        justifyContent: "space-between",
                        color: "var(--ip-text)",
                        borderColor: "var(--ip-border)",
                        bgcolor: "var(--ip-surface)",
                      }}
                    >
                      <span id="schedule-edit-operator-value" className="truncate">
                        {operator?.label || "Sem operador informado"}
                      </span>
                    </Button>
                    <p
                      id="schedule-edit-operator-help"
                      className="ip-telephony-metadata ip-muted mt-1"
                    >
                      O operador cadastral do cliente é mantido.
                    </p>
                  </div>
                  <div className="ip-telephony-metadata flex items-start gap-2 text-[var(--ip-muted)]">
                    <UiIcon icon={LockKeyhole} scale="metadata" className="mt-0.5 shrink-0" />
                    <div>
                      <p>
                        Prioridade: edição indisponível
                        {detail.capabilities.priority
                          ? " nesta interface"
                          : " para este agendamento"}
                        .
                      </p>
                      <p>
                        Validade da campanha: edição indisponível
                        {detail.capabilities.validity
                          ? " nesta interface"
                          : " para este agendamento"}
                        .
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
        {!operatorOpen && (
          <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 2, py: 1.5 }}>
            <Button onClick={close} disabled={saving || verifying}>
              {unknown ? "Fechar" : "Cancelar"}
            </Button>
            {unknown ? (
              <Button variant="outlined" disabled={verifying} onClick={() => void verify()}>
                {verifying ? "Verificando…" : "Verificar gravação"}
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled={disabled || conflict}
                onClick={() => void save()}
              >
                {saving ? "Salvando…" : "Salvar agendamento"}
              </Button>
            )}
          </DialogActions>
        )}
      </Dialog>
    </>
  );
}
