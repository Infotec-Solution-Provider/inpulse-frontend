import type {
	SupervisorAiErrorCode,
	SupervisorAiMessage,
	SupervisorAiMessageError,
} from "@/lib/types/sdk-local.types";
import {
	isRetryableByDefault,
	STREAM_CONNECTION_ERROR_MESSAGE,
	streamErrorFromResponse,
	SupervisorStreamError,
	toErrorCode,
} from "./supervisor-stream";

export const SEND_FALLBACK_ERROR_MESSAGE = "Não foi possível enviar sua pergunta. Tente novamente.";

const ERROR_TITLES: Record<SupervisorAiErrorCode, string> = {
	budget: "Limite de uso da IA atingido",
	disabled: "Assistente indisponível",
	model: "Pedido recusado pelo modelo",
	rate_limit: "Muitas solicitações no momento",
	timeout: "A resposta demorou demais",
	provider: "Instabilidade na IA",
	connection: "A conexão caiu",
	unknown: "A resposta não foi concluída",
};

const NETWORK_ERROR_MESSAGES = ["failed to fetch", "networkerror when attempting to fetch resource.", "load failed", "network error"];

export function errorNoticeTitle(code: SupervisorAiErrorCode): string {
	return ERROR_TITLES[code];
}

/** metadata.error de uma resposta do assistente; null quando a mensagem não é um aviso de erro. */
export function messageError(entry: Pick<SupervisorAiMessage, "role" | "metadata">): SupervisorAiMessageError | null {
	if (entry.role !== "ASSISTANT") return null;
	const raw = entry.metadata?.error as Partial<SupervisorAiMessageError> | null | undefined;
	if (!raw || typeof raw !== "object") return null;
	const code = toErrorCode(raw.code);
	return {
		code,
		retryable: typeof raw.retryable === "boolean" ? raw.retryable : isRetryableByDefault(code),
		message: typeof raw.message === "string" ? raw.message : "",
	};
}

/** Texto amigável do aviso: o conteúdo gravado pelo ai-service ou um padrão pelo código. */
export function errorNoticeMessage(entry: Pick<SupervisorAiMessage, "content">, error: SupervisorAiMessageError): string {
	const content = entry.content.trim();
	if (content) return content;
	return error.retryable
		? "Não foi possível concluir a resposta do assistente. Tente novamente."
		: "Não foi possível concluir a resposta do assistente. Avise o administrador.";
}

/**
 * Pergunta que o botão "Tentar novamente" repete: só quando o aviso é a última
 * mensagem da sessão, pode ser repetido e tem uma pergunta logo antes.
 */
export function retryQuestionFor(messages: SupervisorAiMessage[], errorEntryId: number): SupervisorAiMessage | null {
	const last = messages.at(-1);
	if (!last || last.id !== errorEntryId || !messageError(last)?.retryable) return null;
	for (let index = messages.length - 2; index >= 0; index -= 1) {
		const entry = messages[index]!;
		if (entry.role === "USER") return entry;
		if (!messageError(entry)) return null;
	}
	return null;
}

/** Tira os avisos de erro que vieram depois da pergunta repetida, como o ai-service faz. */
export function withoutRetriedErrors(messages: SupervisorAiMessage[], userMessageId: number): SupervisorAiMessage[] {
	const index = messages.findIndex((entry) => entry.id === userMessageId);
	if (index < 0) return messages;
	return messages.filter((entry, position) => position <= index || !messageError(entry));
}

export interface SendFailureInfo {
	code: SupervisorAiErrorCode;
	retryable: boolean;
	message: string;
}

function isNetworkError(error: unknown): boolean {
	if (error instanceof TypeError) return true;
	if (!error || typeof error !== "object") return false;
	const candidate = error as { message?: unknown; code?: unknown; isAxiosError?: unknown; response?: unknown };
	if (candidate.code === "ERR_NETWORK") return true;
	if (candidate.isAxiosError === true && !candidate.response) return true;
	return typeof candidate.message === "string" && NETWORK_ERROR_MESSAGES.includes(candidate.message.trim().toLowerCase());
}

function axiosResponse(error: unknown): { status: number; data: unknown } | null {
	if (!error || typeof error !== "object" || (error as { isAxiosError?: unknown }).isAxiosError !== true) return null;
	const response = (error as { response?: { status?: unknown; data?: unknown } }).response;
	return response && typeof response.status === "number" ? { status: response.status, data: response.data } : null;
}

/** Falha do envio em texto para o usuário, sem detalhes técnicos nem mensagens em inglês. */
export function describeSendFailure(error: unknown): SendFailureInfo {
	if (error instanceof SupervisorStreamError) {
		return { code: error.code, retryable: error.retryable, message: error.message.trim() || SEND_FALLBACK_ERROR_MESSAGE };
	}
	const response = axiosResponse(error);
	if (response) {
		const classified = streamErrorFromResponse(response.status, response.data);
		return { code: classified.code, retryable: classified.retryable, message: classified.message };
	}
	if (isNetworkError(error)) {
		return { code: "connection", retryable: true, message: STREAM_CONNECTION_ERROR_MESSAGE };
	}
	return { code: "unknown", retryable: true, message: SEND_FALLBACK_ERROR_MESSAGE };
}

export type DroppedSendResolution =
	| { kind: "error_shown" }
	| { kind: "retry"; userMessage: SupervisorAiMessage }
	| { kind: "answered" }
	| { kind: "missing" };

/**
 * Depois de a conexão cair, compara o histórico recarregado com o que foi enviado:
 * a pergunta pode ter sido gravada (repetir sem duplicar), já ter resposta salva
 * ou nem ter chegado ao servidor.
 */
export function resolveDroppedSend(
	messages: SupervisorAiMessage[],
	sent: { knownIds: ReadonlySet<number>; userMessageId?: number; text?: string },
): DroppedSendResolution {
	const last = messages.at(-1);
	if (!last) return { kind: "missing" };
	const isSentQuestion = (entry: SupervisorAiMessage) => entry.role === "USER" && (sent.userMessageId !== undefined
		? entry.id === sent.userMessageId
		: !sent.knownIds.has(entry.id) && entry.content.trim() === (sent.text ?? "").trim());

	if (messageError(last)) return { kind: "error_shown" };
	if (isSentQuestion(last)) return { kind: "retry", userMessage: last };
	const previous = messages.at(-2);
	if (last.role === "ASSISTANT" && !sent.knownIds.has(last.id) && previous && isSentQuestion(previous)) {
		return { kind: "answered" };
	}
	return { kind: "missing" };
}
