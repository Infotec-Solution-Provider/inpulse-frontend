import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_ERROR_MESSAGE,
  MODE_COPY,
  buildFactChips,
  canInsertSuggestion,
  getActiveSuggestions,
  getAiErrorMessage,
  getSelectedSuggestion,
} from "./ai-prototype-modal.utils";

describe("getActiveSuggestions", () => {
  it("apara as sugestões e descarta as vazias", () => {
    expect(getActiveSuggestions(["  Olá, tudo bem?  ", "", "   ", "\n", "Posso ajudar?"])).toEqual([
      "Olá, tudo bem?",
      "Posso ajudar?",
    ]);
  });

  it("devolve lista vazia sem resposta da IA", () => {
    expect(getActiveSuggestions(null)).toEqual([]);
    expect(getActiveSuggestions(undefined)).toEqual([]);
    expect(getActiveSuggestions([])).toEqual([]);
  });

  it("ignora valores que não são texto", () => {
    expect(getActiveSuggestions(["Texto real", null, 42, { text: "x" }] as unknown[])).toEqual(["Texto real"]);
  });
});

describe("canInsertSuggestion", () => {
  const suggestions = ["Bom dia! Já verifiquei o seu pedido."];

  it("é falso durante o carregamento", () => {
    expect(canInsertSuggestion({ mode: "suggest-response", isLoading: true, error: null, suggestions })).toBe(false);
  });

  it("é falso com erro", () => {
    expect(
      canInsertSuggestion({
        mode: "suggest-response",
        isLoading: false,
        error: "A IA ainda não foi configurada neste ambiente. Avise o administrador.",
        suggestions,
      }),
    ).toBe(false);
  });

  it("é falso sem sugestões", () => {
    expect(canInsertSuggestion({ mode: "suggest-response", isLoading: false, error: null, suggestions: [] })).toBe(false);
  });

  it("é falso fora de suggest-response", () => {
    expect(canInsertSuggestion({ mode: "summarize-chat", isLoading: false, error: null, suggestions })).toBe(false);
    expect(canInsertSuggestion({ mode: "analyze-customer", isLoading: false, error: null, suggestions })).toBe(false);
  });

  it("é verdadeiro com sugestão real, sem carregamento e sem erro", () => {
    expect(canInsertSuggestion({ mode: "suggest-response", isLoading: false, error: null, suggestions })).toBe(true);
    expect(canInsertSuggestion({ mode: "suggest-response", isLoading: false, suggestions })).toBe(true);
  });
});

describe("getSelectedSuggestion", () => {
  it("devolve só a sugestão real selecionada", () => {
    expect(getSelectedSuggestion(["A", "B"], 1)).toBe("B");
    expect(getSelectedSuggestion(["A", "B"], 2)).toBeNull();
    expect(getSelectedSuggestion([], 0)).toBeNull();
  });
});

describe("buildFactChips", () => {
  const startedAt = "2026-10-06T15:00:00.000Z";

  it("monta apenas fatos do atendimento", () => {
    expect(
      buildFactChips({
        contactName: "Maria Souza",
        customerName: "Mercado Bom Preço",
        customerId: 678,
        startedAt,
        messageCount: 12,
      }).map((chip) => chip.label),
    ).toEqual(["Maria Souza", "Cliente: Mercado Bom Preço", "Início 06/10/2026", "12 mensagens"]);
  });

  it("indica quando não há cliente vinculado", () => {
    const labels = buildFactChips({ contactName: "Maria", customerName: null, customerId: null, startedAt, messageCount: 3 })
      .map((chip) => chip.label);

    expect(labels).toContain("Sem cliente vinculado");
    expect(labels.some((label) => label.startsWith("Cliente"))).toBe(false);
  });

  it("usa o código quando o cliente vinculado não tem nome", () => {
    expect(buildFactChips({ contactName: "Maria", customerId: 678 }).map((chip) => chip.label)).toContain("Cliente #678");
  });

  it("omite a data de início quando não existe ou é inválida", () => {
    const withoutDate = buildFactChips({ contactName: "Maria", customerName: "ACME", messageCount: 2 });
    const invalidDate = buildFactChips({ contactName: "Maria", customerName: "ACME", startedAt: "data inválida" });

    expect(withoutDate.some((chip) => chip.id === "started-at")).toBe(false);
    expect(invalidDate.some((chip) => chip.id === "started-at")).toBe(false);
  });

  it("omite a contagem quando não há mensagens e usa o singular para uma", () => {
    expect(buildFactChips({ contactName: "Maria", messageCount: 0 }).some((chip) => chip.id === "messages")).toBe(false);
    expect(buildFactChips({ contactName: "Maria" }).some((chip) => chip.id === "messages")).toBe(false);
    expect(buildFactChips({ contactName: "Maria", messageCount: 1 }).find((chip) => chip.id === "messages")?.label).toBe(
      "1 mensagem",
    );
  });

  it("não repete chave nem quando contato e cliente têm o mesmo nome", () => {
    const chips = buildFactChips({ contactName: "ACME", customerName: "ACME", startedAt, messageCount: 5 });
    expect(new Set(chips.map((chip) => chip.id)).size).toBe(chips.length);
  });
});

describe("getAiErrorMessage", () => {
  /** Mesmo formato do ApiClient do sdk-local: `Error.message` do servidor e o AxiosError em `cause`. */
  function serverError(message: string, status?: number): Error {
    return new Error(message, { cause: { isAxiosError: true, response: status === undefined ? undefined : { status } } });
  }

  it("usa a mensagem de negócio do backend nos status do catálogo de erros", () => {
    expect(getAiErrorMessage(serverError("Chat não encontrado.", 404))).toBe("Chat não encontrado.");
    expect(
      getAiErrorMessage(serverError("A IA ainda não foi configurada neste ambiente. Avise o administrador.", 503)),
    ).toBe("A IA ainda não foi configurada neste ambiente. Avise o administrador.");
    expect(
      getAiErrorMessage(serverError("A conversa ainda não tem mensagens de texto para a IA analisar.", 422)),
    ).toBe("A conversa ainda não tem mensagens de texto para a IA analisar.");
    expect(
      getAiErrorMessage(serverError("A IA recusou a solicitação. Tente novamente ou escolha outro modelo.", 502)),
    ).toBe("A IA recusou a solicitação. Tente novamente ou escolha outro modelo.");
    expect(
      getAiErrorMessage(serverError("Sua sessão não tem permissão para esta consulta. Entre novamente.", 403)),
    ).toBe("Sua sessão não tem permissão para esta consulta. Entre novamente.");
  });

  it("não mostra a mensagem de um erro 500, que pode trazer texto técnico", () => {
    expect(
      getAiErrorMessage(
        serverError(
          "Invalid `prisma.tenantAiConfig.findUnique()` invocation: The table `tenant_ai_configs` does not exist",
          500,
        ),
      ),
    ).toBe(DEFAULT_AI_ERROR_MESSAGE);
    expect(getAiErrorMessage(serverError("Can't reach database server at `db:3306`", 500))).toBe(
      DEFAULT_AI_ERROR_MESSAGE,
    );
  });

  it("não mostra a mensagem de status fora do catálogo nem de erro sem status", () => {
    expect(getAiErrorMessage(serverError("401 Incorrect API key provided: sk-proj-abc", 401))).toBe(
      DEFAULT_AI_ERROR_MESSAGE,
    );
    expect(getAiErrorMessage(serverError("Chat não encontrado."))).toBe(DEFAULT_AI_ERROR_MESSAGE);
    expect(getAiErrorMessage(new Error("authentication session changed"))).toBe(DEFAULT_AI_ERROR_MESSAGE);
  });

  it("usa o texto padrão com valor que não é Error", () => {
    expect(getAiErrorMessage("Chat não encontrado.")).toBe(DEFAULT_AI_ERROR_MESSAGE);
    expect(getAiErrorMessage({ message: "Chat não encontrado." })).toBe(DEFAULT_AI_ERROR_MESSAGE);
    expect(getAiErrorMessage(null)).toBe(DEFAULT_AI_ERROR_MESSAGE);
    expect(getAiErrorMessage(undefined)).toBe(DEFAULT_AI_ERROR_MESSAGE);
  });

  it("usa o texto padrão com mensagem vazia", () => {
    expect(getAiErrorMessage(new Error(""))).toBe(DEFAULT_AI_ERROR_MESSAGE);
    expect(getAiErrorMessage(new Error("   "))).toBe(DEFAULT_AI_ERROR_MESSAGE);
  });

  it("traduz as mensagens técnicas do axios quando o servidor não respondeu", () => {
    expect(getAiErrorMessage(new Error("timeout of 60000ms exceeded"))).toBe(
      "A IA demorou demais para responder. Tente novamente.",
    );
    expect(getAiErrorMessage(new Error("Network Error"))).toBe(
      "Não foi possível falar com a IA agora. Tente novamente em instantes.",
    );
    expect(getAiErrorMessage(new Error("Request failed with status code 500"))).toBe(DEFAULT_AI_ERROR_MESSAGE);
    expect(getAiErrorMessage(new Error("canceled"))).toBe(DEFAULT_AI_ERROR_MESSAGE);
  });
});

describe("MODE_COPY", () => {
  it("tem títulos neutros por modo", () => {
    expect(MODE_COPY["suggest-response"]).toMatchObject({
      title: "Sugestão de resposta",
      subtitle: "Respostas sugeridas pela IA para a última mensagem do cliente.",
      emptyMessage: "A IA não retornou sugestões.",
    });
    expect(MODE_COPY["summarize-chat"]).toMatchObject({
      title: "Resumo da conversa",
      subtitle: "Resumo gerado pela IA a partir das mensagens deste atendimento.",
      resultTitle: "Resumo gerado pela IA",
      emptyMessage: "A IA não retornou conteúdo.",
    });
    expect(MODE_COPY["analyze-customer"]).toMatchObject({
      title: "Análise do cliente",
      subtitle: "Histórico de compras e leitura da IA sobre o cliente.",
      resultTitle: "Análise da IA",
      emptyMessage: "A IA não retornou conteúdo.",
    });
  });
});
