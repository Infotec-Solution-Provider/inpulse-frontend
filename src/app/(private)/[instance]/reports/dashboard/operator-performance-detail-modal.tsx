"use client";

import { useEffect, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import axios from "axios";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { useAuthContext } from "@/app/auth-context";
import { WPP_BASE_URL } from "@/app/(private)/[instance]/whatsapp-context";
import type { DashboardFilters, OperatorPerformanceRow } from "./dashboard-context";

type DetailTab = "firstResponses" | "pendingReturns";

interface OperatorFirstResponseDetailItem {
  chatId: number;
  contactId: number | null;
  contactName: string | null;
  contactPhone: string | null;
  firstCustomerMessageAt: string | null;
  firstCustomerMessageBody: string | null;
  firstResponseAt: string | null;
  firstResponseBody: string | null;
  firstResponseSeconds: number;
}

interface OperatorPendingReturnDetailItem {
  chatId: number;
  contactId: number | null;
  contactName: string | null;
  contactPhone: string | null;
  startedAt: string | null;
  lastCustomerMessageAt: string | null;
  lastCustomerMessageBody: string | null;
  waitingSeconds: number;
}

interface OperatorPerformanceDetailsResult {
  operatorId: number;
  firstResponses: OperatorFirstResponseDetailItem[];
  pendingReturns: OperatorPendingReturnDetailItem[];
}

interface OperatorPerformanceDetailModalProps {
  open: boolean;
  operator: OperatorPerformanceRow | null;
  filters: DashboardFilters;
  onClose: () => void;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return "-";

  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
  }

  return `${remainingSeconds}s`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

function MessagePreview({ text }: { text: string | null | undefined }) {
  if (!text?.trim()) {
    return <span className="text-slate-400">-</span>;
  }

  return <span className="line-clamp-3 whitespace-pre-wrap text-slate-700 dark:text-slate-200">{text}</span>;
}

function EmptyState({ message }: { message: string }) {
  return <Alert severity="info">{message}</Alert>;
}

export default function OperatorPerformanceDetailModal({
  open,
  operator,
  filters,
  onClose,
}: OperatorPerformanceDetailModalProps) {
  const { token } = useAuthContext();
  const [activeTab, setActiveTab] = useState<DetailTab>("firstResponses");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<OperatorPerformanceDetailsResult | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveTab("firstResponses");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !operator || !token) {
      return;
    }

    let cancelled = false;

    const loadDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<{ data: OperatorPerformanceDetailsResult }>(
          `${WPP_BASE_URL}/api/whatsapp/dashboard/operator-performance/${operator.userId}/details`,
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
            params: {
              startDate: filters.startDate || undefined,
              endDate: filters.endDate || undefined,
              SETORES: filters.sectors || "*",
            },
          },
        );

        if (!cancelled) {
          setDetails(response.data.data);
        }
      } catch (err) {
        if (!cancelled) {
          setDetails(null);
          setError(sanitizeErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [filters.endDate, filters.sectors, filters.startDate, open, operator, token]);

  const firstResponses = details?.firstResponses ?? [];
  const pendingReturns = details?.pendingReturns ?? [];

  const modalSubtitle = useMemo(() => {
    if (!filters.startDate && !filters.endDate) {
      return "Período amplo";
    }

    return `${filters.startDate || "..."} até ${filters.endDate || "..."}`;
  }, [filters.endDate, filters.startDate]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pr: 6 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Typography variant="h6" fontWeight={700}>
              Detalhes do operador
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {operator?.userName || "-"} • {modalSubtitle}
            </Typography>
          </div>
          <IconButton onClick={onClose} sx={{ position: "absolute", right: 16, top: 12 }}>
            <CloseIcon />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <div className="space-y-4 p-4">
          {operator ? (
            <div className="flex flex-wrap gap-2">
              <Chip label={`Finalizados: ${operator.chatsFinishedCount}`} variant="outlined" />
              <Chip label={`Pendências: ${operator.pendingReturnsCount}`} variant="outlined" />
              <Chip label={`1ª devolutiva: ${formatDuration(operator.averageFirstResponseSeconds)}`} variant="outlined" />
              <Chip label={`Ciclo: ${formatDuration(operator.averageHandlingSeconds)}`} variant="outlined" />
            </div>
          ) : null}

          <Alert severity="info">
            Follow-ups triviais de cortesia, enviados até 1 hora após um fechamento anterior, já ficam fora deste detalhamento.
          </Alert>

          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value as DetailTab)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab value="firstResponses" label={`1ª devolutiva (${firstResponses.length})`} />
            <Tab value="pendingReturns" label={`Pendências (${pendingReturns.length})`} />
          </Tabs>

          {loading ? (
            <Box className="flex min-h-[260px] items-center justify-center">
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">Falha ao carregar detalhes: {error}</Alert>
          ) : activeTab === "firstResponses" ? (
            firstResponses.length ? (
              <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[980px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                    <tr className="text-slate-500">
                      <th className="px-3 py-3">Chat</th>
                      <th className="px-3 py-3">Contato</th>
                      <th className="px-3 py-3">1ª msg cliente</th>
                      <th className="px-3 py-3">1ª resposta</th>
                      <th className="px-3 py-3">Tempo</th>
                      <th className="px-3 py-3">Mensagem cliente</th>
                      <th className="px-3 py-3">Resposta operação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {firstResponses.map((item) => (
                      <tr key={`${item.chatId}-${item.firstResponseAt || "-"}`} className="border-t border-slate-100 align-top dark:border-slate-800">
                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">#{item.chatId}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{item.contactName || "Sem nome"}</div>
                          <div className="text-[11px] text-slate-500">{item.contactPhone || "-"}</div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatDateTime(item.firstCustomerMessageAt)}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatDateTime(item.firstResponseAt)}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{formatDuration(item.firstResponseSeconds)}</td>
                        <td className="px-3 py-2.5"><MessagePreview text={item.firstCustomerMessageBody} /></td>
                        <td className="px-3 py-2.5"><MessagePreview text={item.firstResponseBody} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="Nenhuma 1ª devolutiva detalhável encontrada para este operador no período selecionado." />
            )
          ) : pendingReturns.length ? (
            <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                  <tr className="text-slate-500">
                    <th className="px-3 py-3">Chat</th>
                    <th className="px-3 py-3">Contato</th>
                    <th className="px-3 py-3">Abertura</th>
                    <th className="px-3 py-3">Última msg cliente</th>
                    <th className="px-3 py-3">Espera atual</th>
                    <th className="px-3 py-3">Mensagem cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReturns.map((item) => (
                    <tr key={`${item.chatId}-${item.lastCustomerMessageAt || "-"}`} className="border-t border-slate-100 align-top dark:border-slate-800">
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">#{item.chatId}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{item.contactName || "Sem nome"}</div>
                        <div className="text-[11px] text-slate-500">{item.contactPhone || "-"}</div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatDateTime(item.startedAt)}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatDateTime(item.lastCustomerMessageAt)}</td>
                      <td className="px-3 py-2.5 font-semibold text-amber-600 dark:text-amber-400">{formatDuration(item.waitingSeconds)}</td>
                      <td className="px-3 py-2.5"><MessagePreview text={item.lastCustomerMessageBody} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="Nenhuma pendência encontrada para este operador no período selecionado." />
          )}

          <Divider />

          <Typography variant="caption" color="text.secondary">
            A aba de 1ª devolutiva é ordenada pelos maiores tempos primeiro. A aba de pendências é ordenada pelas mensagens do cliente mais recentes.
          </Typography>
        </div>
      </DialogContent>
    </Dialog>
  );
}