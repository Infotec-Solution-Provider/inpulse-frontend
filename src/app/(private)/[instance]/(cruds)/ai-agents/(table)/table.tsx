"use client";
import { AiAgent } from "@in.pulse-crm/sdk";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import {
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import { useState } from "react";
import { useAiAgentsContext } from "../ai-agents-context";
import AgentAuditDrawer from "./agent-audit-drawer";
import AgentModal from "../(modal)/agent-modal";

const ACTION_LABELS: Record<string, string> = {
  REPLY: "Responder",
  SEND_TEMPLATE: "Template",
  SEND_FILE: "Arquivo",
  ESCALATE: "Escalar",
  CLOSE_CHAT: "Fechar",
  UPDATE_CRM: "CRM",
  SCHEDULE: "Agendar",
  IGNORED: "Ignorar",
};

const TRIGGER_LABELS: Record<string, string> = {
  MESSAGE_DURING_HOURS: "Mensagem por horario",
  RESPONSE_TIMEOUT: "Timeout",
  KEYWORD: "Palavra-chave",
  ALWAYS: "Sempre",
};

const PROACTIVE_FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Diário",
  WEEKDAYS: "Dias úteis",
  CUSTOM_DAYS: "Dias custom.",
};

function getModeFlags(agent: AiAgent) {
  const receptiveEnabled = agent.triggers.length > 0;
  const proactiveEnabled = Boolean(agent.proactiveConfig?.enabled);

  return {
    receptiveEnabled,
    proactiveEnabled,
    hybridEnabled: receptiveEnabled && proactiveEnabled,
  };
}

function getProactiveSummary(agent: AiAgent) {
  if (!agent.proactiveConfig?.enabled) {
    return null;
  }

  const frequency =
    PROACTIVE_FREQUENCY_LABELS[agent.proactiveConfig.schedule.frequency] ?? agent.proactiveConfig.schedule.frequency;

  return `${frequency} · ${agent.proactiveConfig.schedule.startTime} · ${agent.proactiveConfig.batchSize} contatos`;
}

export default function AiAgentsTable() {
  const { agents, loading, deleteAgent } = useAiAgentsContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AiAgent | undefined>(undefined);
  const [auditAgent, setAuditAgent] = useState<AiAgent | null>(null);

  function openCreate() {
    setEditingAgent(undefined);
    setModalOpen(true);
  }

  function openEdit(agent: AiAgent) {
    setEditingAgent(agent);
    setModalOpen(true);
  }

  async function handleDelete(agent: AiAgent) {
    if (!confirm(`Remover agente "${agent.name}"?`)) return;
    await deleteAgent(agent.id);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Agentes de IA</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure agentes receptivos, ativos ou híbridos no mesmo cadastro.
          </p>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Novo agente
        </Button>
      </div>

      {/* Table */}
      <TableContainer
        className="scrollbar-whatsapp mx-auto overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
        sx={{ height: "calc(100vh - 220px)", minHeight: "400px", maxHeight: "70vh" }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Atuação</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Gatilhos</TableCell>
              <TableCell>Ações permitidas</TableCell>
              <TableCell>Turnos máx.</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && (
              <TableRow sx={{ height: "300px" }}>
                <TableCell colSpan={8} sx={{ textAlign: "center" }}>
                  <CircularProgress size={36} />
                </TableCell>
              </TableRow>
            )}

            {!loading && agents.length === 0 && (
              <TableRow sx={{ height: "300px" }}>
                <TableCell colSpan={8} sx={{ textAlign: "center" }}>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhum agente cadastrado.
                  </span>
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              agents.map((agent) => {
                const { receptiveEnabled, proactiveEnabled, hybridEnabled } = getModeFlags(agent);
                const proactiveSummary = getProactiveSummary(agent);

                return (
                  <TableRow key={agent.id} hover>
                    <TableCell>
                      <div>
                        <span className="font-medium">{agent.name}</span>
                        {agent.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{agent.description}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={agent.enabled ? "Ativo" : "Inativo"}
                        color={agent.enabled ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1">
                          <Chip
                            label="Receptivo"
                            size="small"
                            color={receptiveEnabled ? "primary" : "default"}
                            variant={receptiveEnabled ? "filled" : "outlined"}
                          />
                          <Chip
                            label="Ativo"
                            size="small"
                            color={proactiveEnabled ? "secondary" : "default"}
                            variant={proactiveEnabled ? "filled" : "outlined"}
                          />
                          {hybridEnabled && <Chip label="Híbrido" size="small" variant="outlined" />}
                        </div>

                        {proactiveSummary && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{proactiveSummary}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs">{agent.model}</span>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agent.triggers.map((t) => (
                          <Chip
                            key={t.id}
                            label={TRIGGER_LABELS[t.type] ?? t.type}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {agent.triggers.length === 0 && (
                          <span className="text-xs text-gray-400">Modo receptivo desligado</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agent.allowedActions.map((a) => (
                          <Chip key={a} label={ACTION_LABELS[a] ?? a} size="small" />
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>{agent.maxTurnsPerChat}</TableCell>

                    <TableCell align="right">
                      <Tooltip title="Auditar">
                        <IconButton size="small" onClick={() => setAuditAgent(agent)}>
                          <ManageSearchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(agent)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remover">
                        <IconButton size="small" color="error" onClick={() => handleDelete(agent)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      {modalOpen && (
        <AgentModal agent={editingAgent} onClose={() => setModalOpen(false)} />
      )}

      {auditAgent && <AgentAuditDrawer agent={auditAgent} onClose={() => setAuditAgent(null)} />}
    </div>
  );
}
