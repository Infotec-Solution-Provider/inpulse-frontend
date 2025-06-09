"use client";
import { Button, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext } from "react";
import { AppContext } from "../../../app-context";
import { InternalChatContext } from "../../../internal-context";
import { WhatsappContext } from "../../../whatsapp-context";

export default function DeleteChatModal() {
  const { closeModal } = useContext(AppContext);
  const { deleteInternalChat } = useContext(InternalChatContext);
  const {  currentChatRef } = useContext(WhatsappContext);

  const handledeleteChat = () => {
    if (currentChatRef && currentChatRef.current) {
      deleteInternalChat(currentChatRef.current.id); // TODO: Passar o resultado correto
      closeModal();
    }
  };

  return (
<div className="w-[26rem] rounded-md bg-white dark:bg-slate-700 px-6 py-6 text-gray-900 dark:text-white">
  <header className="flex items-center justify-between pb-6 text-gray-900 dark:text-white">
    <h1 className="text-xl font-semibold">Finalizar conversa</h1>
    <IconButton onClick={closeModal} className="text-gray-900 dark:text-white">
      <CloseIcon />
    </IconButton>
  </header>

  <form className="flex flex-col gap-8">
    <Typography
      variant="h6"
      align="center"
      className="font-semibold leading-relaxed text-gray-900 dark:text-white"
      sx={{ fontSize: "1.25rem", maxWidth: "20rem", margin: "0 auto", userSelect: "none" }}
    >
      Todos os dados dessa conversa serão excluídos.
      <br />
      <span className="block mt-2 text-red-400 font-bold">Deseja fazer isso?</span>
    </Typography>

    <div className="flex items-center justify-center gap-4 mt-4">
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
        color="error"
        className="w-32"
        onClick={handledeleteChat}
        disabled={!currentChatRef.current}
      >
        Finalizar
      </Button>
    </div>
  </form>
</div>

  );
}
