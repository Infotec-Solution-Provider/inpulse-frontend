import type { AiAgentActionType, AiAgentChatSessionStatus } from "@/lib/sdk-local";

/**
 * Rótulos e resumos das telas de agentes de IA (cadastro, auditoria e logs do chat).
 * Funções puras: recebem só o formato mínimo que usam, para servir tanto aos tipos
 * locais (`@/lib/sdk-local`) quanto aos do SDK vendorizado (`@/lib/types/sdk-local.types`).
 */

type AgentLogLike = {
  actionType: string;
  success: boolean;
  payload?: Record<string, unknown> | null;
};

type AgentSessionLike = {
  createdAt?: string | null;
  startedAt?: string | null;
};

type AgentWithTriggersLike = {
  id: number;
  enabled: boolean;
  triggers: ReadonlyArray<{ type: string }>;
};

export const SESSION_STATUS_LABELS: Record<AiAgentChatSessionStatus, string> = {
  ACTIVE: "Em andamento",
  PAUSED: "Pausada",
  FINISHED: "Encerrada",
};

export const AGENT_ACTION_LABELS: Record<AiAgentActionType, string> = {
  REPLY: "Respondeu",
  SEND_TEMPLATE: "Enviou template",
  SEND_FILE: "Enviou arquivo",
  ESCALATE: "Transferiu para humano",
  CLOSE_CHAT: "Encerrou a conversa",
  UPDATE_CRM: "Atualizou o CRM",
  SCHEDULE: "Agendou",
  IGNORED: "Não respondeu",
};

export const AGENT_PRIORITY_HINT =
  "Quando mais de um agente pode atender, vale a ordem: Palavra-chave, depois Mensagem dentro do horário, depois Sempre; em empate, o agente criado primeiro. Uma conversa já atendida por um agente ou por uma pessoa não é assumida por outro agente.";

export const AGENT_HUMAN_PAUSE_HINT =
  "Quando alguém da equipe responde no chat, o agente para de responder naquele atendimento e volta a atuar no próximo atendimento do contato.";

export const AUTO_REPLY_PRECEDENCE_HINT =
  "Se houver resposta automática de fora do horário configurada, ela tem prioridade e o agente não responde à mesma mensagem. Desative a regra nos horários em que o agente atua.";

const PROACTIVE_MODE_LABEL = "Prospecção ativa";
const RECEPTIVE_MODE_LABEL = "Receptivo";

function getPayloadString(payload: AgentLogLike["payload"], key: string): string | null {
  if (!payload || typeof payload !== "object") return null;

  const value = payload[key];
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getSessionStatusLabel(status: string): string {
  return SESSION_STATUS_LABELS[status as AiAgentChatSessionStatus] ?? status;
}

export function getActionTypeLabel(actionType: string): string {
  return AGENT_ACTION_LABELS[actionType as AiAgentActionType] ?? actionType;
}

export function getLogActionLabel(log: AgentLogLike): string {
  const reason = getPayloadString(log.payload, "reason");

  if (reason === "HUMAN_TAKEOVER") {
    return "Pausada: uma pessoa da equipe assumiu a conversa";
  }

  if (reason === "MAX_TURNS") {
    return "Encerrada: limite de turnos do agente atingido";
  }

  if (log.actionType === "ESCALATE" && log.success) {
    return `Transferiu para ${getPayloadString(log.payload, "escalatedToUserName") ?? "um atendente"}`;
  }

  return getActionTypeLabel(log.actionType);
}

/** Decisão de não responder que deu certo: não é sucesso nem falha, fica em cor neutra. */
export function isNeutralAction(log: AgentLogLike): boolean {
  return log.actionType === "IGNORED" && log.success;
}

export function isProactiveLog(log: AgentLogLike): boolean {
  return !!log.payload && typeof log.payload === "object" && "proactiveRunId" in log.payload;
}

export function getExecutionModeLabel(log: AgentLogLike): string {
  return isProactiveLog(log) ? PROACTIVE_MODE_LABEL : RECEPTIVE_MODE_LABEL;
}

function padTwo(value: number) {
  return String(value).padStart(2, "0");
}

/** `dd/mm/aaaa hh:mm` no horário do navegador, ou “—” quando a data não existe ou é inválida. */
export function formatAiDateTime(value?: string | Date | null): string {
  if (value === null || value === undefined || value === "") return "—";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return `${padTwo(date.getDate())}/${padTwo(date.getMonth() + 1)}/${date.getFullYear()} ${padTwo(
    date.getHours(),
  )}:${padTwo(date.getMinutes())}`;
}

/** O backend grava `createdAt`; versões novas também mandam `startedAt` (= `createdAt`). */
export function getSessionStartedAt(session: AgentSessionLike): string | null {
  return session.createdAt ?? session.startedAt ?? null;
}

const DEFAULT_ERROR_SUMMARY = "Falha ao executar a ação do agente.";

/** Ordem importa: a primeira regra que casar define o resumo. */
const AGENT_ERROR_RULES: ReadonlyArray<{ pattern: RegExp; summary: string }> = [
  {
    pattern: /requer token|token de autentica[çc][ãa]o/i,
    summary: "A ação exigia credenciais que o agente não tinha (versão anterior do sistema).",
  },
  {
    pattern: /atualiza[çc][ãa]o do sistema|n[ãa]o tem a rota/i,
    summary: "Esta ação precisa de uma atualização do sistema.",
  },
  {
    pattern: /comunica[çc][ãa]o interna|recusou a chamada interna|acesso restrito|INTERNAL_SERVICE_TOKEN/i,
    summary: "Comunicação interna entre serviços recusada (configuração).",
  },
  {
    // “chave” sozinha (não “palavra-chave”).
    pattern: /n[ãa]o foi configurada|OPENAI_API_KEY|problema de configura[çc][ãa]o|(^|[^\w-])chave/i,
    summary: "A IA não está configurada ou a chave é inválida.",
  },
  {
    pattern: /limite de uso|\b429\b/i,
    summary: "Limite de uso da IA atingido.",
  },
  {
    pattern: /demorou demais|timeout|ETIMEDOUT/i,
    summary: "A IA ou um serviço demorou demais para responder.",
  },
  {
    pattern: /n[ãa]o foi poss[íi]vel falar|ECONNREFUSED|ENOTFOUND|socket hang up|indispon[íi]vel/i,
    summary: "Serviço interno indisponível no momento.",
  },
  {
    pattern: /cortada|limite de tokens/i,
    summary: "A resposta da IA foi cortada; aumente o máximo de tokens do agente.",
  },
  {
    pattern: /operador de transfer[êe]ncia/i,
    summary: "Nenhum operador configurado para transferência.",
  },
  {
    pattern: /JSON v[áa]lido/i,
    summary: "A IA respondeu fora do formato esperado.",
  },
  {
    pattern: /n[ãa]o encontrad[oa]|\b404\b/i,
    summary: "Conversa ou recurso não encontrado.",
  },
];

/**
 * Resume o `errorMessage` da auditoria em linguagem de negócio. `detail` guarda a mensagem
 * original (com o detalhe técnico), para ser exibida recolhida.
 */
export function summarizeAgentError(message?: string | null): { summary: string; detail: string | null } {
  const original = typeof message === "string" ? message.trim() : "";

  if (!original) {
    return { summary: DEFAULT_ERROR_SUMMARY, detail: null };
  }

  const rule = AGENT_ERROR_RULES.find(({ pattern }) => pattern.test(original));

  return { summary: rule?.summary ?? DEFAULT_ERROR_SUMMARY, detail: original };
}

/** Agentes habilitados com o gatilho “Sempre”, do mais antigo para o mais novo (ordem de desempate). */
export function findOverlappingAlwaysAgents<T extends AgentWithTriggersLike>(agents: ReadonlyArray<T>): T[] {
  return agents
    .filter((agent) => agent.enabled && agent.triggers.some((trigger) => trigger.type === "ALWAYS"))
    .sort((left, right) => left.id - right.id);
}
