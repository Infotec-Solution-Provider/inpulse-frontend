"use client";

import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { useAuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { Formatter } from "@in.pulse-crm/utils";
import CloseIcon from "@mui/icons-material/Close";
import { Alert, Button, CircularProgress, IconButton, MenuItem, TextField } from "@mui/material";
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
  const { token } = useAuthContext();
  const { wppApi } = useWhatsappContext();
  const scope = useChatActionScope();
  const [resultId, setResultId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [results, setResults] = useState<TelephoneFinishResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
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
        if (token) {
          wppApi.current.setAuth(token);
        }

        const fetchedResults = await wppApi.current.getResults();

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
  }, [token, wppApi]);

  const requiresScheduleDate = selectedResult?.COD_ACAO === 2;

  const handleConfirm = async () => {
    if (!selectedResult || blocked || submitting.current || !scope.isActive()) return;
    if (requiresScheduleDate && !scheduleDate) return;

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
