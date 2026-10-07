import { Alert, Button, IconButton, MenuItem, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useRef, useState } from "react";
import { AppContext } from "../../../app-context";
import { WhatsappContext } from "../../../whatsapp-context";
import { InternalChatContext } from "../../../internal-context";
import useChatActionScope from "./use-chat-action-scope";

interface TransferChatModalProps {
  chatId?: number;
  onSuccess?: () => void;
}

export default function TransferChatModal({ chatId, onSuccess }: TransferChatModalProps = {}) {
  const scope = useChatActionScope();
  const { closeModal } = useContext(AppContext);
  const { currentChat, transferAttendance } = useContext(WhatsappContext);
  const { users } = useContext(InternalChatContext);

  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const handleTransfer = async () => {
    const targetId = chatId ?? currentChat?.id;
    if (!selectedUser || !targetId || submitting.current || !scope.isActive()) return;
    submitting.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await transferAttendance(targetId, selectedUser);
      if (!scope.isActive()) return;
      closeModal();
      onSuccess?.();
    } catch {
      if (scope.isActive())
        setError(
          "Não foi possível confirmar a transferência. Confira o atendente da conversa antes de tentar novamente.",
        );
    } finally {
      submitting.current = false;
      if (scope.isActive()) setIsSubmitting(false);
    }
  };

  if (!scope.valid) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-chat-title"
      className="w-[26rem] max-w-[calc(100vw-2rem)] rounded-md bg-slate-100 px-4 py-4 text-slate-900 dark:bg-slate-700 dark:text-white"
    >
      <header className="flex items-center justify-between pb-8">
        <h1 id="transfer-chat-title" className="text-xl">
          Transferir conversa
        </h1>
        <IconButton onClick={closeModal} disabled={isSubmitting} aria-label="Fechar transferência">
          <CloseIcon />
        </IconButton>
      </header>
      <form className="flex flex-col gap-6">
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          select
          label="Usuário"
          required
          value={selectedUser ?? ""}
          disabled={isSubmitting}
          onChange={(e) => setSelectedUser(Number(e.target.value))}
          slotProps={{
            select: {
              MenuProps: {
                PaperProps: {
                  className: "scrollbar-whatsapp",
                  style: {
                    maxHeight: 48 * 5 + 8, // 5 itens de 48px + padding
                  },
                },
              },
            },
          }}
        >
          <MenuItem key={`admin:-1`} value={-1}>
            Todos os supervisores
          </MenuItem>
          {users?.map((user) => (
            <MenuItem key={user.CODIGO} value={user.CODIGO}>
              {user.NOME_EXIBICAO || user.NOME}
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
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="contained"
            color="primary"
            className="w-32"
            disabled={!selectedUser || isSubmitting}
            onClick={handleTransfer}
          >
            {isSubmitting ? "Transferindo..." : "Transferir"}
          </Button>
        </div>
      </form>
    </div>
  );
}
