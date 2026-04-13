"use client";

import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { useAuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { Formatter } from "@in.pulse-crm/utils";
import CloseIcon from "@mui/icons-material/Close";
import { Button, CircularProgress, IconButton, MenuItem, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { TelephoneFinishResult, TelephoneQueueItem } from "./telephone-dialer.types";

interface TelephoneFinishModalProps {
  appointment: TelephoneQueueItem;
  onConfirm: (resultId: number, scheduleDate?: string) => Promise<void>;
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
}: TelephoneFinishModalProps) {
  const { closeModal } = useAppContext();
  const { token } = useAuthContext();
  const { wppApi } = useWhatsappContext();
  const [resultId, setResultId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [results, setResults] = useState<TelephoneFinishResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [saving, setSaving] = useState(false);

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
    if (!resultId) return;
    if (requiresScheduleDate && !scheduleDate) return;

    setSaving(true);

    try {
      await onConfirm(resultId, scheduleDate || undefined);
      closeModal();
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-[24rem] max-w-[calc(100vw-2rem)] rounded-md bg-white px-4 py-4 text-gray-800 dark:bg-slate-800 dark:text-white">
      <header className="flex items-center justify-between pb-5">
        <div>
          <h1 className="text-lg font-semibold">Finalizar atendimento</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {appointment.contactName} • {formatPhone(appointment.phone)}
          </p>
        </div>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>

      <form className="flex flex-col gap-4">
        {loadingResults ? (
          <div className="flex items-center justify-center py-6">
            <CircularProgress size={24} />
          </div>
        ) : (
          <TextField
            select
            label="Resultado"
            value={resultId ?? ""}
            onChange={(event) => setResultId(Number(event.target.value))}
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
            onChange={(event) => setScheduleDate(event.target.value)}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="contained" color="secondary" onClick={closeModal}>
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
              !resultId ||
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