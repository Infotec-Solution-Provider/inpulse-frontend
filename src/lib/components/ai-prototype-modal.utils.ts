export type AIPrototypeMode = "suggest-response" | "summarize-chat" | "analyze-customer";

export interface AIPrototypeFactContext {
  contactName: string;
  customerName?: string | null;
  customerId?: number | null;
  startedAt?: string | null;
  messageCount?: number;
}

export interface AIPrototypeFactChip {
  id: "contact" | "customer" | "started-at" | "messages";
  label: string;
}

export interface AIPrototypeModeCopy {
  title: string;
  subtitle: string;
  resultTitle: string;
  loadingTitle: string;
  emptyMessage: string;
}

export const DEFAULT_AI_ERROR_MESSAGE = "Não foi possível obter resposta da IA. Tente novamente.";

export const MODE_COPY: Record<AIPrototypeMode, AIPrototypeModeCopy> = {
  "suggest-response": {
    title: "Sugestão de resposta",
    subtitle: "Respostas sugeridas pela IA para a última mensagem do cliente.",
    resultTitle: "Respostas sugeridas",
    loadingTitle: "Gerando sugestões com IA",
    emptyMessage: "A IA não retornou sugestões.",
  },
  "summarize-chat": {
    title: "Resumo da conversa",
    subtitle: "Resumo gerado pela IA a partir das mensagens deste atendimento.",
    resultTitle: "Resumo gerado pela IA",
    loadingTitle: "Gerando resumo com IA",
    emptyMessage: "A IA não retornou conteúdo.",
  },
  "analyze-customer": {
    title: "Análise do cliente",
    subtitle: "Histórico de compras e leitura da IA sobre o cliente.",
    resultTitle: "Análise da IA",
    loadingTitle: "Gerando análise com IA",
    emptyMessage: "A IA não retornou conteúdo.",
  },
};

/** Sugestões que podem ser exibidas e inseridas: só textos reais, aparados e não vazios. */
export function getActiveSuggestions(raw: readonly unknown[] | null | undefined): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((suggestion): suggestion is string => typeof suggestion === "string")
    .map((suggestion) => suggestion.trim())
    .filter((suggestion) => suggestion.length > 0);
}

export function canInsertSuggestion({
  mode,
  isLoading,
  error,
  suggestions,
}: {
  mode: AIPrototypeMode;
  isLoading: boolean;
  error?: string | null;
  suggestions: readonly string[];
}): boolean {
  return mode === "suggest-response" && !isLoading && !error && suggestions.length > 0;
}

/** Sugestão selecionada, ou null quando o índice não aponta para uma sugestão real. */
export function getSelectedSuggestion(suggestions: readonly string[], index: number): string | null {
  return suggestions[index] ?? null;
}

function formatStartDate(startedAt?: string | null): string | null {
  if (!startedAt) {
    return null;
  }

  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Chips do cabeçalho do modal: apenas fatos do atendimento, nunca leitura ou opinião. */
export function buildFactChips(context: AIPrototypeFactContext): AIPrototypeFactChip[] {
  const chips: AIPrototypeFactChip[] = [];

  const contactName = context.contactName?.trim();
  if (contactName) {
    chips.push({ id: "contact", label: contactName });
  }

  const customerName = context.customerName?.trim();
  if (customerName) {
    chips.push({ id: "customer", label: `Cliente: ${customerName}` });
  } else if (typeof context.customerId === "number" && context.customerId > 0) {
    chips.push({ id: "customer", label: `Cliente #${context.customerId}` });
  } else {
    chips.push({ id: "customer", label: "Sem cliente vinculado" });
  }

  const startDate = formatStartDate(context.startedAt);
  if (startDate) {
    chips.push({ id: "started-at", label: `Início ${startDate}` });
  }

  const messageCount = context.messageCount ?? 0;
  if (Number.isFinite(messageCount) && messageCount > 0) {
    chips.push({ id: "messages", label: `${messageCount} ${messageCount === 1 ? "mensagem" : "mensagens"}` });
  }

  return chips;
}

const TIMEOUT_MESSAGE_PATTERN = /^timeout of \d+ms exceeded$/i;
const NETWORK_ERROR_PATTERN = /^network error$/i;
const GENERIC_HTTP_ERROR_PATTERN = /^request failed with status code \d+$/i;
const CANCELED_PATTERN = /^(canceled|cancelled|aborted)$/i;

/**
 * Mensagem para o usuário a partir do erro da chamada à IA. O interceptor do sdk-local já
 * converte a resposta do backend em `Error.message` (em linguagem de negócio); mensagens
 * técnicas do axios, sem resposta do servidor, viram textos equivalentes aos do ai-service.
 */
export function getAiErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return DEFAULT_AI_ERROR_MESSAGE;
  }

  const message = typeof error.message === "string" ? error.message.trim() : "";
  if (!message) {
    return DEFAULT_AI_ERROR_MESSAGE;
  }

  if (TIMEOUT_MESSAGE_PATTERN.test(message)) {
    return "A IA demorou demais para responder. Tente novamente.";
  }

  if (NETWORK_ERROR_PATTERN.test(message)) {
    return "Não foi possível falar com a IA agora. Tente novamente em instantes.";
  }

  if (GENERIC_HTTP_ERROR_PATTERN.test(message) || CANCELED_PATTERN.test(message)) {
    return DEFAULT_AI_ERROR_MESSAGE;
  }

  return message;
}
