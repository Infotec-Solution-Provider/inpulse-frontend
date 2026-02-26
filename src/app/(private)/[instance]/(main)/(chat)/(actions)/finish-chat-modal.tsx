"use client";
import CloseIcon from "@mui/icons-material/Close";
import { Button, IconButton, MenuItem, TextField } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../../app-context";
import { WhatsappContext } from "../../../whatsapp-context";

interface Result {
  id: number;
  name: string;
  COD_ACAO?: number;
}

export default function FinishChatModal() {
  const { closeModal } = useContext(AppContext);
  const { finishChat, currentChat, wppApi } = useContext(WhatsappContext);
  const [resultId, setResultId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [results, setResults] = useState<Result[]>([]);

  const handleFinishChat = () => {
    if (currentChat && resultId) {
      const selectedResult = results.find((r) => r.id === resultId);
      const needsScheduleDate = selectedResult?.COD_ACAO === 2;

      if (needsScheduleDate && !scheduleDate) {
        alert("Por favor, selecione uma data de agendamento!");
        return;
      }
      finishChat(currentChat.id, resultId, scheduleDate ? new Date(scheduleDate) : null);
      closeModal();
    }
  };

  const onChangeResult = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setResultId(value ? parseInt(value) : null);
  };

  useEffect(() => {
    wppApi.current.getResults().then((results) => {
      setResults(results.filter((r) => r.name.trim() !== ""));
    });
  }, []);

  return (
    <div className="w-[26rem] rounded-md bg-white px-4 py-4 text-gray-800 dark:bg-slate-800 dark:text-white">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Finalizar conversa</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <form className="flex flex-col gap-6">
        <TextField
          select
          label="Resultado"
          required
          onChange={onChangeResult}
          defaultValue={1}
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
              !resultId ||
                (resultId &&
                  results.find((r) => r.id === resultId)?.COD_ACAO === 2 &&
                  !scheduleDate),
            )}
          >
            Finalizar
          </Button>
        </div>
      </form>
    </div>
  );
}
