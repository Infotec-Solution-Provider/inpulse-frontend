import type { SupervisorAiAction } from "@/lib/types/sdk-local.types";

export type StartChatResultStatus = "created" | "already_exists";

export interface StartChatOutcome {
	status: StartChatResultStatus | null;
	chatId: number | null;
	title: string;
	detail: string;
	toast: string;
}

/** Resultado da ação "Iniciar chat" já executada, nos textos do cartão e do aviso. */
export function startChatOutcome(action: Pick<SupervisorAiAction, "status" | "result">): StartChatOutcome | null {
	if (action.status !== "EXECUTED") return null;
	const result = action.result ?? {};
	const chatId = typeof result.chatId === "number" && Number.isInteger(result.chatId) && result.chatId > 0
		? result.chatId
		: null;
	const chatLabel = chatId ? `Chat #${chatId}` : "";

	if (result.status === "already_exists") {
		return {
			status: "already_exists",
			chatId,
			title: "O contato já tinha um atendimento aberto",
			detail: [chatLabel, "Nenhum chat novo foi criado."].filter(Boolean).join(" · "),
			toast: "O contato já tinha um atendimento aberto. Nenhum chat novo foi criado.",
		};
	}
	if (result.status === "created") {
		return {
			status: "created",
			chatId,
			title: "Chat aberto em seu nome",
			detail: [chatLabel, "Nenhuma mensagem foi enviada ao cliente."].filter(Boolean).join(" · "),
			toast: "Chat aberto em seu nome. Nenhuma mensagem foi enviada ao cliente.",
		};
	}
	return {
		status: null,
		chatId,
		title: chatId ? `Chat #${chatId} iniciado` : "Ação executada",
		detail: "",
		toast: "Ação executada após sua confirmação.",
	};
}
