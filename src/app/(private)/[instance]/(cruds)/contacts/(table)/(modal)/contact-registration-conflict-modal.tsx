"use client";

import { ContactRegistrationConflict } from "@/lib/sdk-local";
import { Alert, Button, Chip, CircularProgress, Divider } from "@mui/material";
import { useState } from "react";

interface Props {
  conflict: ContactRegistrationConflict;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export default function ContactRegistrationConflictModal({ conflict, onCancel, onConfirm }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const contact = conflict.existingContact;
  const customer = contact.customer;
  const isDeleted = contact.isDeleted === true;
  const customerId =
    customer?.CODIGO && customer.CODIGO > 0
      ? customer.CODIGO
      : contact.customerId && contact.customerId > 0
        ? contact.customerId
        : null;
  const customerLabel = customerId
    ? `${customer?.RAZAO || customer?.FANTASIA || "Cliente"} (#${customerId})`
    : null;

  const handleConfirm = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível concluir o cadastro. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Contato já cadastrado
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {customerLabel
              ? `Este número já está cadastrado no cliente ${customerLabel}.`
              : "Este número já está cadastrado na ferramenta e não possui cliente vinculado."}
          </p>
        </div>
        <Chip
          label={isDeleted ? "Desativado" : "Ativo"}
          color={isDeleted ? "warning" : "success"}
          size="small"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900/50 sm:grid-cols-2">
        <div>
          <span className="text-slate-500">Nome atual</span>
          <p className="font-medium text-slate-900 dark:text-white">{contact.name}</p>
        </div>
        <div>
          <span className="text-slate-500">WhatsApp</span>
          <p className="font-medium text-slate-900 dark:text-white">{contact.phone}</p>
        </div>
        <div className="sm:col-span-2">
          <span className="text-slate-500">Cliente vinculado</span>
          <p className="font-medium text-slate-900 dark:text-white">
            {customerLabel || "Nenhum cliente vinculado"}
          </p>
        </div>
      </div>

      <Divider sx={{ my: 2 }} />

      {isDeleted && conflict.requiresSupervisorApproval ? (
        <Alert severity="warning">
          Este contato foi desativado. Sua alteração será enviada ao supervisor, que poderá aprovar
          ou rejeitar a reativação.
        </Alert>
      ) : isDeleted ? (
        <Alert severity="info">
          Este contato está desativado. Ao confirmar, ele será reativado e os dados informados
          substituirão o cadastro atual.
        </Alert>
      ) : (
        <Alert severity="info">
          Ao confirmar, nome, cliente e setores serão substituídos pelos dados informados no novo
          cadastro.
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="outlined" color="inherit" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleConfirm} disabled={submitting}>
          {submitting ? (
            <CircularProgress size={20} color="inherit" />
          ) : isDeleted && conflict.requiresSupervisorApproval ? (
            "Enviar solicitação"
          ) : isDeleted ? (
            "Reativar e sobrescrever"
          ) : (
            "Sobrescrever cadastro"
          )}
        </Button>
      </div>
    </div>
  );
}
