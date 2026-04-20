"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AddIcon from "@mui/icons-material/Add";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import PanToolAltIcon from "@mui/icons-material/PanToolAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { toast } from "react-toastify";
import { AuthContext } from "@/app/auth-context";
import funnelApiService from "@/lib/services/funnel.service";
import type { FunnelDef, FunnelType } from "@/lib/types/funnel.types";

export default function FunnelListPage() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const params = useParams<{ instance: string }>();

  const [funnels, setFunnels] = useState<FunnelDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FunnelType>("AUTOMATIC");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await funnelApiService.listFunnels(token);
      setFunnels(data);
    } catch {
      toast.error("Não foi possível carregar os pipelines.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!token || !newName.trim()) return;
    setCreating(true);
    try {
      const created = await funnelApiService.createFunnel(token, newName.trim(), newType);
      setFunnels((prev) => [...prev, created]);
      setCreateOpen(false);
      setNewName("");
      setNewType("AUTOMATIC");
      toast.success(`Pipeline "${created.name}" criado.`);
    } catch {
      toast.error("Erro ao criar pipeline.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (funnel: FunnelDef) => {
    if (!token) return;
    setDeletingId(funnel.id);
    try {
      await funnelApiService.deleteFunnel(token, funnel.id);
      setFunnels((prev) => prev.filter((f) => f.id !== funnel.id));
      toast.success(`Pipeline "${funnel.name}" excluído.`);
    } catch {
      toast.error("Erro ao excluir pipeline.");
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pipelines</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Visualize clientes por etapa do processo comercial.
          </p>
        </div>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Novo pipeline
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <CircularProgress />
        </div>
      ) : funnels.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
          <FilterAltIcon sx={{ fontSize: 48, opacity: 0.4 }} />
          <p className="text-sm">Nenhum pipeline criado ainda.</p>
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Criar primeiro pipeline
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {funnels.map((f) => (
            <div
              key={f.id}
              className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              onClick={() => router.push(`/${params.instance}/funnel/${f.id}`)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {f.type === "MANUAL" ? (
                    <PanToolAltIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
                  ) : (
                    <FilterAltIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
                  )}
                  <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{f.name}</p>
                  <Chip
                    label={f.type === "MANUAL" ? "Manual" : "Auto"}
                    size="small"
                    variant="outlined"
                    color={f.type === "MANUAL" ? "secondary" : "default"}
                    sx={{ fontSize: 10, height: 18, px: 0.5 }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Criado em {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Tooltip title="Configurar">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/${params.instance}/funnel/${f.id}/config`);
                    }}
                  >
                    <SettingsIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                  <span>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleDelete(f); }}
                      disabled={deletingId === f.id}
                    >
                      {deletingId === f.id ? (
                        <CircularProgress size={15} />
                      ) : (
                        <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Novo pipeline</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            autoFocus
            fullWidth
            label="Nome do pipeline"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Tipo</p>
            <ToggleButtonGroup
              value={newType}
              exclusive
              onChange={(_e, val: FunnelType | null) => { if (val) setNewType(val); }}
              size="small"
              fullWidth
            >
              <ToggleButton value="AUTOMATIC" sx={{ gap: 0.75, fontSize: 12 }}>
                <AutorenewIcon sx={{ fontSize: 15 }} />
                Automático
              </ToggleButton>
              <ToggleButton value="MANUAL" sx={{ gap: 0.75, fontSize: 12 }}>
                <PanToolAltIcon sx={{ fontSize: 15 }} />
                Manual
              </ToggleButton>
            </ToggleButtonGroup>
            <p className="mt-1 text-[11px] text-slate-400">
              {newType === "AUTOMATIC"
                ? "Clientes são classificados automaticamente por regras e condições."
                : "Você adiciona e move clientes manualmente entre as etapas."}
            </p>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? <CircularProgress size={18} color="inherit" /> : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}


export default function FunnelListPage() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const params = useParams<{ instance: string }>();

  const [funnels, setFunnels] = useState<FunnelDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await funnelApiService.listFunnels(token);
      setFunnels(data);
    } catch {
      toast.error("Não foi possível carregar os pipelines.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!token || !newName.trim()) return;
    setCreating(true);
    try {
      const created = await funnelApiService.createFunnel(token, newName.trim());
      setFunnels((prev) => [...prev, created]);
      setCreateOpen(false);
      setNewName("");
      toast.success(`Pipeline "${created.name}" criado.`);
    } catch {
      toast.error("Erro ao criar pipeline.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (funnel: FunnelDef) => {
    if (!token) return;
    setDeletingId(funnel.id);
    try {
      await funnelApiService.deleteFunnel(token, funnel.id);
      setFunnels((prev) => prev.filter((f) => f.id !== funnel.id));
      toast.success(`Pipeline "${funnel.name}" excluído.`);
    } catch {
      toast.error("Erro ao excluir pipeline.");
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pipelines</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Visualize clientes por etapa do processo comercial.
          </p>
        </div>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Novo pipeline
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <CircularProgress />
        </div>
      ) : funnels.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
          <FilterAltIcon sx={{ fontSize: 48, opacity: 0.4 }} />
          <p className="text-sm">Nenhum pipeline criado ainda.</p>
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Criar primeiro pipeline
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {funnels.map((f) => (
            <div
              key={f.id}
              className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              onClick={() => router.push(`/${params.instance}/funnel/${f.id}`)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FilterAltIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
                  <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{f.name}</p>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Criado em {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Tooltip title="Configurar">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/${params.instance}/funnel/${f.id}/config`);
                    }}
                  >
                    <SettingsIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                  <span>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleDelete(f); }}
                      disabled={deletingId === f.id}
                    >
                      {deletingId === f.id ? (
                        <CircularProgress size={15} />
                      ) : (
                        <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Novo pipeline</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Nome do pipeline"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? <CircularProgress size={18} color="inherit" /> : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
