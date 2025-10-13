"use client";
import { Button, IconButton, MenuItem, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../../app-context";
import { WhatsappContext } from "../../../whatsapp-context";

export default function FinishChatModal() {
  const { closeModal } = useContext(AppContext);
  const { finishChat, currentChat, wppApi, parameters } = useContext(WhatsappContext);
  const [resultId, setResultId] = useState<number | null>(null);
  const [results, setResults] = useState<{ id: number; name: string }[]>([]);
  const [triggerSatisfactionSurvey, setTriggerSatisfactionSurvey] = useState(false);

  const handleFinishChat = () => {
    if (currentChat && resultId) {
      finishChat(
        currentChat.id,
        resultId,
        triggerSatisfactionSurvey && parameters["satisfaction_survey_enabled"] === "true",
      );
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
            disabled={!resultId}
          >
            Finalizar
          </Button>
        </div>
      </form>
    </div>
  );
}
