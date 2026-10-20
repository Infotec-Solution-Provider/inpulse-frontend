"use client";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";

import { InternalChatContext } from "@/app/(private)/[instance]/internal-context";
import { Button, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { FormEvent, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

interface AssignSenderNameDialogProps {
  senderId: string | null;
  onClose: () => void;
  onAssigned: (senderId: string) => void;
}

export default function AssignSenderNameDialog({
  senderId,
  onClose,
  onAssigned,
}: AssignSenderNameDialogProps) {
  const { internalApi, refreshWhatsappSenderNames } = useContext(InternalChatContext);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setName(""), [senderId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!senderId || name.trim().length < 2) return;

    setIsSaving(true);
    try {
      await internalApi.current.assignWhatsappSenderName(senderId, name.trim());
      await refreshWhatsappSenderNames();
      toast.success("Nome atribuído ao remetente.");
      onAssigned(senderId);
      onClose();
    } catch {
      toast.error("Não foi possível atribuir o nome ao remetente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={Boolean(senderId)}
      onClose={isSaving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Identificar remetente</DialogTitle>
        <DialogContent className="flex flex-col gap-4 !pt-2">
          <div className="rounded-lg bg-[var(--ip-surface)] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ip-muted)]">
              ID do WhatsApp
            </p>
            <p className="mt-1 break-all font-mono text-sm text-[var(--ip-text)]">{senderId}</p>
          </div>
          <TextField
            autoFocus
            fullWidth
            label="Nome para exibição"
            value={name}
            onChange={(event) => setName(event.target.value)}
            helperText="Este nome passará a identificar as mensagens antigas e futuras deste ID."
            inputProps={{ maxLength: 120 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={isSaving || name.trim().length < 2}>
            {isSaving ? "Salvando..." : "Salvar nome"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
