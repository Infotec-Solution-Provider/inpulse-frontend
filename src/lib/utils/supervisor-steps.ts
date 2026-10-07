import type {
	SupervisorAiMessageMetadata,
	SupervisorAiMessageStep,
	SupervisorAiStepStatus,
	SupervisorAiStreamStep,
} from "@/lib/types/sdk-local.types";

/** Etapa ao vivo com os horários vistos pelo navegador, para mostrar o tempo decorrido. */
export interface LiveSupervisorStep extends SupervisorAiStreamStep {
	startedAt: number;
	finishedAt?: number;
}

const STEP_STATUSES: readonly SupervisorAiStepStatus[] = ["running", "done", "error"];

/** Insere ou atualiza a etapa pelo id, mantendo a ordem em que cada uma apareceu. */
export function upsertLiveStep(steps: LiveSupervisorStep[], step: SupervisorAiStreamStep, now: number): LiveSupervisorStep[] {
	const finished = step.status !== "running";
	const index = steps.findIndex((entry) => entry.id === step.id);
	if (index < 0) {
		return [...steps, { ...step, startedAt: now, ...(finished ? { finishedAt: now } : {}) }];
	}
	const current = steps[index]!;
	const next: LiveSupervisorStep = {
		...current,
		...step,
		startedAt: current.startedAt,
		...(finished ? { finishedAt: current.finishedAt ?? now } : {}),
	};
	if (!finished) delete next.finishedAt;
	if (step.durationMs === undefined && current.durationMs !== undefined) next.durationMs = current.durationMs;
	return steps.map((entry, position) => position === index ? next : entry);
}

export function liveStepDurationMs(step: LiveSupervisorStep, now: number): number {
	if (step.status !== "running" && typeof step.durationMs === "number") return step.durationMs;
	return Math.max(0, (step.finishedAt ?? now) - step.startedAt);
}

/** Tempo total desde a primeira etapa (até agora, se ainda houver etapa em andamento). */
export function liveStepsElapsedMs(steps: LiveSupervisorStep[], now: number): number {
	if (steps.length === 0) return 0;
	const startedAt = Math.min(...steps.map((step) => step.startedAt));
	const running = steps.some((step) => step.status === "running");
	const endedAt = running ? now : Math.max(...steps.map((step) => step.finishedAt ?? step.startedAt));
	return Math.max(0, endedAt - startedAt);
}

/** "0,4 s", "3,2 s", "12 s", "1 min 5 s". */
export function formatStepDuration(ms: number): string {
	const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
	if (safe < 10_000) return `${(safe / 1000).toFixed(1).replace(".", ",")} s`;
	const totalSeconds = Math.round(safe / 1000);
	if (totalSeconds < 60) return `${totalSeconds} s`;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`;
}

/** Tempo decorrido de algo em andamento, em segundos inteiros; vazio no primeiro segundo. */
export function formatElapsed(ms: number): string {
	if (!Number.isFinite(ms) || ms < 1000) return "";
	const totalSeconds = Math.floor(ms / 1000);
	if (totalSeconds < 60) return `${totalSeconds} s`;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`;
}

export function stepCountLabel(count: number): string {
	return `${count} ${count === 1 ? "etapa" : "etapas"}`;
}

/** Linha-resumo das etapas ao vivo, usada quando a lista fica recolhida acima do texto. */
export function liveStepsHeadline(steps: LiveSupervisorStep[], hasText: boolean): { running: boolean; label: string } {
	const running = [...steps].reverse().find((step) => step.status === "running");
	if (running) {
		return { running: true, label: running.kind === "thinking" && hasText ? "Escrevendo a resposta" : running.label };
	}
	const tools = steps.filter((step) => step.kind === "tool").length;
	if (tools === 0) return { running: false, label: "Análise concluída" };
	return { running: false, label: `${stepCountLabel(tools)} ${tools === 1 ? "concluída" : "concluídas"}` };
}

/** Etapas gravadas na resposta concluída, ignorando entradas malformadas. */
export function messageSteps(metadata: SupervisorAiMessageMetadata | null | undefined): SupervisorAiMessageStep[] {
	const raw = metadata?.steps;
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((entry) => {
		if (!entry || typeof entry !== "object" || typeof entry.label !== "string" || !entry.label.trim()) return [];
		const status = STEP_STATUSES.includes(entry.status) ? entry.status : "done";
		return [{
			label: entry.label.trim(),
			kind: entry.kind === "thinking" ? "thinking" : "tool",
			status,
			...(typeof entry.durationMs === "number" && Number.isFinite(entry.durationMs) && entry.durationMs >= 0
				? { durationMs: entry.durationMs }
				: {}),
		} satisfies SupervisorAiMessageStep];
	});
}
