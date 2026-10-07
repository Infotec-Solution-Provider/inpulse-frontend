import { describe, expect, it } from "vitest";
import type { SupervisorAiAction } from "@/lib/types/sdk-local.types";
import { startChatOutcome } from "./supervisor-actions";

const action = (status: SupervisorAiAction["status"], result: Record<string, unknown> | null) => ({ status, result });

describe("resultado da ação Iniciar chat", () => {
	it("chat novo aberto em nome do gestor", () => {
		expect(startChatOutcome(action("EXECUTED", { chatId: 812, contactId: 5, status: "created" }))).toEqual({
			status: "created",
			chatId: 812,
			title: "Chat aberto em seu nome",
			detail: "Chat #812 · Nenhuma mensagem foi enviada ao cliente.",
			toast: "Chat aberto em seu nome. Nenhuma mensagem foi enviada ao cliente.",
		});
	});

	it("contato que já tinha atendimento aberto", () => {
		expect(startChatOutcome(action("EXECUTED", { chatId: 77, status: "already_exists" }))).toMatchObject({
			status: "already_exists",
			chatId: 77,
			title: "O contato já tinha um atendimento aberto",
			detail: "Chat #77 · Nenhum chat novo foi criado.",
		});
	});

	it("resultado antigo, sem status, e ações não executadas", () => {
		expect(startChatOutcome(action("EXECUTED", { chatId: 9 }))).toMatchObject({ status: null, chatId: 9, title: "Chat #9 iniciado" });
		expect(startChatOutcome(action("EXECUTED", null))).toMatchObject({ status: null, chatId: null, title: "Ação executada" });
		expect(startChatOutcome(action("EXECUTED", { chatId: "9", status: "created" }))).toMatchObject({
			chatId: null,
			detail: "Nenhuma mensagem foi enviada ao cliente.",
		});
		expect(startChatOutcome(action("PENDING", null))).toBeNull();
		expect(startChatOutcome(action("FAILED", { chatId: 9 }))).toBeNull();
	});
});
