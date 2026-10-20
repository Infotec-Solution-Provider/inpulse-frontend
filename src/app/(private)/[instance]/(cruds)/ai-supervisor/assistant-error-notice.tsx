"use client";

import { Refresh as RefreshRoundedIcon } from "@/lib/ui-system/crm-icons";
import { WarningAmberRounded as WarningAmberRoundedIcon } from "@/lib/ui-system/crm-icons";

/** Aviso de falha dentro da conversa, no lugar da bolha da resposta. */
export function AssistantErrorNotice({
  title,
  message,
  onRetry,
  retryDisabled = false,
  live = false,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  /** Aviso que acabou de aparecer (e não um aviso do histórico): leitores de tela o anunciam. */
  live?: boolean;
}) {
  return (
    <div
      role={live ? "alert" : undefined}
      className="flex max-w-[88%] gap-3 self-start rounded-2xl rounded-bl-none border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 shadow-none dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <WarningAmberRoundedIcon
        sx={{ fontSize: 20 }}
        className="mt-0.5 shrink-0 text-amber-500 dark:text-amber-400"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-amber-800 dark:text-amber-200/90">
          {message}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-[var(--ip-surface)] px-3 py-1 text-xs font-medium text-amber-800 shadow-none transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/40 dark:text-amber-200"
          >
            <RefreshRoundedIcon sx={{ fontSize: 16 }} aria-hidden />
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}
