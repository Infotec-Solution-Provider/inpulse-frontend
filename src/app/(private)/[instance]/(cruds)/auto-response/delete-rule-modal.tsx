"use client";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";

import { AutomaticResponseRule } from "@/lib/sdk-local";
import { DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import { useAutoResponseContext } from "./auto-response.context";

interface DeleteRuleModalProps {
  rule: AutomaticResponseRule;
}

export default function DeleteRuleModal({ rule }: DeleteRuleModalProps) {
  const { closeModal, deleteRule } = useAutoResponseContext();

  const handleDelete = () => {
    deleteRule(rule.id);
  };

  return (
    <Dialog open={true} onClose={closeModal}>
      <DialogTitle>Confirmar Exclusão</DialogTitle>
      <DialogContent>
        <Typography>
          Tem certeza que deseja excluir a regra <strong>&quot;{rule.name}&quot;</strong>? Esta ação
          não pode ser desfeita.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeModal}>Cancelar</Button>
        <Button onClick={handleDelete} color="error" variant="contained">
          Excluir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
