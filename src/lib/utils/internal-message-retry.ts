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
  // Um status vindo do servidor substitui o PENDING otimista local.
  const base = withoutOptimisticRetry(message);
  const status = compareMessageStatus(message.status, event.status);
  if (status !== "ERROR") {
    return { ...base, status, whatsappRetry: null };
  }
  if (event.status === "ERROR" && event.whatsappRetry !== undefined) {
    return { ...base, status, whatsappRetry: event.whatsappRetry };
  }
  return { ...base, status };
}

/**
 * Marca local (não vem do backend) do PENDING aplicado pelo próprio clique.
 * Só esse PENDING pode ser desfeito; um PENDING confirmado por socket não.
 */
const OPTIMISTIC_RETRY: unique symbol = Symbol("internalMessageOptimisticRetry");

type MaybeOptimistic = InternalMessage & { [OPTIMISTIC_RETRY]?: true };

export function isOptimisticRetryPending(message: InternalMessage) {
  return message.status === "PENDING" && (message as MaybeOptimistic)[OPTIMISTIC_RETRY] === true;
}

function withoutOptimisticRetry(message: InternalMessage): InternalMessage {
  if (!(OPTIMISTIC_RETRY in message)) return message;
  const copy: MaybeOptimistic = { ...(message as MaybeOptimistic) };
  delete copy[OPTIMISTIC_RETRY];
  return copy;
}

/** PENDING otimista; só se aplica se a mensagem ainda estiver em ERROR no estado local. */
export function markInternalMessageRetryPending(message: InternalMessage): InternalMessage {
  if (message.status !== "ERROR") return message;
  const pending: MaybeOptimistic = {
    ...message,
    status: "PENDING",
    whatsappRetry: null,
    [OPTIMISTIC_RETRY]: true as const,
  };
  return pending;
}

/**
 * Desfaz o PENDING otimista. Se outro evento já mudou o status (inclusive um
 * PENDING real vindo do socket), mantém o estado mais recente.
 */
export function rollbackInternalMessageRetry(
  current: InternalMessage,
  original: InternalMessage,
  hint?: InternalMessageWhatsappRetry | null,
): InternalMessage {
  if (!isOptimisticRetryPending(current)) return current;
  return {
    ...withoutOptimisticRetry(current),
    status: "ERROR",
    whatsappRetry: hint !== undefined ? hint : (original.whatsappRetry ?? null),
  };
}

/** Após o 202 o PENDING passa a ser o estado real do backend. */
export function confirmInternalMessageRetry(current: InternalMessage): InternalMessage {
  return isOptimisticRetryPending(current) ? withoutOptimisticRetry(current) : current;
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
  if (error.status === 403) return "Apenas o autor ou um administrador pode reenviar esta mensagem.";
  if (error.status === 404) return "Mensagem não encontrada.";
  return RETRY_DEFAULT_ERROR_MESSAGE;
}

export interface InternalMessageRetryDeps {
  request: (messageId: number, confirmUncertain: boolean) => Promise<unknown>;
  /** Atualiza a mensagem em todos os estados locais (lista do chat e chat aberto). */
  update: (message: InternalMessage, apply: (current: InternalMessage) => InternalMessage) => void;
  notifyError: (text: string) => void;
  notifySuccess?: (text: string) => void;
}

/**
 * Reenvio com PENDING otimista. Em 409 CONFIRMATION_REQUIRED devolve
 * "confirmation-required" (sem toast) para o chamador abrir a confirmação;
 * nos demais erros volta para ERROR e mostra a mensagem do backend.
 */
export async function runInternalMessageRetry(
  message: InternalMessage,
  confirmUncertain: boolean,
  deps: InternalMessageRetryDeps,
): Promise<InternalMessageRetryResult> {
  deps.update(message, markInternalMessageRetryPending);
  try {
    await deps.request(message.id, confirmUncertain);
    deps.update(message, confirmInternalMessageRetry);
    deps.notifySuccess?.("Reenvio solicitado.");
    return "scheduled";
  } catch (error) {
    const parsed = readRetryError(error);
    if (parsed.status === 409 && parsed.code === "CONFIRMATION_REQUIRED") {
      deps.update(message, (current) =>
        rollbackInternalMessageRetry(current, message, uncertainRetryHint()),
      );
      return "confirmation-required";
    }
    // NOT_RETRYABLE: o backend já não considera a mensagem candidata (outro
    // reenvio venceu, já entregue etc.); esconde o botão até o próximo evento.
    const hint: InternalMessageWhatsappRetry | undefined =
      parsed.status === 409 && parsed.code === "NOT_RETRYABLE"
        ? { allowed: false, requiresConfirmation: true, reason: "NOT_RETRYABLE" }
        : undefined;
    deps.update(message, (current) => rollbackInternalMessageRetry(current, message, hint));
    deps.notifyError(retryErrorToastMessage(parsed));
    return "failed";
  }
}
