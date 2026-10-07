import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssistantErrorNotice } from "./assistant-error-notice";

describe("aviso de erro na conversa", () => {
	it("mostra título, texto e o botão de repetir", () => {
		const html = renderToStaticMarkup(
			<AssistantErrorNotice live title="A resposta demorou demais" message="A IA demorou demais para responder." onRetry={() => undefined} />,
		);
		expect(html).toContain("A resposta demorou demais");
		expect(html).toContain("A IA demorou demais para responder.");
		expect(html).toContain("Tentar novamente");
		expect(html).toContain("role=\"alert\"");
		expect(html).toContain("border-amber-300");
	});

	it("sem repetição, não mostra o botão nem anuncia avisos do histórico", () => {
		const html = renderToStaticMarkup(<AssistantErrorNotice title="Limite de uso da IA atingido" message="Avise o administrador." />);
		expect(html).not.toContain("Tentar novamente");
		expect(html).not.toContain("role=");
	});

	it("desabilita o botão enquanto outra resposta está em andamento", () => {
		const html = renderToStaticMarkup(<AssistantErrorNotice title="Instabilidade na IA" message="Tente de novo." onRetry={() => undefined} retryDisabled />);
		expect(html).toContain("disabled=\"\"");
	});
});
