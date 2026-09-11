import { useContext, useState } from "react";
import { ChatContext } from "./chat-context";

export default function ChatPendingSends() {
  const {
    pendingSends,
    checkPendingSend,
    restoreFailedSend,
    discardFailedSend,
    acknowledgeInternalSend,
  } = useContext(ChatContext);
  const [checking, setChecking] = useState<string | null>(null);
  if (!pendingSends.length) return null;

  const check = async (id: string) => {
    setChecking(id);
    try {
      await checkPendingSend(id);
    } finally {
      setChecking((current) => (current === id ? null : current));
    }
  };

  return (
    <section
      aria-label="Mensagens aguardando confirmação"
      aria-live="polite"
      className="max-h-48 shrink-0 overflow-y-auto border-t border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {pendingSends.map((attempt) => (
        <div
          key={attempt.id}
          className="mb-2 ml-auto max-w-lg rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700"
        >
          {(!attempt.messageId || attempt.status !== "sending") && (
            <p className="max-h-20 overflow-auto whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
              {attempt.snapshot.text}
            </p>
          )}
          {(!attempt.messageId || attempt.status !== "sending") &&
            (attempt.fileName || attempt.snapshot.fileId) && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {attempt.fileName || "Anexo"}
              </p>
            )}
          <p
            className={`mt-1 text-xs ${attempt.status === "queued" || attempt.status === "sending" ? "text-slate-500 dark:text-slate-400" : "text-amber-700 dark:text-amber-300"}`}
          >
            {attempt.status === "queued"
              ? "Na fila…"
              : attempt.status === "sending"
                ? "Enviando…"
                : attempt.status === "failed"
                  ? "Não enviada"
                  : "Aguardando confirmação"}
          </p>
          {attempt.error && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{attempt.error}</p>
          )}
          {(attempt.status === "unconfirmed" || attempt.messageId) && attempt.clientId && (
            <button
              type="button"
              disabled={checking === attempt.id}
              onClick={() => void check(attempt.id)}
              className="mt-2 text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-300"
            >
              {checking === attempt.id ? "Consultando…" : "Consultar envio"}
            </button>
          )}
          {attempt.status === "unconfirmed" && !attempt.clientId && (
            <button
              type="button"
              onClick={() => acknowledgeInternalSend(attempt.id)}
              className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300"
            >
              Já conferi na conversa
            </button>
          )}
          {attempt.status === "failed" && (
            <div className="mt-2 flex gap-4 text-xs">
              <button
                type="button"
                onClick={() => restoreFailedSend(attempt.id)}
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-300"
              >
                Recuperar mensagem
              </button>
              <button
                type="button"
                onClick={() => discardFailedSend(attempt.id)}
                className="text-slate-500 hover:underline dark:text-slate-400"
              >
                Descartar
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
