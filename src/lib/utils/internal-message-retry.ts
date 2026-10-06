import type {
  InternalMessage,
  InternalMessageStatusEventData,
  InternalMessageWhatsappRetry,
} from "@/lib/sdk-local";
import compareMessageStatus from "./compare-message-status";

export type InternalMessageRetryResult = "scheduled" | "confirmation-required" | "failed";

export type InternalMessageRetryErrorCode = "CONFIRMATION_REQUIRED" | "RETRY_LIMIT" | "NOT_RETRYABLE";

const UNCERTAIN_RETRY_HINT: InternalMessageWhatsappRetry = {
  allowed: true,
  requiresConfirmation: true,
};

interface RetryVisibilityInput {
  message: Pick<InternalMessage, "from" | "status" | "whatsappRetry">;
  chat: { chatType: string; wppGroupId?: string | null } | null | undefined;
  userId?: number | null;
  isAdmin: boolean;
  readOnly: boolean;
  selectionMode: boolean;
}

/**
 * "Reenviar" só aparece para mensagens com falha em grupos internos vinculados
 * ao WhatsApp, para o autor ou um ADMIN. O backend valida as mesmas regras.
 */
export function canRetryInternalMessage({
  message,
  chat,
  userId,
  isAdmin,
  readOnly,
  selectionMode,
}: RetryVisibilityInput) {
  const isMine = userId != null && message.from === `user:${userId}`;
  return (
    !readOnly &&
    !selectionMode &&
    (isMine || isAdmin) &&
    chat?.chatType === "internal" &&
    !!chat.wppGroupId &&
    message.status === "ERROR" &&
    message.whatsappRetry?.allowed !== false
  );
}

/**
 * Sem dica explícita do backend (UNKNOWN, FAILED não classificado ou mensagem
 * antiga) o reenvio exige confirmação: o grupo pode receber a mensagem duas vezes.
 */
export function retryRequiresConfirmation(message: Pick<InternalMessage, "whatsappRetry">) {
  return message.whatsappRetry?.requiresConfirmation !== false;
}

/** Aplica um evento `internal_message_status`, mantendo a dica só enquanto ERROR. */
export function applyInternalMessageStatusEvent(
  message: InternalMessage,
  event: Pick<InternalMessageStatusEventData, "status" | "whatsappRetry">,
): InternalMessage {
  const status = compareMessageStatus(message.status, event.status);
  if (status !== "ERROR") {
    return { ...message, status, whatsappRetry: null };
  }
  if (event.status === "ERROR" && event.whatsappRetry !== undefined) {
    return { ...message, status, whatsappRetry: event.whatsappRetry };
  }
  return { ...message, status };
}

export function markInternalMessageRetryPending(message: InternalMessage): InternalMessage {
  return { ...message, status: "PENDING", whatsappRetry: null };
}

/**
 * Desfaz o PENDING otimista. Se outro evento já mudou o status, mantém o
 * estado mais recente.
 */
export function rollbackInternalMessageRetry(
  current: InternalMessage,
  original: InternalMessage,
  hint?: InternalMessageWhatsappRetry | null,
): InternalMessage {
  if (current.status !== "PENDING") return current;
  return {
    ...current,
    status: "ERROR",
    whatsappRetry: hint !== undefined ? hint : (original.whatsappRetry ?? null),
  };
}

export function uncertainRetryHint(): InternalMessageWhatsappRetry {
  return { ...UNCERTAIN_RETRY_HINT };
}

interface ErrorWithResponse {
  response?: { status?: number; data?: unknown };
  cause?: unknown;
}

function findResponse(error: unknown) {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current && typeof current === "object"; depth++) {
    const candidate = current as ErrorWithResponse;
    if (candidate.response) return candidate.response;
    current = candidate.cause;
  }
  return undefined;
}

function readCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const body = data as Record<string, unknown>;
  for (const value of [body.code, (body.data as Record<string, unknown> | undefined)?.code]) {
    if (typeof value === "string" && value) return value;
  }
  const nested = body.error ?? body.cause;
  if (nested && typeof nested === "object") {
    const code = (nested as Record<string, unknown>).code;
    if (typeof code === "string" && code) return code;
  }
  return undefined;
}

/**
 * Extrai status HTTP, `code` e mensagem do corpo da resposta a partir do erro
 * devolvido pelo ApiClient (o AxiosError original fica em `cause`).
 */
export function readRetryError(error: unknown): {
  status?: number;
  code?: string;
  message?: string;
} {
  const response = findResponse(error);
  const data = response?.data;
  const bodyMessage =
    data && typeof data === "object" && typeof (data as { message?: unknown }).message === "string"
      ? ((data as { message: string }).message || undefined)
      : undefined;
  return { status: response?.status, code: readCode(data), message: bodyMessage };
}

export const RETRY_DEFAULT_ERROR_MESSAGE = "Não foi possível reenviar a mensagem.";

export function retryErrorToastMessage(error: ReturnType<typeof readRetryError>) {
  if (error.message) return error.message;
  if (error.code === "RETRY_LIMIT") return "Limite de reenvios atingido para esta mensagem.";
  if (error.code === "NOT_RETRYABLE") return "Esta mensagem não pode mais ser reenviada.";
  if (error.status === 403) return "Apenas o autor ou um supervisor pode reenviar esta mensagem.";
  if (error.status === 404) return "Mensagem não encontrada.";
  return RETRY_DEFAULT_ERROR_MESSAGE;
}
