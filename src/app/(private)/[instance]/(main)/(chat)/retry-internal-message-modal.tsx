"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Button, CircularProgress, IconButton } from "@mui/material";
import { useState } from "react";

interface RetryInternalMessageModalProps {
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}

export default function RetryInternalMessageModal({
  onConfirm,
  onClose,
}: RetryInternalMessageModalProps) {
  const [inFlight, setInFlight] = useState(false);

  const handleConfirm = async () => {
    if (inFlight) return;
    setInFlight(true);
    try {
      await onConfirm();
    } finally {
      setInFlight(false);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="retry-internal-message-title"
      aria-describedby="retry-internal-message-description"
      className="w-[26rem] max-w-[calc(100vw-2rem)] rounded-md border border-slate-200 bg-white px-6 py-6 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      style={{ backgroundImage: "none" }}
    >
      <header className="flex items-start justify-between gap-4 pb-4">
        <h1 id="retry-internal-message-title" className="text-lg font-semibold">
          Reenviar ao grupo do WhatsApp?
        </h1>
        <IconButton
          size="small"
          aria-label="Fechar"
          onClick={onClose}
          disabled={inFlight}
          className="text-slate-600 dark:text-slate-300"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </header>

      <p
        id="retry-internal-message-description"
        className="text-sm leading-relaxed text-slate-700 dark:text-slate-300"
      >
        Não foi possível confirmar se esta mensagem chegou ao grupo. Se ela tiver chegado, o
        grupo vai recebê-la duas vezes.
      </p>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button type="button" variant="outlined" color="inherit" onClick={onClose} disabled={inFlight}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={inFlight}
          startIcon={inFlight ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          Reenviar
        </Button>
      </div>
    </div>
  );
}
