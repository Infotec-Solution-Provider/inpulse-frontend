"use client";

import { useAuthContext } from "@/app/auth-context";
import { useAppContext } from "@/app/(private)/[instance]/app-context";
import customersService from "@/lib/services/customers.service";
import type { CustomerFullDetail, CustomerPurchaseDetail } from "@/app/(private)/[instance]/(main)/(chats-menu)/(start-chat-modal)/customer-crm-detail-modal.types";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import InsightsIcon from "@mui/icons-material/Insights";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SummarizeIcon from "@mui/icons-material/Summarize";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "react-toastify";

export type AIPrototypeMode = "suggest-response" | "summarize-chat" | "analyze-customer";

interface AIPrototypeModalProps {
  mode: AIPrototypeMode;
  onApplySuggestion?: (suggestion: string) => void;
  context: {
    contactName: string;
    customerName?: string | null;
    customerId?: number | null;
    phone?: string | null;
    startedAt?: string | null;
    messageCount?: number;
    lastMessage?: string | null;
  };
}

interface AIPrototypeContent {
  title: string;
  subtitle: string;
  badges: string[];
  insightTitle: string;
  insightText: string;
  suggestions?: string[];
  bullets: string[];
  primaryActionType: "copy" | "close";
  primaryActionLabel: string;
  primaryActionText?: string;
}

interface PurchaseTimelinePoint {
  dateLabel: string;
  fullDateLabel: string;
  value: number;
  purchaseCode: number;
}

interface PurchaseAnalytics {
  chartData: PurchaseTimelinePoint[];
  totalPurchases: number;
  totalRevenue: number;
  averageTicket: number;
  averageRepurchaseDays: number | null;
  daysSinceLastPurchase: number | null;
  nextRepurchaseDate: Date | null;
  proximityRatio: number | null;
  semaphoreStatus: "green" | "yellow" | "red" | "neutral";
  overdueDays: number | null;
}

function formatCurrency(value?: number | null) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function calculatePurchaseAnalytics(purchases: CustomerPurchaseDetail[]): PurchaseAnalytics {
  const parsedPurchases = purchases
    .map((purchase) => {
      const purchaseDate = new Date(purchase.DATA);

      if (Number.isNaN(purchaseDate.getTime())) {
        return null;
      }

      return {
        ...purchase,
        purchaseDate,
      };
    })
    .filter((purchase): purchase is CustomerPurchaseDetail & { purchaseDate: Date } => purchase !== null)
    .sort((left, right) => left.purchaseDate.getTime() - right.purchaseDate.getTime());

  const chartData = parsedPurchases.map((purchase) => ({
    dateLabel: formatShortDate(purchase.purchaseDate),
    fullDateLabel: purchase.purchaseDate.toLocaleDateString("pt-BR"),
    value: purchase.VALOR,
    purchaseCode: purchase.CODIGO,
  }));

  const totalRevenue = parsedPurchases.reduce((sum, purchase) => sum + purchase.VALOR, 0);
  const totalPurchases = parsedPurchases.length;
  const averageTicket = totalPurchases ? totalRevenue / totalPurchases : 0;

  const repurchaseIntervals: number[] = [];
  for (let index = 1; index < parsedPurchases.length; index += 1) {
    const currentPurchase = parsedPurchases[index];
    const previousPurchase = parsedPurchases[index - 1];

    if (!currentPurchase || !previousPurchase) {
      continue;
    }

    const intervalInDays = Math.max(
      1,
      Math.round((currentPurchase.purchaseDate.getTime() - previousPurchase.purchaseDate.getTime()) / 86400000),
    );

    repurchaseIntervals.push(intervalInDays);
  }

  const averageRepurchaseDays = repurchaseIntervals.length
    ? repurchaseIntervals.reduce((sum, interval) => sum + interval, 0) / repurchaseIntervals.length
    : null;

  const lastPurchase = parsedPurchases.at(-1) ?? null;
  const now = new Date();
  const daysSinceLastPurchase = lastPurchase
    ? Math.max(0, Math.round((now.getTime() - lastPurchase.purchaseDate.getTime()) / 86400000))
    : null;

  const nextRepurchaseDate =
    lastPurchase && averageRepurchaseDays
      ? new Date(lastPurchase.purchaseDate.getTime() + averageRepurchaseDays * 86400000)
      : null;

  const proximityRatio = averageRepurchaseDays && daysSinceLastPurchase != null
    ? daysSinceLastPurchase / averageRepurchaseDays
    : null;

  let semaphoreStatus: PurchaseAnalytics["semaphoreStatus"] = "neutral";

  if (proximityRatio != null) {
    if (proximityRatio < 0.75) {
      semaphoreStatus = "green";
    } else if (proximityRatio <= 1) {
      semaphoreStatus = "yellow";
    } else {
      semaphoreStatus = "red";
    }
  }

  const overdueDays = nextRepurchaseDate
    ? Math.max(0, Math.round((now.getTime() - nextRepurchaseDate.getTime()) / 86400000))
    : null;

  return {
    chartData,
    totalPurchases,
    totalRevenue,
    averageTicket,
    averageRepurchaseDays,
    daysSinceLastPurchase,
    nextRepurchaseDate,
    proximityRatio,
    semaphoreStatus,
    overdueDays,
  };
}

function getSemaphoreAccent(status: PurchaseAnalytics["semaphoreStatus"]) {
  if (status === "green") {
    return {
      label: "Dentro da janela",
      tone: "text-emerald-700 dark:text-emerald-300",
      marker: "#10b981",
    };
  }

  if (status === "yellow") {
    return {
      label: "Próximo da recompra",
      tone: "text-amber-700 dark:text-amber-300",
      marker: "#f59e0b",
    };
  }

  if (status === "red") {
    return {
      label: "Janela vencida",
      tone: "text-rose-700 dark:text-rose-300",
      marker: "#ef4444",
    };
  }

  return {
    label: "Dados insuficientes",
    tone: "text-slate-600 dark:text-slate-300",
    marker: "#94a3b8",
  };
}

function getLastMessageExcerpt(lastMessage?: string | null) {
  if (!lastMessage) {
    return "cliente pediu atualização do atendimento e orientação para o próximo passo";
  }

  const normalized = lastMessage.trim();
  if (!normalized) {
    return "cliente pediu atualização do atendimento e orientação para o próximo passo";
  }

  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

function buildPrototypeContent(mode: AIPrototypeMode, context: AIPrototypeModalProps["context"]): AIPrototypeContent {
  const customerDisplay = context.customerName || "cliente sem vínculo CRM";
  const messageCount = context.messageCount || 0;
  const lastMessageExcerpt = getLastMessageExcerpt(context.lastMessage);
  const startedAt = context.startedAt
    ? new Date(context.startedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "hoje";

  if (mode === "suggest-response") {
    const primaryText = `Olá, ${context.contactName}. Já revisei o seu caso e vou te orientar no melhor próximo passo agora mesmo.`;

    return {
      title: "Sugestão de resposta",
      subtitle: `Resposta pronta para ${context.contactName}, considerando o momento atual da conversa.`,
      badges: ["Tom consultivo", "Resposta objetiva", customerDisplay],
      insightTitle: "Leitura da IA",
      insightText: `A mensagem mais recente indica que o contato busca segurança e direcionamento rápido. O melhor caminho é responder com confirmação, próximo passo e senso de acompanhamento.`,
      suggestions: [
        primaryText,
        `Perfeito, ${context.contactName}. Estou validando isso para você e já te retorno com a recomendação mais adequada.`,
        `Entendi o seu ponto. Vou conduzir isso de forma prática e te sinalizar o que pode ser feito a seguir.`,
      ],
      bullets: [
        `Última mensagem considerada: “${lastMessageExcerpt}”`,
        `Contexto usado: ${messageCount} mensagem(ns) visível(is) na conversa`,
        `Foco da recomendação: reduzir atrito e manter o cliente engajado`,
      ],
      primaryActionType: "copy",
      primaryActionLabel: "Copiar sugestão principal",
      primaryActionText: primaryText,
    };
  }

  if (mode === "summarize-chat") {
    return {
      title: "Resumo da conversa",
      subtitle: `Síntese executiva do atendimento com foco em continuidade.`,
      badges: ["Resumo executivo", `Início ${startedAt}`, `${messageCount} mensagens`],
      insightTitle: "Resumo gerado",
      insightText: `${context.contactName} está em uma etapa de esclarecimento e demonstra expectativa por retorno objetivo. A conversa até aqui aponta necessidade de acompanhamento próximo, com resposta simples e direcionada.`,
      bullets: [
        `Cliente relacionado: ${customerDisplay}`,
        `Tema dominante: alinhamento do próximo passo comercial`,
        `Trecho mais relevante: “${lastMessageExcerpt}”`,
        `Recomendação: manter resposta curta, confirmar entendimento e avançar com proposta clara`,
      ],
      primaryActionType: "close",
      primaryActionLabel: "Fechar",
    };
  }

  const hasCustomer = Boolean(context.customerId);
  return {
    title: "Análise do cliente",
    subtitle: `Leitura comercial rápida para apoiar a próxima abordagem.`,
    badges: [hasCustomer ? "Cliente identificado" : "Sem vínculo CRM", customerDisplay],
    insightTitle: "Leitura estratégica",
    insightText: hasCustomer
      ? `${customerDisplay} aparenta estar em momento favorável para aprofundar conversa comercial, desde que a abordagem seja consultiva e orientada a valor.`
      : `${context.contactName} ainda não está vinculado a um cliente CRM, então a melhor oportunidade é avançar com qualificação e captura de contexto antes de oferta.`,
    bullets: [
      hasCustomer
        ? `Cliente vinculado: ${customerDisplay} (${context.customerId})`
        : "Contato ainda sem cliente vinculado ao CRM",
      `Sinal operacional: conversa ativa com potencial de continuidade`,
      `Próxima melhor ação: confirmar necessidade principal e abrir caminho para proposta guiada`,
      `Risco percebido: demora na devolutiva pode reduzir intenção de resposta`,
    ],
    primaryActionType: "close",
    primaryActionLabel: "Fechar",
  };
}

function getModeIcon(mode: AIPrototypeMode) {
  if (mode === "suggest-response") return <AutoAwesomeIcon sx={{ fontSize: 20 }} />;
  if (mode === "summarize-chat") return <SummarizeIcon sx={{ fontSize: 20 }} />;
  return <InsightsIcon sx={{ fontSize: 20 }} />;
}

export default function AIPrototypeModal({ mode, onApplySuggestion, context }: AIPrototypeModalProps) {
  const { closeModal } = useAppContext();
  const { token } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [purchaseHistory, setPurchaseHistory] = useState<CustomerPurchaseDetail[]>([]);
  const [isPurchaseHistoryLoading, setIsPurchaseHistoryLoading] = useState(false);
  const [purchaseHistoryError, setPurchaseHistoryError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsLoading(false);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, []);

  const content = useMemo(() => buildPrototypeContent(mode, context), [mode, context]);
  const shouldRenderSecondaryCloseButton = content.primaryActionType !== "close";
  const selectedSuggestion = content.suggestions?.[selectedSuggestionIndex] ?? content.primaryActionText;

  useEffect(() => {
    setSelectedSuggestionIndex(0);
  }, [mode, context]);

  useEffect(() => {
    if (mode !== "analyze-customer" || !context.customerId || !token) {
      setPurchaseHistory([]);
      setPurchaseHistoryError(null);
      setIsPurchaseHistoryLoading(false);
      return;
    }

    let isMounted = true;
    setIsPurchaseHistoryLoading(true);
    setPurchaseHistoryError(null);

    customersService.setAuth(token);
    customersService.ax
      .get<{ message: string; data: CustomerFullDetail }>(`/api/customers/${context.customerId}/full`)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setPurchaseHistory(response.data.data.purchases ?? []);
      })
      .catch((error) => {
        console.error("Erro ao carregar histórico de compras para análise do cliente:", error);

        if (!isMounted) {
          return;
        }

        setPurchaseHistory([]);
        setPurchaseHistoryError("Não foi possível carregar o histórico de compras deste cliente.");
      })
      .finally(() => {
        if (isMounted) {
          setIsPurchaseHistoryLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [context.customerId, mode, token]);

  const purchaseAnalytics = useMemo(() => calculatePurchaseAnalytics(purchaseHistory), [purchaseHistory]);
  const semaphoreAccent = useMemo(
    () => getSemaphoreAccent(purchaseAnalytics.semaphoreStatus),
    [purchaseAnalytics.semaphoreStatus],
  );
  const isAnalysisMode = mode === "analyze-customer";
  const shouldShowPurchasePanel = isAnalysisMode && Boolean(context.customerId);

  const handlePrimaryAction = async () => {
    if (content.primaryActionType === "close") {
      closeModal();
      return;
    }

    if (!selectedSuggestion) {
      closeModal();
      return;
    }

    if (onApplySuggestion) {
      onApplySuggestion(selectedSuggestion);
      closeModal();
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedSuggestion);
      toast.success("Sugestão copiada para a área de transferência.");
    } catch {
      toast.info("Não foi possível copiar automaticamente, mas a sugestão está visível na tela.");
    }
  };

  return (
    <div className="flex max-h-[calc(100vh-2rem)] w-[min(44rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-2.5 text-white shadow-lg">
            {getModeIcon(mode)}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{content.title}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{content.subtitle}</p>
          </div>
        </div>

        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {isLoading ? (
          <div className="flex min-h-[min(22rem,50vh)] flex-col items-center justify-center gap-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <CircularProgress size={34} />
            <div className="text-center">
              <p className="text-base font-semibold">Processando contexto do atendimento</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Analisando conversa, histórico visível e perfil do contato.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {content.badges.map((badge) => (
                <Chip
                  key={badge}
                  size="small"
                  label={badge}
                  sx={{
                    height: 24,
                    borderRadius: "999px",
                    fontWeight: 700,
                    backgroundColor: "rgba(59, 130, 246, 0.08)",
                    color: "rgb(37, 99, 235)",
                    "& .MuiChip-label": { px: 1.2 },
                  }}
                />
              ))}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-800 dark:to-slate-800/60">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {content.insightTitle}
              </p>
              <p className="mt-2 text-[0.98rem] leading-7 text-slate-700 dark:text-slate-200">
                {content.insightText}
              </p>
            </div>

            {shouldShowPurchasePanel ? (
              <div className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Ritmo de compras
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
                      Histórico e proximidade da próxima recompra
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Chip label={`${purchaseAnalytics.totalPurchases} compra(s)`} size="small" />
                    <Chip label={`Ticket médio ${formatCurrency(purchaseAnalytics.averageTicket)}`} size="small" />
                  </div>
                </div>

                {isPurchaseHistoryLoading ? (
                  <div className="flex min-h-[18rem] items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                    <CircularProgress size={28} />
                  </div>
                ) : purchaseHistoryError ? (
                  <Alert severity="warning">{purchaseHistoryError}</Alert>
                ) : purchaseAnalytics.totalPurchases === 0 ? (
                  <Alert severity="info">Este cliente ainda não possui compras registradas para análise.</Alert>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Total comprado
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(purchaseAnalytics.totalRevenue)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Média entre recompras
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                          {purchaseAnalytics.averageRepurchaseDays != null
                            ? `${Math.round(purchaseAnalytics.averageRepurchaseDays)} dias`
                            : "Sem base suficiente"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Última compra
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                          {purchaseAnalytics.daysSinceLastPurchase != null
                            ? `${purchaseAnalytics.daysSinceLastPurchase} dias atrás`
                            : "Sem registro"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            Linha do tempo de compras
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Pontos representam compras e o eixo Y mostra o valor faturado.
                          </p>
                        </div>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={purchaseAnalytics.chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                            <XAxis dataKey="dateLabel" stroke="#94a3b8" fontSize={12} />
                            <YAxis
                              stroke="#94a3b8"
                              fontSize={12}
                              tickFormatter={(value) => formatCurrency(Number(value))}
                              width={88}
                            />
                            <RechartsTooltip
                              formatter={(value: number) => [formatCurrency(Number(value)), "Valor"]}
                              labelFormatter={(_, payload) => {
                                const item = payload?.[0]?.payload as PurchaseTimelinePoint | undefined;
                                return item ? `Compra #${item.purchaseCode} em ${item.fullDateLabel}` : "Compra";
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#06b6d4"
                              strokeWidth={3}
                              dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            Semáforo de recompra
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Baseado na média atual entre compras e no tempo desde a última compra.
                          </p>
                        </div>
                        <span className={`text-sm font-semibold ${semaphoreAccent.tone}`}>{semaphoreAccent.label}</span>
                      </div>

                      {purchaseAnalytics.averageRepurchaseDays == null || purchaseAnalytics.daysSinceLastPurchase == null ? (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          São necessárias pelo menos duas compras válidas para estimar o próximo período de recompra.
                        </Alert>
                      ) : (
                        <div className="mt-4 space-y-4">
                          <div className="relative overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
                            <div className="grid h-5 grid-cols-3">
                              <div className="bg-emerald-500/85" />
                              <div className="bg-amber-400/90" />
                              <div className="bg-rose-500/85" />
                            </div>
                            <div
                              className="absolute top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-slate-900 shadow-[0_0_0_2px_rgba(255,255,255,0.95)] dark:bg-white"
                              style={{
                                left: `${Math.min(100, Math.max(0, (purchaseAnalytics.proximityRatio ?? 0) * 100))}%`,
                                borderColor: semaphoreAccent.marker,
                              }}
                            />
                          </div>

                          <div className="grid gap-3 text-sm md:grid-cols-3">
                            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Última compra</p>
                              <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                {purchaseAnalytics.daysSinceLastPurchase} dias atrás
                              </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Próxima janela</p>
                              <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                {purchaseAnalytics.nextRepurchaseDate?.toLocaleDateString("pt-BR") ?? "-"}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Situação</p>
                              <p className={`mt-1 font-semibold ${semaphoreAccent.tone}`}>
                                {purchaseAnalytics.overdueDays
                                  ? `${purchaseAnalytics.overdueDays} dia(s) de atraso`
                                  : "Dentro do intervalo esperado"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {content.suggestions?.length ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Respostas sugeridas</p>
                {content.suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion}-${index}`}
                    type="button"
                    onClick={() => setSelectedSuggestionIndex(index)}
                    className={`w-full rounded-2xl border p-3 text-left text-sm leading-6 transition-all ${
                      selectedSuggestionIndex === index
                        ? "border-cyan-500 bg-cyan-50 text-slate-800 shadow-[0_0_0_1px_rgba(6,182,212,0.16)] dark:border-cyan-400 dark:bg-cyan-950/20 dark:text-slate-100"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {selectedSuggestionIndex === index ? (
                          <CheckCircleIcon sx={{ fontSize: 18, color: "rgb(8 145 178)" }} />
                        ) : (
                          <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: "rgb(148 163 184)" }} />
                        )}
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Sugestão {index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <Tooltip title="Sugestão principal">
                            <Box className="rounded-full bg-emerald-500/10 px-2 py-1 text-[0.68rem] font-bold text-emerald-600">
                              Prioritária
                            </Box>
                          </Tooltip>
                        )}
                        {selectedSuggestionIndex === index ? (
                          <Box className="rounded-full bg-cyan-500/10 px-2 py-1 text-[0.68rem] font-bold text-cyan-700 dark:text-cyan-300">
                            Selecionada
                          </Box>
                        ) : null}
                      </div>
                    </div>
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Pontos considerados</p>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {content.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-500" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
        {shouldRenderSecondaryCloseButton ? (
          <Button variant="outlined" color="inherit" onClick={closeModal}>
            Fechar
          </Button>
        ) : null}
        <Button variant="contained" onClick={handlePrimaryAction}>
          {mode === "suggest-response" ? "Inserir resposta selecionada" : content.primaryActionLabel}
        </Button>
      </footer>
    </div>
  );
}