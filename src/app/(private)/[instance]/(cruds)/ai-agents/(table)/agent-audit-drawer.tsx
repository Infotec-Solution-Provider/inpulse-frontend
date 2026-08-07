"use client";

import { useAuthContext } from "@/app/auth-context";
import aiService from "@/lib/services/ai.service";
import type { AiAgent, AiAgentActionLog, AiAgentChatSession } from "@/lib/types/sdk-local.types";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function getExecutionMode(log: AiAgentActionLog) {
  if (log.payload && typeof log.payload === "object" && "proactiveRunId" in log.payload) {
    return "Ativo";
  }

  return "Receptivo";
}

function getPayloadSummary(log: AiAgentActionLog) {
  if (!log.payload || typeof log.payload !== "object") {
    return null;
  }

  if ("replyText" in log.payload && typeof log.payload["replyText"] === "string") {
    return String(log.payload["replyText"]);
  }

  if ("templateName" in log.payload && typeof log.payload["templateName"] === "string") {
    return `Template: ${String(log.payload["templateName"])}`;
  }

  if ("action" in log.payload && typeof log.payload["action"] === "string") {
    return `Decisão: ${String(log.payload["action"])}`;
  }

  return null;
}

interface Props {
  agent: AiAgent;
  onClose: () => void;
}

export default function AgentAuditDrawer({ agent, onClose }: Props) {
  const theme = useTheme();
  const { token } = useAuthContext();
  const [logs, setLogs] = useState<AiAgentActionLog[]>([]);
  const [sessions, setSessions] = useState<AiAgentChatSession[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);

    try {
      const [logsResult, sessionsResult] = await Promise.all([
        aiService.listAgentActionLogs({ agentId: agent.id, perPage: 30 }, token),
        aiService.listActiveSessions(token),
      ]);

      setLogs(logsResult.data);
      setSessions(sessionsResult.filter((session) => session.agentId === agent.id));
    } catch (error) {
      toast.error(`Falha ao carregar auditoria do agente: ${sanitizeErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [agent.id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const successCount = logs.filter((log) => log.success).length;
    const failureCount = logs.length - successCount;
    const proactiveCount = logs.filter((log) => getExecutionMode(log) === "Ativo").length;

    return { successCount, failureCount, proactiveCount };
  }, [logs]);

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 420 },
          backgroundImage:
            theme.palette.mode === "dark"
              ? `linear-gradient(180deg, ${alpha(theme.palette.secondary.dark, 0.18)} 0%, ${theme.palette.background.paper} 18%)`
              : `linear-gradient(180deg, ${alpha(theme.palette.secondary.light, 0.22)} 0%, ${theme.palette.background.paper} 18%)`,
        },
      }}
    >
      <Box sx={{ px: 3, py: 2.5, borderBottom: "1px solid", borderColor: alpha(theme.palette.divider, 0.8) }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Auditoria do agente
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {agent.name}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Atualizar">
              <IconButton size="small" onClick={load} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 3 }}>
        <Stack spacing={3}>
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            }}
          >
            {[
              { label: "Sessões ativas", value: sessions.length },
              { label: "Sucessos", value: summary.successCount },
              { label: "Falhas", value: summary.failureCount },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: alpha(theme.palette.secondary.main, 0.18),
                  bgcolor: alpha(theme.palette.secondary.main, 0.06),
                  px: 1.5,
                  py: 1.25,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 22 }}>{item.value}</Typography>
              </Box>
            ))}
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
              Sessões em andamento
            </Typography>

            {loading && sessions.length === 0 ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : sessions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhuma sessão ativa para este agente agora.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {sessions.map((session) => (
                  <Box
                    key={session.id}
                    sx={{
                      borderRadius: 2.5,
                      border: "1px solid",
                      borderColor: alpha(theme.palette.primary.main, 0.14),
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      px: 1.5,
                      py: 1.25,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>Chat #{session.chatId}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Turnos: {session.turnCount}
                        </Typography>
                      </Box>
                      <Chip size="small" label={session.status} color="primary" variant="outlined" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      Iniciada em {new Date(session.startedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </Typography>
                    {session.lastRepliedAt && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Última resposta em {new Date(session.lastRepliedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          <Divider />

          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Últimas ações
              </Typography>
              <Chip size="small" label={`${summary.proactiveCount} ativas`} variant="outlined" />
            </Stack>

            {loading && logs.length === 0 ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : logs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhum log de auditoria encontrado para este agente.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {logs.map((log) => {
                  const payloadSummary = getPayloadSummary(log);
                  const executionMode = getExecutionMode(log);

                  return (
                    <Box
                      key={log.id}
                      sx={{
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: alpha(
                          log.success ? theme.palette.success.main : theme.palette.error.main,
                          0.22,
                        ),
                        bgcolor: alpha(
                          log.success ? theme.palette.success.main : theme.palette.error.main,
                          0.06,
                        ),
                        px: 1.5,
                        py: 1.25,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                        <Box>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            <Chip
                              size="small"
                              label={ACTION_LABELS[log.actionType] ?? log.actionType}
                              color={log.success ? "success" : "error"}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={executionMode}
                              color={executionMode === "Ativo" ? "secondary" : "primary"}
                              variant="outlined"
                            />
                            <Chip size="small" label={`Chat #${log.chatId}`} variant="outlined" />
                          </Stack>
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.createdAt).toLocaleString([], {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </Typography>
                      </Stack>

                      {payloadSummary && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, whiteSpace: "pre-wrap" }}>
                          {payloadSummary}
                        </Typography>
                      )}

                      {log.errorMessage && (
                        <Typography variant="body2" sx={{ mt: 1.25, color: "error.main" }}>
                          {log.errorMessage}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>
    </Drawer>
  );
}