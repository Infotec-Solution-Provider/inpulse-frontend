import { describe, expect, it, vi } from "vitest";
import type { SupervisorAiMessage } from "@/lib/types/sdk-local.types";
import {
	createSupervisorStreamParser,
	parseSseBlock,
	readSupervisorStream,
	streamErrorFromResponse,
	SupervisorStreamError,
} from "./supervisor-stream";

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const message = (id: number, role: "USER" | "ASSISTANT", content: string): SupervisorAiMessage => ({
	id,
	sessionId: 7,
	role,
	content,
	metadata: null,
	createdAt: "2026-10-07T12:00:00.000Z",
});

const result = {
	session: { id: 7, title: "Indicadores" },
	userMessage: message(10, "USER", "Como foi hoje?"),
	assistantMessage: message(11, "ASSISTANT", "Tudo certo."),
	actions: [],
	sources: [],
	reportPreview: null,
};

function bodyFrom(chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		},
	});
}

describe("parser do streaming do Assistente do gestor", () => {
	it("entrega etapas, texto, reset e o resultado na ordem, ignorando o keepalive", () => {
		const calls: string[] = [];
		const parser = createSupervisorStreamParser({
			onDelta: (text) => calls.push(`delta:${text}`),
			onStep: (step) => calls.push(`step:${step.id}:${step.kind}:${step.status}:${step.durationMs ?? "-"}`),
			onReset: () => calls.push("reset"),
		});

		parser.push(sse("ready", { sessionId: 7 }));
		parser.push(sse("step", { id: "round-1", kind: "thinking", label: "Analisando sua pergunta", status: "running", round: 1 }));
		parser.push(": ping\n\n");
		parser.push(sse("delta", { text: "Vou consultar " }));
		parser.push(sse("step", { id: "round-1", kind: "thinking", label: "Analisando sua pergunta", status: "done", round: 1, durationMs: 900 }));
		parser.push(sse("reset", {}));
		parser.push(sse("step", { id: "call_1", kind: "tool", label: "Consultando indicadores de atendimento", status: "running", round: 1 }));
		parser.push(sse("step", { id: "call_1", kind: "tool", label: "Consultando indicadores de atendimento", status: "error", round: 1, durationMs: 1200 }));
		parser.push(sse("delta", { text: "Resposta final" }));
		parser.push(sse("result", result));
		parser.flush();

		expect(calls).toEqual([
			"step:round-1:thinking:running:-",
			"delta:Vou consultar ",
			"step:round-1:thinking:done:900",
			"reset",
			"step:call_1:tool:running:-",
			"step:call_1:tool:error:1200",
			"delta:Resposta final",
		]);
		expect(parser.result()?.assistantMessage.id).toBe(11);
	});

	it("junta eventos quebrados entre pedaços e aceita CRLF", () => {
		const deltas: string[] = [];
		const parser = createSupervisorStreamParser({ onDelta: (text) => deltas.push(text) });
		const raw = sse("delta", { text: "Olá" }).replace(/\n/g, "\r\n") + sse("result", result);
		for (let index = 0; index < raw.length; index += 7) parser.push(raw.slice(index, index + 7));
		parser.flush();

		expect(deltas).toEqual(["Olá"]);
		expect(parser.result()?.userMessage.id).toBe(10);
	});

	it("ignora blocos sem dados, JSON inválido e etapas malformadas", () => {
		const onStep = vi.fn();
		const parser = createSupervisorStreamParser({ onStep });
		parser.push(": ping\n\n");
		parser.push("event: step\ndata: {quebrado\n\n");
		parser.push(sse("step", { id: "x", kind: "outro", label: "?", status: "running", round: 1 }));
		parser.push(sse("step", { id: "call_2", kind: "tool", label: "", status: "done", round: 2 }));
		parser.flush();

		expect(parseSseBlock(": ping")).toBeNull();
		expect(onStep).toHaveBeenCalledTimes(1);
		expect(onStep).toHaveBeenCalledWith({ id: "call_2", kind: "tool", label: "Consultando dados", status: "done", round: 2 });
	});

	it("transforma o evento de erro em SupervisorStreamError com as mensagens gravadas", () => {
		const parser = createSupervisorStreamParser({});
		parser.push(sse("delta", { text: "parcial" }));
		let caught: unknown;
		try {
			parser.push(sse("error", {
				message: "O assistente está com muitas solicitações agora.",
				code: "rate_limit",
				retryable: true,
				userMessage: message(20, "USER", "Pergunta"),
				assistantMessage: { ...message(21, "ASSISTANT", "O assistente está com muitas solicitações agora."), metadata: { error: { code: "rate_limit", retryable: true, message: "429" } } },
			}));
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(SupervisorStreamError);
		const error = caught as SupervisorStreamError;
		expect(error.message).toBe("O assistente está com muitas solicitações agora.");
		expect(error.code).toBe("rate_limit");
		expect(error.retryable).toBe(true);
		expect(error.userMessage?.id).toBe(20);
		expect(error.assistantMessage?.metadata?.error?.code).toBe("rate_limit");
	});

	it("usa código desconhecido e a regra de repetição padrão quando o erro vem incompleto", () => {
		const errorFrom = (payload: Record<string, unknown>) => {
			try {
				createSupervisorStreamParser({}).push(sse("error", payload));
			} catch (error) {
				return error as SupervisorStreamError;
			}
			throw new Error("o evento de erro não foi lançado");
		};

		expect(errorFrom({})).toMatchObject({ code: "unknown", retryable: true, message: "Não foi possível concluir a resposta do assistente. Tente novamente." });
		expect(errorFrom({ message: "Limite mensal atingido.", code: "budget" })).toMatchObject({ code: "budget", retryable: false, userMessage: null, assistantMessage: null });
		expect(errorFrom({ message: "Erro antigo", code: "qualquer" })).toMatchObject({ code: "unknown", retryable: true });
		expect(errorFrom({ message: "Tempo esgotado", code: "timeout", userMessage: { id: "x" } })).toMatchObject({ code: "timeout", retryable: true, userMessage: null });
	});
});

describe("leitura do corpo do streaming", () => {
	it("devolve o resultado e repassa as etapas", async () => {
		const onStep = vi.fn();
		const onReset = vi.fn();
		const response = await readSupervisorStream(bodyFrom([
			sse("ready", { sessionId: 7 }),
			sse("step", { id: "round-1", kind: "thinking", label: "Analisando sua pergunta", status: "running", round: 1 }),
			": ping\n\n",
			sse("reset", {}),
			sse("result", result).slice(0, 20),
			sse("result", result).slice(20),
		]), { onStep, onReset });

		expect(response.assistantMessage.content).toBe("Tudo certo.");
		expect(onStep).toHaveBeenCalledTimes(1);
		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it("aceita o último evento sem a linha em branco final", async () => {
		const raw = sse("result", result).trimEnd();
		const response = await readSupervisorStream(bodyFrom([raw]), {});
		expect(response.session.id).toBe(7);
	});

	it("acusa queda de conexão quando o fluxo termina sem resultado", async () => {
		await expect(readSupervisorStream(bodyFrom([sse("delta", { text: "meio" })]), {}))
			.rejects.toMatchObject({ name: "SupervisorStreamError", code: "connection", retryable: true });
	});

	it("propaga o erro do ai-service", async () => {
		await expect(readSupervisorStream(bodyFrom([
			sse("step", { id: "call_1", kind: "tool", label: "Lendo a conversa", status: "running", round: 1 }),
			sse("error", { message: "A IA está desativada para esta empresa.", code: "disabled", retryable: false }),
		]), {})).rejects.toMatchObject({ code: "disabled", retryable: false, message: "A IA está desativada para esta empresa." });
	});
});

describe("erros antes do streaming", () => {
	it("classifica pela situação da resposta", () => {
		expect(streamErrorFromResponse(503, { message: "Chave da OpenAI não configurada." })).toMatchObject({ code: "disabled", retryable: false, message: "Chave da OpenAI não configurada." });
		expect(streamErrorFromResponse(429, null)).toMatchObject({ code: "rate_limit", retryable: true });
		expect(streamErrorFromResponse(400, { message: "Só é possível repetir a última pergunta." })).toMatchObject({ code: "unknown", retryable: false });
		expect(streamErrorFromResponse(500, {})).toMatchObject({ code: "unknown", retryable: true, message: "Não foi possível iniciar a resposta do assistente." });
		expect(streamErrorFromResponse(429, { message: "Limite atingido.", code: "budget" })).toMatchObject({ code: "budget", retryable: false });
	});
});
