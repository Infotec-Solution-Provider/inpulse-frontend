import { describe, expect, it } from "vitest";
import {
  AGENT_ACTION_LABELS,
  findOverlappingAlwaysAgents,
  formatAiDateTime,
  getExecutionModeLabel,
  getLogActionLabel,
  getSessionStartedAt,
  getSessionStatusLabel,
  isNeutralAction,
  summarizeAgentError,
} from "./ai-agent-labels";

describe("formatAiDateTime", () => {
  it("formats a valid date as dd/mm/aaaa hh:mm", () => {
    // Sem deslocamento: interpretado no fuso local, então o resultado não depende do ambiente.
    expect(formatAiDateTime("2026-10-06T09:05:00")).toBe("06/10/2026 09:05");
    expect(formatAiDateTime(new Date(2026, 0, 2, 23, 59))).toBe("02/01/2026 23:59");
  });

  it("returns a dash instead of Invalid Date", () => {
    expect(formatAiDateTime("not-a-date")).toBe("—");
    expect(formatAiDateTime("")).toBe("—");
  });

  it("returns a dash for null or undefined", () => {
    expect(formatAiDateTime(null)).toBe("—");
    expect(formatAiDateTime(undefined)).toBe("—");
    expect(formatAiDateTime()).toBe("—");
  });
});

describe("getSessionStartedAt", () => {
  it("prefers createdAt over startedAt", () => {
    expect(
      getSessionStartedAt({ createdAt: "2026-10-06T10:00:00.000Z", startedAt: "2026-10-01T10:00:00.000Z" }),
    ).toBe("2026-10-06T10:00:00.000Z");
  });

  it("falls back to startedAt and then to null", () => {
    expect(getSessionStartedAt({ startedAt: "2026-10-01T10:00:00.000Z" })).toBe("2026-10-01T10:00:00.000Z");
    expect(getSessionStartedAt({})).toBeNull();
  });
});

describe("getSessionStatusLabel", () => {
  it("translates the session statuses", () => {
    expect(getSessionStatusLabel("ACTIVE")).toBe("Em andamento");
    expect(getSessionStatusLabel("PAUSED")).toBe("Pausada");
    expect(getSessionStatusLabel("FINISHED")).toBe("Encerrada");
    expect(getSessionStatusLabel("UNKNOWN_STATUS")).toBe("UNKNOWN_STATUS");
  });
});

describe("getLogActionLabel", () => {
  it("explains a pause caused by a human taking over", () => {
    expect(
      getLogActionLabel({ actionType: "IGNORED", success: true, payload: { reason: "HUMAN_TAKEOVER" } }),
    ).toBe("Pausada: uma pessoa da equipe assumiu a conversa");
  });

  it("explains a session finished by the turn limit", () => {
    expect(getLogActionLabel({ actionType: "IGNORED", success: true, payload: { reason: "MAX_TURNS" } })).toBe(
      "Encerrada: limite de turnos do agente atingido",
    );
  });

  it("names the operator on a successful transfer", () => {
    expect(
      getLogActionLabel({
        actionType: "ESCALATE",
        success: true,
        payload: { escalatedToUserId: 7, escalatedToUserName: "Ana Souza" },
      }),
    ).toBe("Transferiu para Ana Souza");
  });

  it("uses a generic target when the transfer has no operator name", () => {
    expect(getLogActionLabel({ actionType: "ESCALATE", success: true, payload: { escalatedToUserId: 7 } })).toBe(
      "Transferiu para um atendente",
    );
    expect(getLogActionLabel({ actionType: "ESCALATE", success: true, payload: null })).toBe(
      "Transferiu para um atendente",
    );
  });

  it("keeps the action label on a failed transfer", () => {
    expect(getLogActionLabel({ actionType: "ESCALATE", success: false, payload: {} })).toBe(
      AGENT_ACTION_LABELS.ESCALATE,
    );
  });

  it("uses the action labels for the other actions", () => {
    expect(getLogActionLabel({ actionType: "REPLY", success: true, payload: { replyText: "Olá!" } })).toBe(
      "Respondeu",
    );
    expect(getLogActionLabel({ actionType: "IGNORED", success: true, payload: {} })).toBe("Não respondeu");
    expect(getLogActionLabel({ actionType: "SOMETHING_NEW", success: true, payload: {} })).toBe("SOMETHING_NEW");
  });
});

describe("isNeutralAction", () => {
  it("treats only a successful IGNORED as neutral", () => {
    expect(isNeutralAction({ actionType: "IGNORED", success: true })).toBe(true);
    expect(isNeutralAction({ actionType: "IGNORED", success: false })).toBe(false);
    expect(isNeutralAction({ actionType: "REPLY", success: true })).toBe(false);
  });
});

describe("summarizeAgentError", () => {
  const cases: Array<[string, string]> = [
    [
      "ESCALATE requer token de autenticação.",
      "A ação exigia credenciais que o agente não tinha (versão anterior do sistema).",
    ],
    [
      "Esta ação precisa de uma atualização do sistema. Avise o administrador. (rota agent-transfer ausente)",
      "Esta ação precisa de uma atualização do sistema.",
    ],
    ["O serviço de WhatsApp não tem a rota agent-finish.", "Esta ação precisa de uma atualização do sistema."],
    [
      "Falha de comunicação interna entre serviços. Avise o administrador. (whatsapp-service respondeu 403)",
      "Comunicação interna entre serviços recusada (configuração).",
    ],
    ["O whatsapp-service recusou a chamada interna.", "Comunicação interna entre serviços recusada (configuração)."],
    ["Acesso restrito a chamadas internas.", "Comunicação interna entre serviços recusada (configuração)."],
    ["INTERNAL_SERVICE_TOKEN ausente no emissor", "Comunicação interna entre serviços recusada (configuração)."],
    [
      "A IA ainda não foi configurada neste ambiente. Avise o administrador. (OPENAI_API_KEY ausente)",
      "A IA não está configurada ou a chave é inválida.",
    ],
    ["OPENAI_API_KEY is not set", "A IA não está configurada ou a chave é inválida."],
    [
      "A IA está indisponível no momento por um problema de configuração. Avise o administrador.",
      "A IA não está configurada ou a chave é inválida.",
    ],
    ["A chave da OpenAI é inválida.", "A IA não está configurada ou a chave é inválida."],
    ["A IA atingiu o limite de uso no momento. Tente novamente em instantes.", "Limite de uso da IA atingido."],
    ["Request failed with status code 429", "Limite de uso da IA atingido."],
    ["A IA demorou demais para responder. Tente novamente.", "A IA ou um serviço demorou demais para responder."],
    ["timeout of 30000ms exceeded", "A IA ou um serviço demorou demais para responder."],
    ["connect ETIMEDOUT 10.0.0.1:443", "A IA ou um serviço demorou demais para responder."],
    [
      "Não foi possível falar com o serviço de WhatsApp agora. Tente novamente em instantes.",
      "Serviço interno indisponível no momento.",
    ],
    ["connect ECONNREFUSED 127.0.0.1:8005", "Serviço interno indisponível no momento."],
    ["getaddrinfo ENOTFOUND whatsapp", "Serviço interno indisponível no momento."],
    ["socket hang up", "Serviço interno indisponível no momento."],
    ["Serviço de clientes indisponível", "Serviço interno indisponível no momento."],
    [
      "A resposta da IA foi cortada antes de terminar. Tente novamente.",
      "A resposta da IA foi cortada; aumente o máximo de tokens do agente.",
    ],
    [
      "Resposta do modelo cortada pelo limite de tokens; aumente “Máximo de tokens” do agente.",
      "A resposta da IA foi cortada; aumente o máximo de tokens do agente.",
    ],
    ["Nenhum operador de transferência configurado.", "Nenhum operador configurado para transferência."],
    ["Resposta do modelo não é um JSON válido.", "A IA respondeu fora do formato esperado."],
    ["Chat não encontrado.", "Conversa ou recurso não encontrado."],
    ["Request failed with status code 404", "Conversa ou recurso não encontrado."],
  ];

  it.each(cases)("summarizes %j", (message, summary) => {
    expect(summarizeAgentError(message)).toEqual({ summary, detail: message });
  });

  it("ignores case", () => {
    expect(summarizeAgentError("FALHA DE COMUNICAÇÃO INTERNA ENTRE SERVIÇOS.").summary).toBe(
      "Comunicação interna entre serviços recusada (configuração).",
    );
  });

  it("does not confuse palavra-chave with the API key", () => {
    expect(summarizeAgentError("Adicione ao menos uma palavra-chave.").summary).toBe(
      "Falha ao executar a ação do agente.",
    );
  });

  it("falls back to a generic summary and keeps the original message as detail", () => {
    expect(summarizeAgentError("Ação não permitida pelo agente: UPDATE_CRM")).toEqual({
      summary: "Falha ao executar a ação do agente.",
      detail: "Ação não permitida pelo agente: UPDATE_CRM",
    });
  });

  it("has no detail when there is no message", () => {
    expect(summarizeAgentError(null)).toEqual({ summary: "Falha ao executar a ação do agente.", detail: null });
    expect(summarizeAgentError("   ")).toEqual({ summary: "Falha ao executar a ação do agente.", detail: null });
  });
});

describe("getExecutionModeLabel", () => {
  it("labels proactive runs and receptive executions", () => {
    expect(getExecutionModeLabel({ actionType: "REPLY", success: true, payload: { proactiveRunId: 12 } })).toBe(
      "Prospecção ativa",
    );
    expect(getExecutionModeLabel({ actionType: "REPLY", success: true, payload: { replyText: "Oi" } })).toBe(
      "Receptivo",
    );
    expect(getExecutionModeLabel({ actionType: "REPLY", success: true, payload: null })).toBe("Receptivo");
  });
});

describe("findOverlappingAlwaysAgents", () => {
  it("returns enabled agents with the ALWAYS trigger ordered by id, ignoring disabled ones", () => {
    const agents = [
      { id: 9, enabled: true, triggers: [{ type: "ALWAYS" }] },
      { id: 3, enabled: false, triggers: [{ type: "ALWAYS" }] },
      { id: 5, enabled: true, triggers: [{ type: "KEYWORD" }] },
      { id: 2, enabled: true, triggers: [{ type: "MESSAGE_DURING_HOURS" }, { type: "ALWAYS" }] },
    ];

    expect(findOverlappingAlwaysAgents(agents).map((agent) => agent.id)).toEqual([2, 9]);
    // Não reordena a lista recebida.
    expect(agents.map((agent) => agent.id)).toEqual([9, 3, 5, 2]);
  });

  it("returns an empty list when no agent uses ALWAYS", () => {
    expect(findOverlappingAlwaysAgents([{ id: 1, enabled: true, triggers: [] }])).toEqual([]);
  });
});
