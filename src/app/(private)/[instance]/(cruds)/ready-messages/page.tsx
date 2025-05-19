"use client";
import { Button } from "@mui/material";
import { useReadyMessagesContext } from "./ready-messages-context";
import ReadyMessagesList from "./ready-messages-list";
import { useAppContext } from "../../app-context";
import CreateReadyMessageModal from "./(modal)/create-ready-message-modal";

export default function ReadyMessagesPage() {
  const { openModal } = useAppContext();

  const { createReadyMessage } = useReadyMessagesContext();

  const openCreateGroupModal = () => {
    openModal(
      <CreateReadyMessageModal
        onSubmit={({ TITULO, TEXTO_MENSAGEM, SETOR, ARQUIVO }) =>
          createReadyMessage(ARQUIVO, TITULO, TEXTO_MENSAGEM)
        }
      />
    );
  };

  return (
    <div className="mx-auto box-border grid max-w-[75rem] grid-cols-[75rem] grid-rows-[1fr_auto] gap-8 py-8">
      <ReadyMessagesList />
      <div className="flex h-max w-full justify-end">
        <Button variant="outlined" size="large" onClick={openCreateGroupModal}>
          Cadastrar
        </Button>
      </div>
    </div>
  );
}
