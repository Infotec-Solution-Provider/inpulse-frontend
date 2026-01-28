"use client";
import { Button, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext } from "react";
import { AppContext } from "../../../app-context";
import { InternalChatContext } from "../../../internal-context";
import { WhatsappContext } from "../../../whatsapp-context";

export default function FinishInternalChatModal() {
  const { closeModal } = useContext(AppContext);
  const { finishInternalChat } = useContext(InternalChatContext);
  const { currentChatRef } = useContext(WhatsappContext);

  const handleFinishChat = () => {
    const chat = currentChatRef.current;

    if (!chat || chat.chatType !== "internal" || chat.isGroup) return;

    finishInternalChat(chat.id);
    closeModal();
  };

  const isDisabled =
    !currentChatRef.current ||
    currentChatRef.current.chatType !== "internal" ||
    currentChatRef.current.isGroup;

  return (
    <div className="w-[26rem] rounded-md bg-white px-6 py-6 text-gray-900 dark:bg-slate-700 dark:text-white">
      <header className="flex items-center justify-between pb-6">
        <h1 className="text-xl font-semibold">Finalizar conversa interna</h1>
        <IconButton onClick={closeModal} className="text-gray-900 dark:text-white">
          <CloseIcon />
        </IconButton>
      </header>

      <div className="flex flex-col gap-8">
        <Typography
          variant="h6"
          align="center"
          className="font-semibold leading-relaxed"
          sx={{ fontSize: "1.1rem", maxWidth: "22rem", margin: "0 auto", userSelect: "none" }}
        >
          Esta conversa interna será finalizada.
          <br />
          <span className="mt-2 block text-slate-400">Nenhum resultado é necessário.</span>
        </Typography>

        <div className="flex items-center justify-center gap-4">
          <Button
            type="button"
            variant="outlined"
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
            disabled={isDisabled}
          >
            Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
}
