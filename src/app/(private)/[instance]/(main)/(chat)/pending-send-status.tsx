import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Tooltip } from "@mui/material";
import { useContext, type ReactNode } from "react";
import type { PendingChatSend } from "@/lib/utils/pending-chat-sends";
import { ChatContext } from "./chat-context";

const failureHints: Record<string, string> = {
  "Sessão indisponível para envio.": "Entre novamente para enviar.",
  "Nenhum canal selecionado para enviar a mensagem.": "Escolha um número para enviar.",
  "O destino do envio não está disponível. Recupere a mensagem.":
    "Abra a conversa novamente para enviar.",
  "O envio foi interrompido antes de iniciar. Recupere a mensagem para enviar.":
    "Envio interrompido. Você pode tentar novamente.",
};

function StatusIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip title={label} arrow>
      <span tabIndex={0} role="img" aria-label={label} className="inline-flex p-1">
        {children}
      </span>
    </Tooltip>
  );
}

function StatusAction({
  label,
  tooltip = label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  tooltip?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip title={tooltip} arrow>
      <span className="inline-flex">
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-default dark:hover:bg-white/10"
        >
          {children}
        </button>
      </span>
    </Tooltip>
  );
}

export default function PendingSendStatus({
  attempt,
  readOnly = false,
}: {
  attempt: PendingChatSend;
  readOnly?: boolean;
}) {
  const {
    pendingSendChecks,
    checkPendingSend,
    restoreFailedSend,
    discardFailedSend,
    acknowledgeInternalSend,
  } = useContext(ChatContext);
  const checkState = pendingSendChecks[attempt.id];
  const checking = checkState === "checking";
  const automatic = checkState === "automatic";
  const canCheck = !!attempt.clientId && (attempt.status === "unconfirmed" || !!attempt.messageId);
  const failureHint =
    (attempt.error && failureHints[attempt.error]) ||
    "Não foi possível enviar. Recupere a mensagem para tentar novamente.";
  // Announce state changes without narrating every background request.
  const announcement =
    attempt.status === "failed"
      ? failureHint
      : attempt.status === "queued"
        ? "Aguardando para enviar"
        : checkState === "paused" || (attempt.status === "unconfirmed" && !attempt.clientId)
          ? "Ainda sem confirmação de envio"
          : canCheck
            ? "Verificando envio"
            : "Enviando mensagem";
  const liveStatus = (
    <span className="sr-only" role="status" aria-atomic="true">
      {announcement}
    </span>
  );

  if (attempt.status === "failed") {
    return (
      <span className="inline-flex items-center text-red-600 dark:text-red-300">
        {liveStatus}
        <StatusIcon label={failureHint}>
          <ErrorOutlineIcon sx={{ fontSize: 16 }} />
        </StatusIcon>
        {!readOnly && (
          <>
            <StatusAction
              label="Recuperar mensagem"
              tooltip="Editar e tentar novamente"
              onClick={() => restoreFailedSend(attempt.id)}
            >
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            </StatusAction>
            <StatusAction label="Descartar mensagem" onClick={() => discardFailedSend(attempt.id)}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </StatusAction>
          </>
        )}
      </span>
    );
  }

  if (canCheck && !readOnly) {
    const label = checking ? "Verificando envio…" : "Verificar envio";
    const tooltip =
      checking || automatic ? "Verificando envio…" : "Ainda sem confirmação. Verificar envio";
    return (
      <span
        className={
          checking || automatic
            ? "text-slate-500 dark:text-slate-300"
            : "text-amber-700 dark:text-amber-300"
        }
      >
        {liveStatus}
        <StatusAction
          label={label}
          tooltip={tooltip}
          disabled={checking}
          onClick={() => void checkPendingSend(attempt.id)}
        >
          {checking ? (
            <RefreshIcon className="motion-safe:animate-spin" sx={{ fontSize: 16 }} />
          ) : automatic ? (
            <AccessTimeIcon sx={{ fontSize: 16 }} />
          ) : (
            <RefreshIcon sx={{ fontSize: 16 }} />
          )}
        </StatusAction>
      </span>
    );
  }

  const label =
    attempt.status === "queued"
      ? "Aguardando para enviar"
      : attempt.status === "sending"
        ? "Enviando…"
        : "Ainda sem confirmação de envio";
  return (
    <span className="inline-flex items-center text-slate-500 dark:text-slate-300">
      {liveStatus}
      <StatusIcon label={label}>
        <AccessTimeIcon sx={{ fontSize: 16 }} />
      </StatusIcon>
      {attempt.status === "unconfirmed" && !attempt.clientId && !readOnly && (
        <StatusAction
          label="Já conferi na conversa"
          tooltip="Confira na conversa se a mensagem chegou"
          onClick={() => acknowledgeInternalSend(attempt.id)}
        >
          <CheckIcon sx={{ fontSize: 16 }} />
        </StatusAction>
      )}
    </span>
  );
}
