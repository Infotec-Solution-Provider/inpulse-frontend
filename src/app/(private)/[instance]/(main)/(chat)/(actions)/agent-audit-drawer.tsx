"use client";
import aiService from "@/lib/services/ai.service";
import { useAuthContext } from "@/app/auth-context";
import type { AiAgentActionLog } from "@in.pulse-crm/sdk";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

const ACTION_LABELS: Record<string, string> = {
  REPLY: "Respondeu",
  SEND_TEMPLATE: "Template",
  SEND_FILE: "Arquivo",
  ESCALATE: "Escalou",
  CLOSE_CHAT: "Fechou",
  UPDATE_CRM: "CRM",
  SCHEDULE: "Agendou",
  IGNORED: "Ignorou",
};

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
      toast.error(`Erro ao carregar logs: ${sanitizeErrorMessage(err)}`);
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
          Logs do Agente de IA
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
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Chip
                    label={ACTION_LABELS[log.actionType] ?? log.actionType}
                    size="small"
                    color={log.success ? "success" : "error"}
                    variant="outlined"
                  />
                  <span className="text-xs text-gray-400">
                    {new Date(log.createdAt).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                {log.errorMessage && (
                  <p className="text-xs text-red-500 mt-1">{log.errorMessage}</p>
                )}
                {log.payload && typeof log.payload === "object" && "replyText" in log.payload && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-3">
                    {String(log.payload["replyText"])}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
