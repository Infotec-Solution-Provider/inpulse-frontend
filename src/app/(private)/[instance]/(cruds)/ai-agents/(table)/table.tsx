"use client";
import { AiAgent } from "@in.pulse-crm/sdk";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
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
import { useMemo, useState } from "react";
import { useAiAgentsContext } from "../ai-agents-context";
import AgentAuditDrawer from "./agent-audit-drawer";
import AgentModal from "../(modal)/agent-modal";

const cardClass = "rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900";
const insetPanelClass = "rounded-md bg-slate-50 p-4 dark:bg-slate-800/40";
const sectionLabelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

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

  return (
    <div className="grid gap-6">
      <section className={`${cardClass} flex flex-col gap-4 p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-md bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <AutoAwesomeIcon />
            </div>
            <div className="space-y-2">
              <p className={sectionLabelClass}>Operacao de IA</p>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Agentes</h1>
              <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">
                Configure agentes receptivos, ativos ou hibridos usando o mesmo vocabulario visual do restante da aplicacao: superficies neutras, hierarquia curta e informacao operacional bem agrupada.
              </p>
            </div>
          </div>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Novo agente
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className={insetPanelClass}>
            <p className={sectionLabelClass}>Base</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{summary.total}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Agentes cadastrados</p>
          </div>
          <div className={insetPanelClass}>
            <p className={sectionLabelClass}>Status</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{summary.active}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Agentes ativos</p>
          </div>
          <div className={insetPanelClass}>
            <p className={sectionLabelClass}>Cobertura</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{summary.receptive}/{summary.proactive}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Receptivos e ativos</p>
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <p className={sectionLabelClass}>Cadastro principal</p>
          <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Tabela de agentes</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Revise modelo, gatilhos, escopo de atuacao e acoes permitidas antes de editar ou auditar.
            </p>
          </div>
        </div>

        <TableContainer
          className="scrollbar-whatsapp overflow-auto px-4 py-4"
          sx={{ height: "calc(100vh - 280px)", minHeight: "420px", maxHeight: "72vh" }}
        >
          <Table stickyHeader sx={{ minWidth: 1080 }}>
          <TableHead>
            <TableRow
              sx={{
                "& .MuiTableCell-root": {
                  backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgb(30 41 59)" : "rgb(226 232 240)",
                  borderBottom: "2px solid",
                  borderColor: (theme) => theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(203 213 225)",
                  color: (theme) => theme.palette.mode === "dark" ? "rgb(226 232 240)" : "rgb(30 41 59)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                },
              }}
            >
              <TableCell>Nome</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Atuacao</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Gatilhos</TableCell>
              <TableCell>Acoes permitidas</TableCell>
              <TableCell>Turnos max.</TableCell>
              <TableCell align="right">Acoes</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && (
              <TableRow sx={{ height: "300px", "& td": { borderBottom: "none" } }}>
                <TableCell colSpan={8} sx={{ textAlign: "center" }}>
                  <CircularProgress size={36} />
                </TableCell>
              </TableRow>
            )}

            {!loading && agents.length === 0 && (
              <TableRow sx={{ height: "300px", "& td": { borderBottom: "none" } }}>
                <TableCell colSpan={8} sx={{ textAlign: "center" }}>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
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
                  <TableRow
                    key={agent.id}
                    hover
                    sx={{
                      "& .MuiTableCell-root": {
                        borderBottomColor: (theme) => theme.palette.mode === "dark" ? "rgb(30 41 59)" : "rgb(241 245 249)",
                        color: (theme) => theme.palette.mode === "dark" ? "rgb(226 232 240)" : "rgb(51 65 85)",
                        verticalAlign: "top",
                        py: 2,
                      },
                    }}
                  >
                    <TableCell>
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{agent.name}</span>
                        {agent.description && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{agent.description}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={agent.enabled ? "Ativo" : "Inativo"}
                        size="small"
                        variant="outlined"
                        sx={statusChipSx(agent.enabled)}
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1">
                          <Chip
                            label="Receptivo"
                            size="small"
                            variant="outlined"
                            sx={receptiveEnabled ? statusChipSx(true) : subtleChipSx}
                          />
                          <Chip
                            label="Ativo"
                            size="small"
                            variant="outlined"
                            sx={proactiveEnabled ? statusChipSx(true) : subtleChipSx}
                          />
                          {hybridEnabled && <Chip label="Hibrido" size="small" variant="outlined" sx={subtleChipSx} />}
                        </div>

                        {proactiveSummary && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{proactiveSummary}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="rounded-md bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">{agent.model}</span>
                    </TableCell>

                    <TableCell>
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
                          <span className="text-xs text-slate-400 dark:text-slate-500">Modo receptivo desligado</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agent.allowedActions.map((a) => (
                          <Chip key={a} label={ACTION_LABELS[a] ?? a} size="small" variant="outlined" sx={subtleChipSx} />
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{agent.maxTurnsPerChat}</span>
                    </TableCell>

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
      </section>

      {modalOpen && (
        <AgentModal agent={editingAgent} onClose={() => setModalOpen(false)} />
      )}

      {auditAgent && <AgentAuditDrawer agent={auditAgent} onClose={() => setAuditAgent(null)} />}
    </div>
  );
}
