"use client";
import { CrmPage, CrmFilters, CrmTableHead, useCrmQueryState } from "@/lib/ui-system";

import { AiAgent } from "@/lib/sdk-local";
import { AGENT_PRIORITY_HINT, findOverlappingAlwaysAgents } from "@/lib/utils/ai-agent-labels";
import { Add as AddIcon } from "@/lib/ui-system/crm-icons";
import { AutoAwesome as AutoAwesomeIcon } from "@/lib/ui-system/crm-icons";
import { Delete as DeleteIcon } from "@/lib/ui-system/crm-icons";
import { Edit as EditIcon } from "@/lib/ui-system/crm-icons";
import { ManageSearch as ManageSearchIcon } from "@/lib/ui-system/crm-icons";
import {
  Alert,
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
import { useMemo, useState } from "react";
import { useAiAgentsContext } from "../ai-agents-context";
import AgentAuditDrawer from "./agent-audit-drawer";
import AgentModal from "../(modal)/agent-modal";

const cardClass =
  "rounded-md border border-[var(--ip-border)] bg-[var(--ip-surface)] shadow-none border-[var(--ip-border)] bg-[var(--ip-surface)]";
const insetPanelClass = "rounded-md bg-[var(--ip-surface)] p-4 bg-[var(--ip-surface)]";
const sectionLabelClass =
  "text-xs font-semibold uppercase tracking-wide text-[var(--ip-muted)] text-[var(--ip-muted)]";

const subtleChipSx = {
  backgroundColor: (theme: { palette: { mode: string } }) =>
    theme.palette.mode === "dark" ? "rgb(15 23 42)" : "rgb(255 255 255)",
  borderColor: (theme: { palette: { mode: string } }) =>
    theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
  color: (theme: { palette: { mode: string } }) =>
    theme.palette.mode === "dark" ? "rgb(226 232 240)" : "rgb(51 65 85)",
};

function statusChipSx(enabled: boolean) {
  if (enabled) {
    return {
      ...subtleChipSx,
      backgroundColor: (theme: { palette: { mode: string } }) =>
        theme.palette.mode === "dark" ? "rgba(22, 101, 52, 0.35)" : "rgb(240 253 244)",
      borderColor: (theme: { palette: { mode: string } }) =>
        theme.palette.mode === "dark" ? "rgba(34, 197, 94, 0.4)" : "rgb(187 247 208)",
      color: (theme: { palette: { mode: string } }) =>
        theme.palette.mode === "dark" ? "rgb(187 247 208)" : "rgb(22 101 52)",
    };
  }

  return subtleChipSx;
}

const ACTION_LABELS: Record<string, string> = {
  REPLY: "Responder",
  SEND_TEMPLATE: "Enviar template",
  SEND_FILE: "Enviar arquivo",
  ESCALATE: "Transferir para humano",
  CLOSE_CHAT: "Encerrar conversa",
  UPDATE_CRM: "Atualizar CRM",
  SCHEDULE: "Agendar",
  IGNORED: "Ignorar mensagem",
};

const TRIGGER_LABELS: Record<string, string> = {
  MESSAGE_DURING_HOURS: "Mensagem por horário",
  RESPONSE_TIMEOUT: "Tempo sem resposta (em breve)",
  KEYWORD: "Palavra-chave",
  ALWAYS: "Sempre",
};

const PROACTIVE_FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Diário",
  WEEKDAYS: "Dias úteis",
  CUSTOM_DAYS: "Dias customizados",
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
    PROACTIVE_FREQUENCY_LABELS[agent.proactiveConfig.schedule.frequency] ??
    agent.proactiveConfig.schedule.frequency;

  return `${frequency} · ${agent.proactiveConfig.schedule.startTime} · ${agent.proactiveConfig.batchSize} contatos`;
}

export default function AiAgentsTable() {
  const { agents, loading, deleteAgent, loadAgents } = useAiAgentsContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AiAgent | undefined>(undefined);
  const [auditAgent, setAuditAgent] = useState<AiAgent | null>(null);

  const overlappingAlwaysAgents = useMemo(() => findOverlappingAlwaysAgents(agents), [agents]);

  const summary = useMemo(() => {
    const active = agents.filter((agent) => agent.enabled).length;
    const receptive = agents.filter((agent) => agent.triggers.length > 0).length;
    const proactive = agents.filter((agent) => Boolean(agent.proactiveConfig?.enabled)).length;

    return {
      total: agents.length,
      active,
      receptive,
      proactive,
    };
  }, [agents]);

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

  const [filters, setFilters] = useCrmQueryState<Record<string, string>>("ai-agents-list", {});
  const filtered = agents.filter(
    (agent) =>
      (!filters.name ||
        agent.name.toLocaleLowerCase().includes(filters.name.toLocaleLowerCase())) &&
      (!filters.enabled || String(agent.enabled) === filters.enabled),
  );
  return (
    <CrmPage
      title="Agentes"
      description="Gerencie modelos, gatilhos, público e ações permitidas."
      count={loading ? undefined : filtered.length}
      breadcrumbs={[{ label: "IA" }, { label: "Agentes" }]}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Novo agente
        </Button>
      }
    >
      <CrmFilters
        fields={[
          { key: "name", label: "Nome" },
          {
            key: "enabled",
            label: "Status",
            options: [
              { value: "true", label: "Ativo" },
              { value: "false", label: "Inativo" },
            ],
          },
        ]}
        values={filters}
        onApply={setFilters}
        onRefresh={() => void loadAgents()}
        loading={loading}
      />
      {overlappingAlwaysAgents.length > 1 && (
        <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
          <span className="font-semibold">
            Há {overlappingAlwaysAgents.length} agentes ativos com o gatilho “Sempre”
            {` (${overlappingAlwaysAgents.map((agent) => agent.name).join(", ")}).`}
          </span>{" "}
          {AGENT_PRIORITY_HINT}
        </Alert>
      )}

      <section className="ip-crud-table">
        <TableContainer className="scrollbar-whatsapp overflow-auto">
          <Table stickyHeader sx={{ minWidth: 1080 }}>
            <CrmTableHead
              labels={[
                "Nome",
                "Status",
                "Atuação",
                "Modelo",
                "Gatilhos",
                "Ações permitidas",
                "Turnos máx.",
                "Ações",
              ]}
            />

            <TableBody>
              {loading && (
                <TableRow sx={{ height: "300px", "& td": { borderBottom: "none" } }}>
                  <TableCell colSpan={8} sx={{ textAlign: "center" }}>
                    <CircularProgress size={36} />
                  </TableCell>
                </TableRow>
              )}

              {!loading && filtered.length === 0 && (
                <TableRow sx={{ height: "300px", "& td": { borderBottom: "none" } }}>
                  <TableCell colSpan={8} sx={{ textAlign: "center" }}>
                    <span className="text-sm text-[var(--ip-muted)]">
                      Nenhum agente cadastrado.
                    </span>
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                filtered.map((agent) => {
                  const { receptiveEnabled, proactiveEnabled, hybridEnabled } = getModeFlags(agent);
                  const proactiveSummary = getProactiveSummary(agent);

                  return (
                    <TableRow
                      key={agent.id}
                      hover
                      sx={{
                        "& .MuiTableCell-root": {
                          borderBottomColor: (theme) =>
                            theme.palette.mode === "dark" ? "rgb(30 41 59)" : "rgb(241 245 249)",
                          color: (theme) =>
                            theme.palette.mode === "dark" ? "rgb(226 232 240)" : "rgb(51 65 85)",
                          verticalAlign: "top",
                          py: 2,
                        },
                      }}
                    >
                      <TableCell data-label="Nome">
                        <div>
                          <span className="font-medium text-[var(--ip-text)]">{agent.name}</span>
                          {agent.description && (
                            <p className="mt-1 text-xs text-[var(--ip-muted)]">
                              {agent.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell data-label="Status">
                        <Chip
                          label={agent.enabled ? "Ativo" : "Inativo"}
                          size="small"
                          variant="outlined"
                          sx={statusChipSx(agent.enabled)}
                        />
                      </TableCell>

                      <TableCell data-label="Atuação">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap gap-1">
                            <Chip
                              label="Receptivo"
                              size="small"
                              variant="outlined"
                              sx={receptiveEnabled ? statusChipSx(true) : subtleChipSx}
                            />
                            <Chip
                              label="Prospecção ativa"
                              size="small"
                              variant="outlined"
                              sx={proactiveEnabled ? statusChipSx(true) : subtleChipSx}
                            />
                            {hybridEnabled && (
                              <Chip
                                label="Híbrido"
                                size="small"
                                variant="outlined"
                                sx={subtleChipSx}
                              />
                            )}
                          </div>

                          {proactiveSummary && (
                            <p className="text-xs text-[var(--ip-muted)]">{proactiveSummary}</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell data-label="Modelo">
                        <span className="rounded-md bg-[var(--ip-surface)] px-2 py-1 font-mono text-xs text-[var(--ip-text)]">
                          {agent.model}
                        </span>
                      </TableCell>

                      <TableCell data-label="Gatilhos">
                        <div className="flex flex-wrap gap-1">
                          {agent.triggers.map((t) => (
                            <Chip
                              key={t.id}
                              label={TRIGGER_LABELS[t.type] ?? t.type}
                              size="small"
                              variant="outlined"
                              sx={subtleChipSx}
                            />
                          ))}
                          {agent.triggers.length === 0 && (
                            <span className="text-xs text-[var(--ip-muted)]">
                              Modo receptivo desligado
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell data-label="Ações permitidas">
                        <div className="flex flex-wrap gap-1">
                          {agent.allowedActions.map((a) => (
                            <Chip
                              key={a}
                              label={ACTION_LABELS[a] ?? a}
                              size="small"
                              variant="outlined"
                              sx={subtleChipSx}
                            />
                          ))}
                        </div>
                      </TableCell>

                      <TableCell data-label="Turnos máx.">
                        <span className="font-medium text-[var(--ip-text)]">
                          {agent.maxTurnsPerChat}
                        </span>
                      </TableCell>

                      <TableCell data-label="Ações" align="right">
                        <Tooltip title="Auditar">
                          <IconButton
                            aria-label="Auditar agente"
                            size="small"
                            onClick={() => setAuditAgent(agent)}
                          >
                            <ManageSearchIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            aria-label="Editar agente"
                            size="small"
                            onClick={() => openEdit(agent)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remover">
                          <Button
                            aria-label="Excluir agente"
                            size="small"
                            color="error"
                            onClick={() => handleDelete(agent)}
                          >
                            Excluir
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

      {modalOpen && <AgentModal agent={editingAgent} onClose={() => setModalOpen(false)} />}

      {auditAgent && <AgentAuditDrawer agent={auditAgent} onClose={() => setAuditAgent(null)} />}
    </CrmPage>
  );
}
