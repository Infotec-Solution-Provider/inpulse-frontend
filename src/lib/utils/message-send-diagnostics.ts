export type SendStage = "unknown" | "prepare" | "hash" | "file-lookup" | "upload" | "authentication" | "request";

export interface MessageSendDiagnostic {
  at: string;
  stage: SendStage;
  httpStatus?: number;
  code?: string;
  online?: boolean;
}

/** Preserve the original cause for delivery classification; never serialize Axios config. */
export class MessageSendStageError extends Error {
  constructor(public readonly stage: SendStage, cause: unknown) {
    super(cause instanceof Error ? cause.message : "Não foi possível enviar a mensagem.", { cause });
    this.name = "MessageSendStageError";
  }
}

export function messageSendDiagnostic(error: unknown): MessageSendDiagnostic {
  const diagnostic: MessageSendDiagnostic = { at: new Date().toISOString(), stage: "unknown" };
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") diagnostic.online = navigator.onLine;
  const visited = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if (current instanceof MessageSendStageError) diagnostic.stage = current.stage;
    const candidate = current as { response?: { status?: unknown }; code?: unknown; cause?: unknown };
    const status = candidate.response?.status;
    if (typeof status === "number") diagnostic.httpStatus = status;
    if (typeof candidate.code === "string" && /^[A-Z0-9_]{1,64}$/.test(candidate.code))
      diagnostic.code = candidate.code;
    current = candidate.cause;
  }
  return diagnostic;
}

export function formatSendDiagnostic(attempt: {
  id: string;
  status: string;
  clientId?: number;
  chatId?: number;
  messageId?: number;
  diagnostic?: MessageSendDiagnostic;
}): string {
  return JSON.stringify({
    attemptId: attempt.id,
    status: attempt.status,
    clientId: attempt.clientId,
    chatId: attempt.chatId,
    messageId: attempt.messageId,
    diagnostic: attempt.diagnostic,
  }, null, 2);
}
