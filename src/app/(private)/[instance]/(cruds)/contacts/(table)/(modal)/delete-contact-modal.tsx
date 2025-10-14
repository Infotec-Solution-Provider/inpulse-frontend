"use client";

import { Button, IconButton, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";
import { useContactsContext } from "../../contacts-context";
import { WppContact } from "@in.pulse-crm/sdk";
import { useAppContext } from "@/app/(private)/[instance]/app-context";

interface DeleteContactModalProps {
  contact: WppContact;
}

export default function DeleteContactModal({ contact }: DeleteContactModalProps) {
  const { deleteContact } = useContactsContext();
  const { closeModal } = useAppContext();

  const onClickDelete = () => {
    deleteContact(contact.id);
    closeModal();
  };

  return (
    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
      <header className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Deletar Contato</h1>
        <IconButton
          onClick={closeModal}
          className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Close />
        </IconButton>
      </header>

      <div className="mb-6">
        <Typography variant="body1" className="text-slate-700 dark:text-slate-300">
          Tem certeza que deseja excluir o contato{" "}
          <strong className="text-red-600 dark:text-red-400">&quot;{contact.name}&quot;</strong>?
        </Typography>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button onClick={closeModal} variant="outlined" color="inherit">
          Cancelar
        </Button>
        <Button variant="contained" color="error" onClick={onClickDelete}>
          Deletar
        </Button>
      </div>
    </div>
  );
}
