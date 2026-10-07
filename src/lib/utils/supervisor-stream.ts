import type {
	SendSupervisorAiMessageResponse,
	SupervisorAiErrorCode,
	SupervisorAiMessage,
	SupervisorAiStepKind,
	SupervisorAiStepStatus,
	SupervisorAiStreamStep,
} from "@/lib/types/sdk-local.types";

const ERROR_CODES: readonly SupervisorAiErrorCode[] = [
	"budget",
	"disabled",
	"model",
	"rate_limit",
	"timeout",
	"provider",
	"connection",
	"unknown",
];
const NON_RETRYABLE_CODES: readonly SupervisorAiErrorCode[] = ["budget", "disabled", "model"];
const STEP_KINDS: readonly SupervisorAiStepKind[] = ["thinking", "tool"];
const STEP_STATUSES: readonly SupervisorAiStepStatus[] = ["running", "done", "error"];

export const STREAM_FALLBACK_ERROR_MESSAGE = "Não foi possível concluir a resposta do assistente. Tente novamente.";
export const STREAM_CONNECTION_ERROR_MESSAGE = "Não foi possível falar com o assistente. Verifique sua conexão e tente novamente.";
export const STREAM_INTERRUPTED_ERROR_MESSAGE = "A conexão com o assistente caiu antes de a resposta ficar pronta. Tente novamente.";

/** Falha do streaming do Assistente do gestor, já classificada para a tela decidir o que mostrar. */
export class SupervisorStreamError extends Error {
	readonly code: SupervisorAiErrorCode;
	readonly retryable: boolean;
	/** Pergunta gravada no histórico antes da falha (quando houver). */
	readonly userMessage: SupervisorAiMessage | null;
	/** Resposta de erro gravada no histórico (quando houver). */
	readonly assistantMessage: SupervisorAiMessage | null;

	constructor(
		message: string,
		options: {
			code?: SupervisorAiErrorCode;
			retryable?: boolean;
			userMessage?: SupervisorAiMessage | null;
			assistantMessage?: SupervisorAiMessage | null;
		} = {},
	) {
		super(message);
		this.name = "SupervisorStreamError";
		this.code = options.code ?? "unknown";
		this.retryable = options.retryable ?? isRetryableByDefault(this.code);
		this.userMessage = options.userMessage ?? null;
		this.assistantMessage = options.assistantMessage ?? null;
	}
}

export function isRetryableByDefault(code: SupervisorAiErrorCode): boolean {
	return !NON_RETRYABLE_CODES.includes(code);
}

function toErrorCode(value: unknown): SupervisorAiErrorCode {
	return ERROR_CODES.includes(value as SupervisorAiErrorCode) ? value as SupervisorAiErrorCode : "unknown";
}

function toSupervisorMessage(value: unknown): SupervisorAiMessage | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<SupervisorAiMessage>;
	return typeof candidate.id === "number" && typeof candidate.role === "string" ? candidate as SupervisorAiMessage : null;
}

export function streamErrorFromPayload(payload: Record<string, unknown>): SupervisorStreamError {
	const message = typeof payload.message === "string" && payload.message.trim()
		? payload.message
		: STREAM_FALLBACK_ERROR_MESSAGE;
	const code = toErrorCode(payload.code);
	return new SupervisorStreamError(message, {
		code,
		retryable: typeof payload.retryable === "boolean" ? payload.retryable : isRetryableByDefault(code),
		userMessage: toSupervisorMessage(payload.userMessage),
		assistantMessage: toSupervisorMessage(payload.assistantMessage),
	});
}

/** Erro de uma resposta HTTP recusada antes de o streaming começar. */
export function streamErrorFromResponse(status: number, body: unknown): SupervisorStreamError {
	const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
	const message = typeof payload.message === "string" && payload.message.trim()
		? payload.message
		: "Não foi possível iniciar a resposta do assistente.";
	if (typeof payload.code === "string" && ERROR_CODES.includes(payload.code as SupervisorAiErrorCode)) {
		return streamErrorFromPayload({ ...payload, message });
	}
	if (status === 503) return new SupervisorStreamError(message, { code: "disabled", retryable: false });
	if (status === 429) return new SupervisorStreamError(message, { code: "rate_limit", retryable: true });
	if (status === 408 || status === 504) return new SupervisorStreamError(message, { code: "timeout", retryable: true });
	return new SupervisorStreamError(message, { code: "unknown", retryable: status >= 500 });
}

export function parseStreamStep(payload: Record<string, unknown>): SupervisorAiStreamStep | null {
	const { id, kind, label, status, round, durationMs } = payload;
	if (typeof id !== "string" || !id) return null;
	if (!STEP_KINDS.includes(kind as SupervisorAiStepKind)) return null;
	if (!STEP_STATUSES.includes(status as SupervisorAiStepStatus)) return null;
	return {
		id,
		kind: kind as SupervisorAiStepKind,
		label: typeof label === "string" && label.trim() ? label.trim() : "Consultando dados",
		status: status as SupervisorAiStepStatus,
		round: typeof round === "number" && Number.isFinite(round) ? round : 0,
		...(typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs >= 0 ? { durationMs } : {}),
	};
}

/** Lê um bloco SSE; blocos sem "data:" (como o keepalive ": ping") voltam null. */
export function parseSseBlock(block: string): { event: string; payload: Record<string, unknown> } | null {
	let event = "message";
	const dataLines: string[] = [];
	for (const line of block.split("\n")) {
		if (line.startsWith("event:")) event = line.slice(6).trim();
		if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
	}
	if (dataLines.length === 0) return null;
	try {
		const parsed: unknown = JSON.parse(dataLines.join("\n"));
		return parsed && typeof parsed === "object" ? { event, payload: parsed as Record<string, unknown> } : null;
	} catch {
		return null;
	}
}

export interface SupervisorStreamHandlers {
	onDelta?: (text: string) => void;
	onStep?: (step: SupervisorAiStreamStep) => void;
	/** Descarta o texto transmitido até agora para a resposta em andamento. */
	onReset?: () => void;
}

export interface SupervisorStreamParser {
	push: (text: string) => void;
	flush: () => void;
	result: () => SendSupervisorAiMessageResponse | null;
}

/** Consome o texto do streaming em pedaços; o evento "error" vira SupervisorStreamError. */
export function createSupervisorStreamParser(handlers: SupervisorStreamHandlers): SupervisorStreamParser {
	let buffer = "";
	let result: SendSupervisorAiMessageResponse | null = null;

	const dispatch = (block: string) => {
		const parsed = parseSseBlock(block);
		if (!parsed) return;
		const { event, payload } = parsed;
		if (event === "delta") {
			if (typeof payload.text === "string") handlers.onDelta?.(payload.text);
			return;
		}
		if (event === "step") {
			const step = parseStreamStep(payload);
			if (step) handlers.onStep?.(step);
			return;
		}
		if (event === "reset") {
			handlers.onReset?.();
			return;
		}
		if (event === "result") {
			result = payload as unknown as SendSupervisorAiMessageResponse;
			return;
		}
		if (event === "error") throw streamErrorFromPayload(payload);
	};

	const drain = () => {
		let boundary = buffer.indexOf("\n\n");
		while (boundary >= 0) {
			const block = buffer.slice(0, boundary);
			buffer = buffer.slice(boundary + 2);
			if (block.trim()) dispatch(block);
			boundary = buffer.indexOf("\n\n");
		}
	};

	return {
		push: (text) => {
			buffer = (buffer + text).replace(/\r\n/g, "\n");
			drain();
		},
		flush: () => {
			drain();
			const rest = buffer;
			buffer = "";
			if (rest.trim()) dispatch(rest);
		},
		result: () => result,
	};
}

/** Lê o corpo do streaming até o fim e devolve o "result" confirmado pelo ai-service. */
export async function readSupervisorStream(
	body: ReadableStream<Uint8Array>,
	handlers: SupervisorStreamHandlers,
	signal?: AbortSignal,
): Promise<SendSupervisorAiMessageResponse> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	const parser = createSupervisorStreamParser(handlers);

	try {
		while (true) {
			let chunk: ReadableStreamReadResult<Uint8Array>;
			try {
				chunk = await reader.read();
			} catch (error) {
				if (signal?.aborted) throw error;
				throw new SupervisorStreamError(STREAM_INTERRUPTED_ERROR_MESSAGE, { code: "connection", retryable: true });
			}
			parser.push(decoder.decode(chunk.value, { stream: !chunk.done }));
			if (chunk.done) break;
		}
		parser.flush();
	} catch (error) {
		void reader.cancel().catch(() => undefined);
		throw error;
	}

	const result = parser.result();
	if (!result) {
		throw new SupervisorStreamError(STREAM_INTERRUPTED_ERROR_MESSAGE, { code: "connection", retryable: true });
	}
	return result;
}
