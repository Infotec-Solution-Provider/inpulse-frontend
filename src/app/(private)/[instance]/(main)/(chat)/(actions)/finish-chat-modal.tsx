"use client";
import CloseIcon from "@mui/icons-material/Close";
import { Alert, Button, IconButton, MenuItem, TextField } from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../../../app-context";
import { WhatsappContext } from "../../../whatsapp-context";
import useChatActionScope from "./use-chat-action-scope";

interface Result {
  id: number;
  name: string;
  COD_ACAO?: number;
}

interface FinishChatModalProps {
  chatId?: number;
  onSuccess?: () => void;
}

export default function FinishChatModal({ chatId, onSuccess }: FinishChatModalProps = {}) {
  const scope = useChatActionScope();
  const { closeModal } = useContext(AppContext);
  const { finishChat, currentChat, wppApi } = useContext(WhatsappContext);
  const [resultId, setResultId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [results, setResults] = useState<Result[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsError, setResultsError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const submitting = useRef(false);

  const handleFinishChat = async () => {
    const targetId = chatId ?? currentChat?.id;
    if (targetId && resultId && !submitting.current && scope.isActive()) {
      const selectedResult = results.find((r) => r.id === resultId);
      const needsScheduleDate = selectedResult?.COD_ACAO === 2;

      if (needsScheduleDate && !scheduleDate) {
        setError("Selecione uma data de agendamento.");
        return;
      }
      submitting.current = true;
      setIsSubmitting(true);
      setError(null);
      try {
        await finishChat(targetId, resultId, scheduleDate ? new Date(scheduleDate) : null);
        if (!scope.isActive()) return;
        closeModal();
        onSuccess?.();
      } catch {
        if (scope.isActive())
          setError(
            "Não foi possível confirmar a finalização. Confira o estado da conversa antes de tentar novamente.",
          );
      } finally {
        submitting.current = false;
        if (scope.isActive()) setIsSubmitting(false);
      }
    }
  };

  const onChangeResult = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setResultId(value ? parseInt(value) : null);
  };

  useEffect(() => {
    let active = true;
    setResultsError(false);
    wppApi.current
      .getResults()
      .then((results) => {
        if (!active) return;
        setResults(results.filter((r) => r.name.trim() !== ""));
      })
      .catch(() => {
        if (active) setResultsError(true);
      });
    return () => {
      active = false;
    };
  }, [wppApi, loadAttempt]);

  if (!scope.valid) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-chat-title"
      className="w-[26rem] max-w-[calc(100vw-2rem)] rounded-md bg-white px-4 py-4 text-gray-800 dark:bg-slate-800 dark:text-white"
    >
      <header className="flex items-center justify-between pb-8">
        <h1 id="finish-chat-title" className="text-xl">
          Finalizar conversa
        </h1>
        <IconButton onClick={closeModal} disabled={isSubmitting} aria-label="Fechar finalização">
          <CloseIcon />
        </IconButton>
      </header>
      <form className="flex flex-col gap-6">
        {error && <Alert severity="error">{error}</Alert>}
        {resultsError && (
          <Alert
            severity="error"
            action={
              <Button onClick={() => setLoadAttempt((value) => value + 1)}>Tentar novamente</Button>
            }
          >
            Não foi possível carregar os resultados.
          </Alert>
        )}
        <TextField
          select
          label="Resultado"
          required
          onChange={onChangeResult}
          value={resultId ?? ""}
          disabled={isSubmitting}
          className="!text-sm"
          slotProps={{
            select: {
              maxRows: 5,
              MenuProps: {
                PaperProps: {
                  className: "!text-xsm max-w-[12rem] scrollbar-whatsapp",
                  sx: {
                    maxHeight: "20rem",
                  },
                },
              },
            },
          }}
        >
          {results.map((result) => (
            <MenuItem key={`result_${result.id}`} value={result.id}>
              {result.name}
            </MenuItem>
          ))}
        </TextField>

        {/* Mostrar input de data se COD_ACAO = 2 */}
        {resultId && results.find((r) => r.id === resultId)?.COD_ACAO === 2 && (
          <TextField
            type="datetime-local"
            label="Data e hora do agendamento"
            required
            value={scheduleDate}
            disabled={isSubmitting}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="!text-sm"
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="contained"
            color="secondary"
            className="w-32"
            onClick={closeModal}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="contained"
            color="primary"
            className="w-32"
            onClick={handleFinishChat}
            disabled={Boolean(
              isSubmitting ||
                !resultId ||
                (resultId &&
                  results.find((r) => r.id === resultId)?.COD_ACAO === 2 &&
                  !scheduleDate),
            )}
          >
            {isSubmitting ? "Finalizando..." : "Finalizar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
