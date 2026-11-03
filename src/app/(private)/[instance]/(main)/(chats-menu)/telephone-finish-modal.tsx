"use client";

import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { useAuthContext } from "@/app/auth-context";
import CrmProposalsClient, { type Proposal } from "@/lib/sdk-local/crm-proposals.client";
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
import { TelephoneFinishResult, TelephoneQueueItem } from "./telephone-dialer.types";
import useChatActionScope from "../(chat)/(actions)/use-chat-action-scope";
import { getCustomerSegmentsError } from "@/lib/customer-segments-error";

interface TelephoneFinishModalProps {
  appointment: TelephoneQueueItem;
  onConfirm: (
    resultId: number,
    scheduleDate: string | undefined,
    operationId: string,
    finishedAt: string,
    extensions?: { proposalValue?: string; cancelProposals?: { id: number; version: string }[] },
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
}: TelephoneFinishModalProps) {
  const { closeModal } = useAppContext();
  const { token, instance } = useAuthContext();
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
  const scope = useChatActionScope();
  const [resultId, setResultId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [results, setResults] = useState<TelephoneFinishResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [proposalValue, setProposalValue] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [cancelIds, setCancelIds] = useState<number[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const submitting = useRef(false);
  const operation = useRef<{ id: string; finishedAt: string } | null>(null);

  const selectedResult = useMemo(
    () => results.find((result) => result.id === resultId) ?? null,
    [resultId, results],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      setLoadingResults(true);

      try {
        if (!api) throw new Error("Sessão indisponível.");
        const fetchedResults = await api.results();

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
  }, [api]);

  const requiresScheduleDate = selectedResult?.COD_ACAO === 2;
  const flagged = (flag: unknown) => flag === "SIM" || flag === "S" || flag === true || flag === 1;
  const requiresProposal = flagged(selectedResult?.PROPOSTA);
  const requiresCancellation = flagged(selectedResult?.CANCELAPROPOSTA);
  useEffect(() => {
    let cancelled = false;
    setProposals([]);
    setCancelIds([]);
    setProposalError("");
    setLoadingProposals(requiresCancellation);
    if (requiresCancellation && api)
      api
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
  }, [requiresCancellation, api, appointment.id]);
  const validProposal =
    /^(?:0|[1-9]\d{0,9})(?:[.,]\d{1,2})?$/.test(proposalValue) &&
    Number(proposalValue.replace(",", ".")) > 0;

  const handleConfirm = async () => {
    if (!selectedResult || blocked || submitting.current || !scope.isActive()) return;
    if (requiresScheduleDate && !scheduleDate) return;
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
      await onConfirm(
        selectedResult.id,
        requiresScheduleDate ? scheduleDate : undefined,
        operation.current.id,
        operation.current.finishedAt,
        {
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
      const status = await onCheckConfirmation(operation.current.id);
      if (!scope.isActive()) return;
      if (status === "applied") closeModal();
      else
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
    <div className="w-[24rem] max-w-[calc(100vw-2rem)] rounded-md bg-white px-4 py-4 text-gray-800 dark:bg-slate-800 dark:text-white">
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
              saving ||
              blocked ||
              !selectedResult ||
              (requiresProposal && !validProposal) ||
              (requiresCancellation &&
                (!cancelIds.length || loadingProposals || !!proposalError)) ||
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
