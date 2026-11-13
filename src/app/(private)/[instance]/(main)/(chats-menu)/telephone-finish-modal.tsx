"use client";
import TelephoneSurveyFields from "@/lib/components/telephone-survey-fields";
import { completeSurvey, surveyPayload, type SurveyQuestion } from "@/lib/satisfaction";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import customersService from "@/lib/services/customers.service";

import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { useAuthContext } from "@/app/auth-context";
import CrmProposalsClient, { type Proposal } from "@/lib/sdk-local/crm-proposals.client";
import TelephonyFinishClient, { type FinishOptions } from "@/lib/sdk-local/telephony-finish.client";
import { Formatter } from "@in.pulse-crm/utils";
import CloseIcon from "@mui/icons-material/Close";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import type {
  TelephoneFinishResult,
  TelephoneQueueItem,
  TelephoneFinishExtensions,
} from "./telephone-dialer.types";
import useChatActionScope from "../(chat)/(actions)/use-chat-action-scope";
import { getCustomerSegmentsError } from "@/lib/customer-segments-error";

interface TelephoneFinishModalProps {
  appointment: TelephoneQueueItem;
  callId?: string;
  beforeV2Confirm?: () => Promise<void>;
  onV2Committed?: () => Promise<void>;
  onConfirm: (
    resultId: number,
    scheduleDate: string | undefined,
    operationId: string,
    finishedAt: string,
    extensions?: TelephoneFinishExtensions,
  ) => Promise<void>;
  onCheckConfirmation: (operationId: string) => Promise<"applied" | "not_confirmed">;
}

const formatPhone = (phone: string) => {
  try {
    return Formatter.phone(phone);
  } catch {
    return phone;
  }
};

export default function TelephoneFinishModal({
  appointment,
  onConfirm,
  onCheckConfirmation,
  callId,
  beforeV2Confirm,
  onV2Committed,
}: TelephoneFinishModalProps) {
  const { closeModal } = useAppContext();
  const { token, instance, user } = useAuthContext();
  const { parameters, wppApi } = useWhatsappContext();
  const salesEnabled = isFeatureEnabled(parameters, FEATURE_FLAGS.crmSales);
  const satisfactionEnabled = isFeatureEnabled(parameters, FEATURE_FLAGS.crmSatisfaction);
  const finishApi = useMemo(
    () =>
      token
        ? new TelephonyFinishClient(
            process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002",
            { instance, token },
          )
        : null,
    [instance, token],
  );
  const [finishOptions, setFinishOptions] = useState<FinishOptions>();
  const advanced = finishOptions?.enabled === true;
  const hasSatisfaction = advanced || satisfactionEnabled;
  const hasSales = advanced || salesEnabled;
  const api = useMemo(
    () =>
      token
        ? new CrmProposalsClient(process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002", {
            instance,
            token,
          })
        : null,
    [instance, token],
  );
  // New reads capture current credentials without clearing drafts when the JWT renews.
  const apiRef = useRef(api);
  apiRef.current = api;
  const scope = useChatActionScope();
  const [resultId, setResultId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [results, setResults] = useState<TelephoneFinishResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [surveyState, setSurveyState] = useState<{
    resultId: number;
    required: boolean;
    questions: SurveyQuestion[];
  } | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string>>({});
  const [surveyError, setSurveyError] = useState("");
  const [surveyReload, setSurveyReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [proposalValue, setProposalValue] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [cancelIds, setCancelIds] = useState<number[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const [observation, setObservation] = useState("");
  const [redialPhone, setRedialPhone] = useState(appointment.phone);
  const [delegateOperatorId, setDelegateOperatorId] = useState("");
  const [phaseContactId, setPhaseContactId] = useState("");
  const [priority, setPriority] = useState(false);
  const [confirmInactivation, setConfirmInactivation] = useState(false);
  const [saleDescription, setSaleDescription] = useState("");
  const [saleValue, setSaleValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [saleProposalIds, setSaleProposalIds] = useState<number[]>([]);
  const submitting = useRef(false);
  const operation = useRef<{ id: string; finishedAt: string } | null>(null);

  const selectedResult = useMemo(
    () => results.find((result) => result.id === resultId) ?? null,
    [resultId, results],
  );

  useEffect(() => {
    let cancelled = false;
    if (!finishApi) return;
    setFinishOptions(undefined);
    finishApi
      .options(appointment.id)
      .then((value) => {
        if (!cancelled) setFinishOptions(value);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Não foi possível conferir o fluxo de finalização. Reabra o atendimento.");
          setLoadingResults(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [finishApi, appointment.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      if (!finishOptions) return;
      setLoadingResults(true);

      try {
        const current = apiRef.current;
        if (!current) throw new Error("Sessão indisponível.");
        const fetchedResults = advanced
          ? finishOptions.results || []
          : salesEnabled
            ? await current.results()
            : await wppApi.current.getResults();

        if (!cancelled) {
          setResults(
            fetchedResults.filter((result) => result.name.trim() !== "") as TelephoneFinishResult[],
          );
        }
      } catch (err) {
        if (!cancelled) {
          toast.error("Falha ao carregar resultados de atendimento.");
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingResults(false);
        }
      }
    }

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [instance, user?.CODIGO, salesEnabled, wppApi, finishOptions, advanced]);

  useEffect(() => {
    let cancelled = false;
    setSurveyState(null);
    setSurveyAnswers({});
    setSurveyError("");
    if (!resultId || !token || !hasSatisfaction) return;
    customersService
      .getCallSatisfaction(appointment.id, resultId, { instance, token })
      .then((data) => {
        if (!cancelled) setSurveyState({ resultId, ...data });
      })
      .catch(() => {
        if (!cancelled)
          setSurveyError(
            "Não foi possível carregar a pesquisa deste resultado. Recarregue a pesquisa para tentar.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [resultId, instance, appointment.id, surveyReload, user?.CODIGO, hasSatisfaction]);
  const surveyReady =
    !hasSatisfaction ||
    (surveyState?.resultId === resultId &&
      (!surveyState.required || completeSurvey(surveyState.questions, surveyAnswers)));
  const requiresScheduleDate =
    selectedResult?.COD_ACAO === 2 ||
    (advanced && [7, 8].includes(Number(selectedResult?.COD_ACAO)));
  const flagged = (flag: unknown) => flag === "SIM" || flag === "S" || flag === true || flag === 1;
  const requiresProposal = hasSales && flagged(selectedResult?.PROPOSTA);
  const requiresCancellation = hasSales && flagged(selectedResult?.CANCELAPROPOSTA);
  const requiresSale =
    advanced &&
    finishOptions?.saleEnabled &&
    flagged((selectedResult as { EVENDA?: string })?.EVENDA);
  const observationNeeded = Boolean(
    finishOptions?.observationRequired ||
      finishOptions?.phases?.some(
        (p) => String(p.id) === phaseContactId && p.observationRequired === "S",
      ),
  );
  useEffect(() => {
    let cancelled = false;
    setProposals([]);
    setCancelIds([]);
    setProposalError("");
    setLoadingProposals(Boolean(requiresCancellation || requiresSale));
    if ((requiresCancellation || requiresSale) && apiRef.current)
      apiRef.current
        .forSchedule(appointment.id)
        .then((rows) => {
          if (!cancelled) setProposals(rows);
        })
        .catch(() => {
          if (!cancelled)
            setProposalError(
              "Não foi possível carregar propostas deste cliente. Reabra a finalização.",
            );
        })
        .finally(() => {
          if (!cancelled) setLoadingProposals(false);
        });
    return () => {
      cancelled = true;
    };
  }, [resultId, requiresCancellation, requiresSale, instance, user?.CODIGO, appointment.id]);
  const validProposal =
    /^(?:0|[1-9]\d{0,9})(?:[.,]\d{1,2})?$/.test(proposalValue) &&
    Number(proposalValue.replace(",", ".")) > 0;

  const handleConfirm = async () => {
    if (!surveyReady || !selectedResult || blocked || submitting.current || !scope.isActive())
      return;
    if (requiresScheduleDate && !scheduleDate) return;
    if (
      advanced &&
      (!finishApi ||
        (observationNeeded && !observation.trim()) ||
        (finishOptions?.phaseRequired && !phaseContactId) ||
        (selectedResult.COD_ACAO === 1 && !redialPhone) ||
        (selectedResult.COD_ACAO === 8 && !delegateOperatorId) ||
        (selectedResult.COD_ACAO === 6 && !confirmInactivation) ||
        (requiresSale &&
          (!saleDescription.trim() ||
            !paymentMethod.trim() ||
            Number(saleValue.replace(",", ".")) <= 0)))
    )
      return;
    if (
      (requiresProposal && !validProposal) ||
      (requiresCancellation && (!cancelIds.length || loadingProposals || proposalError))
    )
      return;

    submitting.current = true;
    setSaving(true);
    setError("");
    operation.current ??= { id: crypto.randomUUID(), finishedAt: new Date().toISOString() };

    try {
      if (advanced && finishApi) {
        await beforeV2Confirm?.();
        await finishApi.finish(appointment.id, {
          operationId: operation.current.id,
          resultId: selectedResult.id,
          observation,
          ...(phaseContactId ? { phaseContactId: Number(phaseContactId) } : {}),
          ...(callId ? { callId } : {}),
          ...(requiresScheduleDate ? { scheduleDate } : {}),
          ...(selectedResult.COD_ACAO === 1 ? { redialPhone } : {}),
          ...(selectedResult.COD_ACAO === 8
            ? { delegateOperatorId: Number(delegateOperatorId) }
            : {}),
          ...(selectedResult.COD_ACAO === 6 ? { confirmInactivation } : {}),
          priority,
          ...(surveyState?.required
            ? { survey: surveyPayload(surveyState.questions, surveyAnswers) }
            : {}),
          ...(requiresProposal ? { proposalValue: proposalValue.replace(",", ".") } : {}),
          ...(requiresCancellation
            ? {
                cancelProposals: proposals
                  .filter((p) => cancelIds.includes(p.id))
                  .map((p) => ({ id: p.id, version: p.version })),
              }
            : {}),
          ...(requiresSale
            ? {
                sale: {
                  description: saleDescription,
                  value: saleValue.replace(",", "."),
                  paymentMethod,
                  proposalIds: saleProposalIds,
                },
              }
            : {}),
        });
        await onV2Committed?.();
      } else
        await onConfirm(
          selectedResult.id,
          requiresScheduleDate ? scheduleDate : undefined,
          operation.current.id,
          operation.current.finishedAt,
          {
            ...(hasSatisfaction && surveyState?.required
              ? { survey: surveyPayload(surveyState.questions, surveyAnswers) }
              : {}),
            ...(requiresProposal ? { proposalValue: proposalValue.replace(",", ".") } : {}),
            ...(requiresCancellation
              ? {
                  cancelProposals: proposals
                    .filter((p) => cancelIds.includes(p.id))
                    .map((p) => ({ id: p.id, version: p.version })),
                }
              : {}),
          },
        );
      if (scope.isActive()) closeModal();
    } catch (failure) {
      if (!scope.isActive()) return;
      const detail = getCustomerSegmentsError(failure);
      if (
        !detail.status ||
        detail.status === 401 ||
        detail.status === 409 ||
        detail.status >= 500 ||
        detail.outcome === "UNKNOWN"
      ) {
        setBlocked(true);
        setError(
          "Não foi possível confirmar a finalização. Confira o atendimento antes de continuar. Não repita a operação sem reler a fila.",
        );
      } else setError("Não foi possível finalizar. Confira o resultado e a data informados.");
    } finally {
      submitting.current = false;
      if (scope.isActive()) setSaving(false);
    }
  };

  const checkConfirmation = async () => {
    if (!operation.current || checking || !scope.isActive()) return;
    setChecking(true);
    try {
      const status =
        advanced && finishApi
          ? (await finishApi.status(appointment.id, operation.current.id)).status
          : await onCheckConfirmation(operation.current.id);
      if (!scope.isActive()) return;
      if (status === "applied") {
        if (advanced) await onV2Committed?.();
        closeModal();
      } else
        setError(
          "A finalização ainda não foi confirmada. Feche esta janela, releia a fila e confira o atendimento antes de iniciar outra operação.",
        );
    } catch {
      if (scope.isActive())
        setError(
          "Não foi possível conferir a finalização. Mantenha a operação sem repetir e releia a fila.",
        );
    } finally {
      if (scope.isActive()) setChecking(false);
    }
  };
  if (!scope.valid) return null;
  return (
    <div className="max-h-[90vh] w-[24rem] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md bg-white px-4 py-4 text-gray-800 dark:bg-slate-800 dark:text-white">
      <header className="flex items-center justify-between pb-5">
        <div>
          <h1 className="text-lg font-semibold">Finalizar atendimento</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {appointment.contactName} • {formatPhone(appointment.phone)}
          </p>
        </div>
        <IconButton
          onClick={closeModal}
          disabled={saving || checking}
          aria-label="Fechar finalização"
        >
          <CloseIcon />
        </IconButton>
      </header>

      <form className="flex flex-col gap-4">
        {error && <Alert severity="error">{error}</Alert>}
        {blocked && (
          <Button type="button" onClick={checkConfirmation} disabled={checking}>
            Conferir finalização
          </Button>
        )}
        {loadingResults ? (
          <div className="flex items-center justify-center py-6">
            <CircularProgress size={24} />
          </div>
        ) : (
          <TextField
            select
            label="Resultado"
            value={resultId ?? ""}
            disabled={saving || blocked}
            onChange={(event) => {
              setResultId(Number(event.target.value));
              setScheduleDate("");
              setProposalValue("");
              setCancelIds([]);
              setDelegateOperatorId("");
              setConfirmInactivation(false);
              setSaleDescription("");
              setSaleValue("");
              setPaymentMethod("");
              setSaleProposalIds([]);
            }}
            required
            fullWidth
          >
            {results.map((result) => (
              <MenuItem key={result.id} value={result.id}>
                {result.name}
              </MenuItem>
            ))}
          </TextField>
        )}

        {hasSatisfaction && resultId && !surveyState && !surveyError && (
          <CircularProgress size={20} aria-label="Carregando pesquisa" />
        )}
        {hasSatisfaction && surveyError && (
          <Alert severity="error">
            {surveyError}
            <Button
              disabled={saving || blocked}
              onClick={() => setSurveyReload((value) => value + 1)}
            >
              Recarregar pesquisa
            </Button>
          </Alert>
        )}
        {hasSatisfaction && surveyState?.resultId === resultId && surveyState.required && (
          <TelephoneSurveyFields
            questions={surveyState.questions}
            answers={surveyAnswers}
            disabled={saving || blocked}
            onChange={(id, value) => setSurveyAnswers((current) => ({ ...current, [id]: value }))}
          />
        )}

        {advanced && (
          <>
            <TextField
              label="Observação do atendimento"
              required={
                finishOptions?.observationRequired ||
                finishOptions?.phases?.some(
                  (p) => String(p.id) === phaseContactId && p.observationRequired === "S",
                )
              }
              multiline
              minRows={3}
              value={observation}
              disabled={saving || blocked}
              onChange={(e) => setObservation(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 4000 } }}
            />
            {!!finishOptions?.phases?.length && (
              <TextField
                select
                label="Fase do contato"
                required={finishOptions.phaseRequired}
                value={phaseContactId}
                disabled={saving || blocked}
                onChange={(e) => setPhaseContactId(String(e.target.value))}
              >
                {finishOptions.phases.map((phase) => (
                  <MenuItem key={phase.id} value={phase.id}>
                    {phase.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {selectedResult?.COD_ACAO === 1 && (
              <TextField
                select
                label="Telefone para rediscar"
                value={redialPhone}
                disabled={saving || blocked}
                onChange={(e) => setRedialPhone(e.target.value)}
              >
                {appointment.phoneOptions.map((p) => (
                  <MenuItem key={p.key} value={p.phone}>
                    {formatPhone(p.phone)}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {selectedResult?.COD_ACAO === 8 && (
              <TextField
                select
                label="Delegar para"
                required
                value={delegateOperatorId}
                disabled={saving || blocked}
                onChange={(e) => setDelegateOperatorId(String(e.target.value))}
              >
                {finishOptions?.operators?.map((op) => (
                  <MenuItem key={op.id} value={op.id}>
                    {op.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {selectedResult?.COD_ACAO === 6 ? (
              <FormControlLabel
                label="Confirmo a inativação deste cliente"
                control={
                  <Checkbox
                    checked={confirmInactivation}
                    disabled={saving || blocked}
                    onChange={(e) => setConfirmInactivation(e.target.checked)}
                  />
                }
              />
            ) : (
              finishOptions?.priorityAllowed && (
                <FormControlLabel
                  label="Alta prioridade"
                  control={
                    <Checkbox
                      checked={priority}
                      disabled={saving || blocked}
                      onChange={(e) => setPriority(e.target.checked)}
                    />
                  }
                />
              )
            )}
            {[7, 14].includes(Number(selectedResult?.COD_ACAO)) && (
              <Button href={`/${instance}/crm-email`} target="_blank" rel="noopener noreferrer">
                Compor email
              </Button>
            )}
            {requiresSale && (
              <>
                <TextField
                  label="Descrição da venda"
                  value={saleDescription}
                  required
                  disabled={saving || blocked}
                  onChange={(e) => setSaleDescription(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 60 } }}
                />
                <TextField
                  label="Valor da venda (R$)"
                  required
                  value={saleValue}
                  disabled={saving || blocked}
                  onChange={(e) => setSaleValue(e.target.value)}
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
                <TextField
                  label="Forma de pagamento"
                  required
                  value={paymentMethod}
                  disabled={saving || blocked}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                {proposals
                  .filter((p) => !cancelIds.includes(p.id))
                  .map((p) => (
                    <FormControlLabel
                      key={p.id}
                      label={`Vincular proposta #${p.id} · R$ ${p.value}`}
                      control={
                        <Checkbox
                          checked={saleProposalIds.includes(p.id)}
                          disabled={saving || blocked}
                          onChange={(e) =>
                            setSaleProposalIds(
                              e.target.checked
                                ? [...saleProposalIds, p.id]
                                : saleProposalIds.filter((id) => id !== p.id),
                            )
                          }
                        />
                      }
                    />
                  ))}
              </>
            )}
          </>
        )}
        {requiresScheduleDate && (
          <TextField
            type="datetime-local"
            label="Data e hora do reagendamento"
            required
            value={scheduleDate}
            disabled={saving || blocked}
            onChange={(event) => setScheduleDate(event.target.value)}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />
        )}

        {requiresProposal && (
          <TextField
            label="Valor da proposta (R$)"
            required
            value={proposalValue}
            disabled={saving || blocked}
            onChange={(e) => setProposalValue(e.target.value)}
            helperText="Valor positivo, com até duas casas decimais."
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        )}
        {requiresCancellation && (
          <div>
            {loadingProposals ? (
              <CircularProgress size={20} />
            ) : proposalError ? (
              <Alert severity="error">{proposalError}</Alert>
            ) : proposals.length === 0 ? (
              <Alert severity="warning">
                Não há propostas abertas para cancelar. Selecione outro resultado ou revise o
                cliente.
              </Alert>
            ) : (
              <>
                <p>Selecione as propostas a cancelar (máximo 20):</p>
                {proposals.map((p) => (
                  <FormControlLabel
                    key={p.id}
                    label={`#${p.id} · R$ ${p.value} · ${p.campaignName || "Campanha"}`}
                    control={
                      <Checkbox
                        checked={cancelIds.includes(p.id)}
                        disabled={
                          saving || blocked || (!cancelIds.includes(p.id) && cancelIds.length >= 20)
                        }
                        onChange={(e) =>
                          setCancelIds(
                            e.target.checked
                              ? [...cancelIds, p.id]
                              : cancelIds.filter((id) => id !== p.id),
                          )
                        }
                      />
                    }
                  />
                ))}
              </>
            )}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="contained"
            color="secondary"
            onClick={closeModal}
            disabled={saving || checking}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="contained"
            color="primary"
            onClick={handleConfirm}
            disabled={
              loadingResults ||
              !finishOptions ||
              saving ||
              blocked ||
              !selectedResult ||
              (requiresProposal && !validProposal) ||
              (requiresCancellation &&
                (!cancelIds.length || loadingProposals || !!proposalError)) ||
              !surveyReady ||
              (advanced &&
                ((observationNeeded && !observation.trim()) ||
                  (finishOptions?.phaseRequired && !phaseContactId) ||
                  (selectedResult?.COD_ACAO === 8 && !delegateOperatorId) ||
                  (selectedResult?.COD_ACAO === 6 && !confirmInactivation) ||
                  (requiresSale &&
                    (!saleDescription.trim() || !paymentMethod.trim() || !saleValue)))) ||
              (requiresScheduleDate && !scheduleDate)
            }
          >
            {saving ? "Finalizando..." : "Finalizar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
