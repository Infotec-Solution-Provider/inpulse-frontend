import { describe, expect, it } from "vitest";
import type { SupervisorAiStreamStep } from "@/lib/types/sdk-local.types";
import {
	formatElapsed,
	formatStepDuration,
	liveStepDurationMs,
	liveStepsElapsedMs,
	liveStepsHeadline,
	messageSteps,
	stepCountLabel,
	upsertLiveStep,
	type LiveSupervisorStep,
} from "./supervisor-steps";

const step = (overrides: Partial<SupervisorAiStreamStep>): SupervisorAiStreamStep => ({
	id: "round-1",
	kind: "thinking",
	label: "Analisando sua pergunta",
	status: "running",
	round: 1,
	...overrides,
});

describe("etapas ao vivo", () => {
	it("atualiza pelo id sem duplicar e mantém a ordem de chegada", () => {
		let steps: LiveSupervisorStep[] = [];
		steps = upsertLiveStep(steps, step({}), 1_000);
		steps = upsertLiveStep(steps, step({ id: "call_1", kind: "tool", label: "Lendo a conversa" }), 1_500);
		steps = upsertLiveStep(steps, step({ status: "done", durationMs: 480 }), 1_600);
		steps = upsertLiveStep(steps, step({ id: "call_1", kind: "tool", label: "Lendo a conversa", status: "done" }), 3_500);

		expect(steps.map((entry) => `${entry.id}:${entry.status}`)).toEqual(["round-1:done", "call_1:done"]);
		expect(steps[0]).toMatchObject({ startedAt: 1_000, finishedAt: 1_600, durationMs: 480 });
		expect(liveStepDurationMs(steps[0]!, 9_999)).toBe(480);
		expect(liveStepDurationMs(steps[1]!, 9_999)).toBe(2_000);
	});

	it("aceita etapa que chega já concluída e calcula o tempo em andamento", () => {
		const steps = upsertLiveStep([], step({ id: "call_9", kind: "tool", status: "error", durationMs: 300 }), 5_000);
		expect(steps[0]).toMatchObject({ status: "error", startedAt: 5_000, finishedAt: 5_000 });

		const running = upsertLiveStep([], step({}), 1_000);
		expect(liveStepDurationMs(running[0]!, 4_200)).toBe(3_200);
		expect(liveStepsElapsedMs(running, 4_200)).toBe(3_200);
	});

	it("resume a lista recolhida", () => {
		let steps = upsertLiveStep([], step({}), 0);
		expect(liveStepsHeadline(steps, false)).toEqual({ running: true, label: "Analisando sua pergunta" });
		expect(liveStepsHeadline(steps, true)).toEqual({ running: true, label: "Escrevendo a resposta" });

		steps = upsertLiveStep(steps, step({ id: "call_1", kind: "tool", label: "Consultando o CRM" }), 100);
		expect(liveStepsHeadline(steps, true)).toEqual({ running: true, label: "Consultando o CRM" });

		steps = upsertLiveStep(steps, step({ id: "call_1", kind: "tool", label: "Consultando o CRM", status: "done" }), 200);
		steps = upsertLiveStep(steps, step({ status: "done" }), 300);
		expect(liveStepsHeadline(steps, true)).toEqual({ running: false, label: "1 etapa concluída" });
		expect(liveStepsElapsedMs(steps, 10_000)).toBe(300);
		expect(liveStepsHeadline([], true)).toEqual({ running: false, label: "Análise concluída" });
	});
});

describe("formatação", () => {
	it("formata durações em português", () => {
		expect(formatStepDuration(420)).toBe("0,4 s");
		expect(formatStepDuration(3_240)).toBe("3,2 s");
		expect(formatStepDuration(12_400)).toBe("12 s");
		expect(formatStepDuration(65_000)).toBe("1 min 5 s");
		expect(formatStepDuration(120_000)).toBe("2 min");
		expect(formatStepDuration(Number.NaN)).toBe("0,0 s");
		expect(formatElapsed(800)).toBe("");
		expect(formatElapsed(4_900)).toBe("4 s");
		expect(formatElapsed(61_000)).toBe("1 min 1 s");
		expect(stepCountLabel(1)).toBe("1 etapa");
		expect(stepCountLabel(3)).toBe("3 etapas");
	});
});

describe("etapas gravadas na resposta", () => {
	it("lê metadata.steps ignorando entradas malformadas", () => {
		expect(messageSteps(null)).toEqual([]);
		expect(messageSteps({})).toEqual([]);
		expect(messageSteps({
			steps: [
				{ label: "Consultando indicadores de atendimento", kind: "tool", status: "done", durationMs: 812 },
				{ label: "  ", kind: "tool", status: "done" },
				{ label: "Lendo a conversa", kind: "tool", status: "error" },
				null as never,
			],
		})).toEqual([
			{ label: "Consultando indicadores de atendimento", kind: "tool", status: "done", durationMs: 812 },
			{ label: "Lendo a conversa", kind: "tool", status: "error" },
		]);
	});
});
