import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { upsertLiveStep, type LiveSupervisorStep } from "@/lib/utils/supervisor-steps";
import { LiveSteps, ResponseSteps } from "./assistant-steps";

function liveSteps(): LiveSupervisorStep[] {
	const now = Date.now();
	let steps = upsertLiveStep([], { id: "round-1", kind: "thinking", label: "Analisando sua pergunta", status: "done", round: 1, durationMs: 900 }, now - 3_000);
	steps = upsertLiveStep(steps, { id: "call_1", kind: "tool", label: "Consultando indicadores de atendimento", status: "running", round: 1 }, now - 2_000);
	return steps;
}

describe("etapas do Assistente do gestor", () => {
	it("mostra a lista completa enquanto não há texto", () => {
		const html = renderToStaticMarkup(<LiveSteps steps={liveSteps()} hasText={false} />);
		expect(html).toContain("Analisando sua pergunta");
		expect(html).toContain("0,9 s");
		expect(html).toContain("Consultando indicadores de atendimento…");
	});

	it("recolhe a lista numa linha quando o texto começa a chegar", () => {
		const html = renderToStaticMarkup(<LiveSteps steps={liveSteps()} hasText />);
		expect(html).toContain("Consultando indicadores de atendimento…");
		expect(html).not.toContain("Analisando sua pergunta");
	});

	it("avisa que está preparando a resposta antes da primeira etapa", () => {
		expect(renderToStaticMarkup(<LiveSteps steps={[]} hasText={false} />)).toContain("Preparando a resposta…");
		expect(renderToStaticMarkup(<LiveSteps steps={[]} hasText />)).toBe("");
	});

	it("mostra o expansor recolhido só quando há etapas gravadas", () => {
		const html = renderToStaticMarkup(
			<ResponseSteps steps={[
				{ label: "Consultando indicadores de atendimento", kind: "tool", status: "done", durationMs: 812 },
				{ label: "Calculando o desempenho dos operadores", kind: "tool", status: "error", durationMs: 1_500 },
			]} />,
		);
		expect(html).toContain("Como cheguei nesta resposta (2 etapas)");
		expect(html).toContain("aria-expanded=\"false\"");
		expect(html).not.toContain("Calculando o desempenho dos operadores");
		expect(renderToStaticMarkup(<ResponseSteps steps={[]} />)).toBe("");
	});
});
