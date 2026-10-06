"use client";
import aiService from "@/lib/services/ai.service";
import { useAuthContext } from "@/app/auth-context";
import type { AiAgentActionLog } from "@/lib/sdk-local";
import {
  formatAiDateTime,
  getExecutionModeLabel,
  getLogActionLabel,
  isNeutralAction,
  isProactiveLog,
  summarizeAgentError,
} from "@/lib/utils/ai-agent-labels";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

function getLogChipColor(log: AiAgentActionLog): "default" | "success" | "error" {
  if (isNeutralAction(log)) return "default";
  return log.success ? "success" : "error";
}

interface Props {
  chatId: number;
  onClose: () => void;
}

export default function AgentAuditDrawer({ chatId, onClose }: Props) {
  const { token } = useAuthContext();
  const [logs, setLogs] = useState<AiAgentActionLog[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await aiService.listAgentActionLogs({ chatId, perPage: 50 }, token);
      setLogs(result.data);
    } catch (err) {
      toast.error(`Erro ao carregar os logs do agente: ${sanitizeErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, [chatId, token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Drawer anchor="right" open onClose={onClose} PaperProps={{ sx: { width: 360 } }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <Typography variant="subtitle1" fontWeight="bold">
          Logs do agente de IA
        </Typography>
        <div className="flex items-center gap-1">
          <Tooltip title="Atualizar">
            <IconButton size="small" onClick={load} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <div className="flex justify-center py-8">
            <CircularProgress size={32} />
          </div>
        )}

        {!loading && logs.length === 0 && (
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">
            Nenhum log de agente para esta conversa.
          </p>
        )}

        {!loading && logs.length > 0 && (
          <ul className="flex flex-col gap-3">
            {logs.map((log) => {
              const agentName = log.agent?.name?.trim();
              const replyText =
                log.payload && typeof log.payload === "object" && typeof log.payload["replyText"] === "string"
                  ? log.payload["replyText"].trim()
                  : "";
              const error = log.errorMessage ? summarizeAgentError(log.errorMessage) : null;

              return (
                <li
                  key={log.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1">
                      <Chip
                        label={getLogActionLabel(log)}
                        size="small"
                        color={getLogChipColor(log)}
                        variant="outlined"
                        sx={{ maxWidth: "100%" }}
                      />
                      {isProactiveLog(log) && (
                        <Chip label={getExecutionModeLabel(log)} size="small" color="secondary" variant="outlined" />
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{formatAiDateTime(log.createdAt)}</span>
                  </div>
                  {agentName && (
                    <p className="mt-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                      Agente: {agentName}
                    </p>
                  )}
                  {error && (
                    <div className="mt-1">
                      <p className="text-xs text-red-500">{error.summary}</p>
                      {error.detail && (
                        <details className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <summary className="cursor-pointer select-none">Detalhes técnicos</summary>
                          <p className="mt-1 whitespace-pre-wrap break-words">{error.detail}</p>
                        </details>
                      )}
                    </div>
                  )}
                  {replyText && (
                    <p className="mt-1 line-clamp-3 text-xs text-gray-600 dark:text-gray-300">{replyText}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
