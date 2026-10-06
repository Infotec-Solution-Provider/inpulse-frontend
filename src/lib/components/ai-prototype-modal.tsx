"use client";

import { useAuthContext } from "@/app/auth-context";
import { useAppContext } from "@/app/(private)/[instance]/app-context";
import customersService from "@/lib/services/customers.service";
import aiService from "@/lib/services/ai.service";
import type { CustomerFullDetail, CustomerPurchaseDetail } from "@/app/(private)/[instance]/(main)/(chats-menu)/(start-chat-modal)/customer-crm-detail-modal.types";
import {
  MODE_COPY,
  buildFactChips,
  canInsertSuggestion,
  getActiveSuggestions,
  getAiErrorMessage,
  getSelectedSuggestion,
  type AIPrototypeMode,
} from "@/lib/components/ai-prototype-modal.utils";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import InsightsIcon from "@mui/icons-material/Insights";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RefreshIcon from "@mui/icons-material/Refresh";
import SummarizeIcon from "@mui/icons-material/Summarize";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
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

export type { AIPrototypeMode } from "@/lib/components/ai-prototype-modal.utils";

type AIRequestStatus = "idle" | "loading" | "success" | "error";

interface AIPrototypeModalProps {
  mode: AIPrototypeMode;
  onApplySuggestion?: (suggestion: string) => void;
  context: {
    chatId?: number | null;
    contactName: string;
    customerName?: string | null;
    customerId?: number | null;
    phone?: string | null;
    startedAt?: string | null;
    messageCount?: number;
    lastMessage?: string | null;
  };
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
  situationLabel: string;
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

  const daysUntilNextRepurchase = nextRepurchaseDate
    ? Math.round((nextRepurchaseDate.getTime() - now.getTime()) / 86400000)
    : null;

  const proximityRatio = averageRepurchaseDays && daysSinceLastPurchase != null
    ? daysSinceLastPurchase / averageRepurchaseDays
    : null;

  let semaphoreStatus: PurchaseAnalytics["semaphoreStatus"] = "neutral";

  if (proximityRatio != null) {
    if (proximityRatio < 0.75) {
      semaphoreStatus = "red";
    } else if (proximityRatio <= 1) {
      semaphoreStatus = "yellow";
    } else {
      semaphoreStatus = "green";
    }
  }

  const overdueDays = nextRepurchaseDate
    ? Math.max(0, Math.round((now.getTime() - nextRepurchaseDate.getTime()) / 86400000))
    : null;

  const situationLabel = (() => {
    if (daysUntilNextRepurchase == null) {
      return "Dentro do intervalo esperado";
    }

    if (daysUntilNextRepurchase > 0) {
      return `Faltam ${daysUntilNextRepurchase} dia${daysUntilNextRepurchase === 1 ? "" : "s"} para a próxima recompra`;
    }

    if (daysUntilNextRepurchase < 0) {
      const daysLate = Math.abs(daysUntilNextRepurchase);
      return `${daysLate} dia${daysLate === 1 ? "" : "s"} de atraso`;
    }

    return "A recompra é hoje";
  })();

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
    situationLabel,
  };
}

function getSemaphoreAccent(status: PurchaseAnalytics["semaphoreStatus"]) {
  if (status === "green") {
    return {
      label: "Pronto para comprar",
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
      label: "Longe da recompra",
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

function getModeIcon(mode: AIPrototypeMode) {
  if (mode === "suggest-response") return <AutoAwesomeIcon sx={{ fontSize: 20 }} />;
  if (mode === "summarize-chat") return <SummarizeIcon sx={{ fontSize: 20 }} />;
  return <InsightsIcon sx={{ fontSize: 20 }} />;
}

function renderMarkdown(text: string): React.ReactNode {
  const result: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let key = 0;

  const flush = () => {
    if (!listItems.length) return;
    if (listType === "ol") {
      result.push(<ol key={key++} className="my-1 ml-5 list-decimal space-y-0.5">{listItems}</ol>);
    } else {
      result.push(<ul key={key++} className="my-1 ml-5 list-disc space-y-0.5">{listItems}</ul>);
    }
    listItems = [];
    listType = null;
  };

  const inline = (str: string): React.ReactNode[] =>
    str.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
      return part;
    });

  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) { flush(); continue; }
    if (t.startsWith("### ")) {
      flush();
      result.push(<h3 key={key++} className="mt-3 mb-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{inline(t.slice(4))}</h3>);
    } else if (t.startsWith("## ")) {
      flush();
      result.push(<h2 key={key++} className="mt-3 mb-0.5 text-[0.95rem] font-bold text-slate-800 dark:text-slate-100">{inline(t.slice(3))}</h2>);
    } else if (t.startsWith("# ")) {
      flush();
      result.push(<h1 key={key++} className="mt-3 mb-0.5 text-base font-bold text-slate-800 dark:text-slate-100">{inline(t.slice(2))}</h1>);
    } else if (t.startsWith("- ") || t.startsWith("* ")) {
      if (listType === "ol") flush();
      listType = "ul";
      listItems.push(<li key={key++}>{inline(t.slice(2))}</li>);
    } else if (/^\d+\.\s/.test(t)) {
      if (listType === "ul") flush();
      listType = "ol";
      listItems.push(<li key={key++}>{inline(t.replace(/^\d+\.\s/, ""))}</li>);
    } else {
      flush();
      result.push(<p key={key++} className="leading-7">{inline(t)}</p>);
    }
  }
  flush();
  return result;
}

export default function AIPrototypeModal({ mode, onApplySuggestion, context }: AIPrototypeModalProps) {
  const { closeModal } = useAppContext();
  const { token } = useAuthContext();
  const [aiStatus, setAiStatus] = useState<AIRequestStatus>(mode === "analyze-customer" ? "idle" : "loading");
  const [aiAnalysisRequested, setAiAnalysisRequested] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [purchaseHistory, setPurchaseHistory] = useState<CustomerPurchaseDetail[]>([]);
  const [isPurchaseHistoryLoading, setIsPurchaseHistoryLoading] = useState(false);
  const [purchaseHistoryError, setPurchaseHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "analyze-customer" && !aiAnalysisRequested) return;

    let isMounted = true;
    const fail = (message: string) => {
      if (!isMounted) return;
      setAiError(message);
      setAiStatus("error");
    };

    setAiError(null);
    setAiText(null);
    setAiSuggestions([]);
    setSelectedSuggestionIndex(0);

    if (!token) {
      fail("Sessão inválida. Faça login novamente.");
      return () => { isMounted = false; };
    }

    setAiStatus("loading");

    const run = async () => {
      try {
        if (mode === "suggest-response") {
          if (!context.chatId) {
            fail("Chat não identificado para esta sugestão.");
            return;
          }
          const res = await aiService.suggestResponse({ chatId: context.chatId }, token);
          if (!isMounted) return;
          setAiSuggestions(getActiveSuggestions(res?.suggestions));
        } else if (mode === "summarize-chat") {
          if (!context.chatId) {
            fail("Chat não identificado para este resumo.");
            return;
          }
          const res = await aiService.summarizeChat({ chatId: context.chatId }, token);
          if (!isMounted) return;
          setAiText(typeof res?.summary === "string" && res.summary.trim() ? res.summary : null);
        } else {
          if (!context.customerId) {
            fail("Nenhum cliente vinculado para análise.");
            return;
          }
          const res = await aiService.analyzeCustomer({ customerId: context.customerId }, token);
          if (!isMounted) return;
          setAiText(typeof res?.analysis === "string" && res.analysis.trim() ? res.analysis : null);
        }

        if (isMounted) setAiStatus("success");
      } catch (error) {
        console.error("Erro ao consultar a IA no modal do atendimento:", error);
        fail(getAiErrorMessage(error));
      }
    };

    void run();
    return () => { isMounted = false; };
  }, [mode, context.chatId, context.customerId, token, aiAnalysisRequested, retryNonce]);

  const modeCopy = MODE_COPY[mode];
  const factChips = useMemo(() => buildFactChips(context), [context]);
  const isAiLoading = aiStatus === "loading";
  const selectedSuggestion = getSelectedSuggestion(aiSuggestions, selectedSuggestionIndex);
  const canInsert = canInsertSuggestion({
    mode,
    isLoading: isAiLoading,
    error: aiError,
    suggestions: aiSuggestions,
  }) && selectedSuggestion !== null;

  const handleRetry = () => {
    setRetryNonce((current) => current + 1);
  };

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

  const handleInsertSuggestion = async () => {
    if (!canInsert || !selectedSuggestion) {
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

  const renderRetryAlert = (severity: "error" | "warning", message: string) => (
    <Alert
      severity={severity}
      action={(
        <Button color="inherit" size="small" startIcon={<RefreshIcon fontSize="small" />} onClick={handleRetry}>
          Tentar novamente
        </Button>
      )}
      sx={{ alignItems: "center" }}
    >
      {message}
    </Alert>
  );

  const renderAiSection = () => {
    if (isAnalysisMode && !context.customerId) {
      return (
        <Alert severity="info">
          Este contato não tem cliente vinculado. Vincule um cliente para analisar o histórico com IA.
        </Alert>
      );
    }

    if (aiStatus === "idle") {
      return (
        <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-800 dark:to-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            A IA lê o cadastro e as compras recentes do cliente e escreve uma análise para apoiar o atendimento.
          </p>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AutoAwesomeIcon fontSize="small" />}
            onClick={() => setAiAnalysisRequested(true)}
            sx={{ flexShrink: 0 }}
          >
            Analisar com IA
          </Button>
        </div>
      );
    }

    if (aiStatus === "loading") {
      return (
        <div
          className="flex min-h-[min(16rem,40vh)] flex-col items-center justify-center gap-4 rounded-2xl bg-slate-50 px-4 text-center dark:bg-slate-800/60"
          aria-live="polite"
        >
          <CircularProgress size={30} />
          <div>
            <p className="text-base font-semibold">{modeCopy.loadingTitle}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Isso pode levar alguns segundos.</p>
          </div>
        </div>
      );
    }

    if (aiStatus === "error") {
      return renderRetryAlert("error", aiError ?? getAiErrorMessage(null));
    }

    if (mode === "suggest-response") {
      if (aiSuggestions.length === 0) {
        return renderRetryAlert("warning", modeCopy.emptyMessage);
      }

      return (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{modeCopy.resultTitle}</p>
          {aiSuggestions.map((suggestion, index) => (
            <button
              key={`${suggestion}-${index}`}
              type="button"
              onClick={() => setSelectedSuggestionIndex(index)}
              aria-pressed={selectedSuggestionIndex === index}
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
                {selectedSuggestionIndex === index ? (
                  <Box className="rounded-full bg-cyan-500/10 px-2 py-1 text-[0.68rem] font-bold text-cyan-700 dark:text-cyan-300">
                    Selecionada
                  </Box>
                ) : null}
              </div>
              <span className="whitespace-pre-wrap">{suggestion}</span>
            </button>
          ))}
        </div>
      );
    }

    if (!aiText) {
      return renderRetryAlert("warning", modeCopy.emptyMessage);
    }

    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-800 dark:to-slate-800/60">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {modeCopy.resultTitle}
        </p>
        <div className="mt-2 text-[0.98rem] text-slate-700 dark:text-slate-200">
          {renderMarkdown(aiText)}
        </div>
      </div>
    );
  };

  return (
    <div className="flex max-h-[calc(100vh-2rem)] w-[min(44rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-2.5 text-white shadow-lg">
            {getModeIcon(mode)}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{modeCopy.title}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{modeCopy.subtitle}</p>
          </div>
        </div>

        <IconButton onClick={closeModal} aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-4">
          {factChips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {factChips.map((chip) => (
                <Chip
                  key={chip.id}
                  size="small"
                  label={chip.label}
                  sx={{
                    height: 24,
                    maxWidth: "100%",
                    borderRadius: "999px",
                    fontWeight: 600,
                    backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgb(30 41 59)" : "rgb(241 245 249)",
                    color: (theme) => theme.palette.mode === "dark" ? "rgb(226 232 240)" : "rgb(51 65 85)",
                    "& .MuiChip-label": { px: 1.2 },
                  }}
                />
              ))}
            </div>
          ) : null}

          {renderAiSection()}

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
                            <div className="bg-rose-500/85" />
                            <div className="bg-amber-400/90" />
                            <div className="bg-emerald-500/85" />
                          </div>
                          {(() => {
                            const markerLeft = Math.min(96, Math.max(4, (purchaseAnalytics.proximityRatio ?? 0) * 96));

                            return (
                              <div
                                className="absolute top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-slate-900 shadow-[0_0_0_2px_rgba(255,255,255,0.95)] dark:bg-white"
                                style={{
                                  left: `${markerLeft}%`,
                                  borderColor: semaphoreAccent.marker,
                                }}
                              />
                            );
                          })()}
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
                              {purchaseAnalytics.situationLabel}
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
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
        {mode === "suggest-response" ? (
          <>
            <Button variant="outlined" color="inherit" onClick={closeModal}>
              Fechar
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleInsertSuggestion()}
              disabled={!canInsert}
            >
              {onApplySuggestion ? "Inserir resposta selecionada" : "Copiar resposta selecionada"}
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={closeModal}>
            Fechar
          </Button>
        )}
      </footer>
    </div>
  );
}