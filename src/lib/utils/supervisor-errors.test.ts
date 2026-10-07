import { describe, expect, it } from "vitest";
import type { SupervisorAiMessage, SupervisorAiMessageMetadata } from "@/lib/types/sdk-local.types";
import {
	describeSendFailure,
	errorNoticeMessage,
	errorNoticeTitle,
	messageError,
	resolveDroppedSend,
	retryQuestionFor,
	SEND_FALLBACK_ERROR_MESSAGE,
	withoutRetriedErrors,
} from "./supervisor-errors";
import { STREAM_CONNECTION_ERROR_MESSAGE, SupervisorStreamError } from "./supervisor-stream";

const message = (
	id: number,
	role: "USER" | "ASSISTANT",
	content: string,
	metadata: SupervisorAiMessageMetadata | null = null,
): SupervisorAiMessage => ({ id, sessionId: 7, role, content, metadata, createdAt: "2026-10-07T12:00:00.000Z" });

const failed = (id: number, code: string, retryable?: boolean, content = "A IA demorou demais para responder. Tente novamente.") =>
	message(id, "ASSISTANT", content, { error: { code, ...(retryable === undefined ? {} : { retryable }), message: "timeout" } as never });

describe("avisos de erro gravados", () => {
	it("reconhece metadata.error só em respostas do assistente", () => {
		expect(messageError(failed(2, "timeout", true))).toEqual({ code: "timeout", retryable: true, message: "timeout" });
		expect(messageError(message(1, "USER", "Oi", { error: { code: "timeout", retryable: true, message: "x" } }))).toBeNull();
		expect(messageError(message(3, "ASSISTANT", "Tudo certo."))).toBeNull();
	});

	it("normaliza código desconhecido e a regra de repetição", () => {
		expect(messageError(failed(2, "outro"))).toMatchObject({ code: "unknown", retryable: true });
		expect(messageError(failed(2, "budget"))).toMatchObject({ code: "budget", retryable: false });
		expect(messageError(failed(2, "rate_limit", false))).toMatchObject({ code: "rate_limit", retryable: false });
	});

	it("usa o texto gravado ou um padrão em português", () => {
		const timeout = failed(2, "timeout", true);
		expect(errorNoticeMessage(timeout, messageError(timeout)!)).toBe("A IA demorou demais para responder. Tente novamente.");
		const empty = failed(3, "budget", false, "  ");
		expect(errorNoticeMessage(empty, messageError(empty)!)).toContain("Avise o administrador");
		expect(errorNoticeTitle("rate_limit")).toBe("Muitas solicitações no momento");
	});
});

describe("Tentar novamente", () => {
	const history = [
		message(1, "USER", "Como foi hoje?"),
		message(2, "ASSISTANT", "Tudo certo."),
		message(3, "USER", "E ontem?"),
		failed(4, "timeout", true),
	];

	it("só repete a partir do último aviso, apontando para a pergunta anterior", () => {
		expect(retryQuestionFor(history, 4)?.id).toBe(3);
		expect(retryQuestionFor([...history, message(5, "USER", "Outra")], 4)).toBeNull();
		expect(retryQuestionFor([...history.slice(0, 3), failed(4, "budget", false)], 4)).toBeNull();
		expect(retryQuestionFor([message(2, "ASSISTANT", "Oi"), failed(4, "timeout", true)], 4)).toBeNull();
	});

	it("tira da tela os avisos depois da pergunta repetida, sem mexer no resto", () => {
		const withOldError = [failed(0, "provider", true), ...history, failed(5, "provider", true)];
		expect(withoutRetriedErrors(withOldError, 3).map((entry) => entry.id)).toEqual([0, 1, 2, 3]);
		expect(withoutRetriedErrors(history, 99)).toBe(history);
	});
});

describe("falhas do envio", () => {
	it("mantém a classificação do streaming", () => {
		const error = new SupervisorStreamError("O limite de uso da IA foi atingido.", { code: "budget" });
		expect(describeSendFailure(error)).toEqual({ code: "budget", retryable: false, message: "O limite de uso da IA foi atingido." });
	});

	it("troca erros de rede por um texto amigável", () => {
		const connection = { code: "connection", retryable: true, message: STREAM_CONNECTION_ERROR_MESSAGE };
		expect(describeSendFailure(new TypeError("Failed to fetch"))).toEqual(connection);
		expect(describeSendFailure(new Error("Network Error"))).toEqual(connection);
		expect(describeSendFailure(Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK" }))).toEqual(connection);
		expect(STREAM_CONNECTION_ERROR_MESSAGE).toBe("Sem conexão com o servidor. Confira a internet e tente de novo.");
	});

	it("classifica respostas HTTP de outras chamadas e esconde mensagens técnicas", () => {
		const axiosError = Object.assign(new Error("Request failed with status code 429"), {
			isAxiosError: true,
			response: { status: 429, data: { message: "Muitas conversas criadas agora." } },
		});
		expect(describeSendFailure(axiosError)).toEqual({ code: "rate_limit", retryable: true, message: "Muitas conversas criadas agora." });
		expect(describeSendFailure(new Error("authentication session changed"))).toEqual({ code: "unknown", retryable: true, message: SEND_FALLBACK_ERROR_MESSAGE });
		expect(describeSendFailure("falhou")).toMatchObject({ code: "unknown", message: SEND_FALLBACK_ERROR_MESSAGE });
	});
});

describe("conexão que caiu no meio do envio", () => {
	const known = new Set([1, 2]);
	const before = [message(1, "USER", "Como foi hoje?"), message(2, "ASSISTANT", "Tudo certo.")];

	it("acha a pergunta gravada para repetir sem duplicar", () => {
		const saved = [...before, message(3, "USER", "E ontem?")];
		const resolution = resolveDroppedSend(saved, { knownIds: known, text: " E ontem? " });
		expect(resolution).toMatchObject({ kind: "retry", userMessage: { id: 3 } });
		expect(resolveDroppedSend(saved, { knownIds: new Set([1, 2, 3]), userMessageId: 3 })).toMatchObject({ kind: "retry" });
	});

	it("reconhece resposta já salva e aviso já gravado", () => {
		const answered = [...before, message(3, "USER", "E ontem?"), message(4, "ASSISTANT", "Ontem foi tranquilo.")];
		expect(resolveDroppedSend(answered, { knownIds: known, text: "E ontem?" })).toEqual({ kind: "answered" });
		const withNotice = [...before, message(3, "USER", "E ontem?"), failed(4, "timeout", true)];
		expect(resolveDroppedSend(withNotice, { knownIds: known, text: "E ontem?" })).toEqual({ kind: "error_shown" });
	});

	it("diz que a pergunta não chegou quando nada novo foi gravado", () => {
		expect(resolveDroppedSend(before, { knownIds: known, text: "E ontem?" })).toEqual({ kind: "missing" });
		expect(resolveDroppedSend([], { knownIds: new Set(), text: "E ontem?" })).toEqual({ kind: "missing" });
		const repeated = [message(1, "USER", "E ontem?"), message(2, "ASSISTANT", "Tranquilo.")];
		expect(resolveDroppedSend(repeated, { knownIds: known, text: "E ontem?" })).toEqual({ kind: "missing" });
	});
});
