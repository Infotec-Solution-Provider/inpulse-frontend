"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AddIcon from "@mui/icons-material/Add";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import PanToolAltIcon from "@mui/icons-material/PanToolAlt";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
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
  const [funnelToDelete, setFunnelToDelete] = useState<FunnelDef | null>(null);

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

  useEffect(() => {
    load();
  }, [load]);

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
      setFunnelToDelete(null);
      toast.success(`Pipeline "${funnel.name}" excluído.`);
    } catch {
      toast.error("Erro ao excluir pipeline.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50/70 dark:bg-slate-950/30">
      <div className="border-b border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              <ViewKanbanOutlinedIcon />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Pipelines
                </h1>
                {!loading && funnels.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {funnels.length}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Organize oportunidades e acompanhe cada etapa da jornada comercial.
              </p>
            </div>
          </div>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              alignSelf: { xs: "stretch", sm: "center" },
              borderRadius: 2,
              textTransform: "none",
            }}
          >
            Novo pipeline
          </Button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-6">
        {loading ? (
          <div className="flex min-h-64 flex-1 items-center justify-center">
            <CircularProgress />
          </div>
        ) : funnels.length === 0 ? (
          <div className="flex min-h-80 flex-1 items-center justify-center">
            <div className="flex max-w-sm flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-950/50 dark:text-blue-300">
                <ViewKanbanOutlinedIcon sx={{ fontSize: 30 }} />
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                Crie seu primeiro pipeline
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Separe clientes por etapas e tenha uma visão clara do andamento de cada
                oportunidade.
              </p>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                sx={{ mt: 2.5, textTransform: "none" }}
              >
                Criar pipeline
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {funnels.map((f) => (
              <div
                key={f.id}
                role="link"
                tabIndex={0}
                className="group relative flex min-h-44 cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:shadow-black/20"
                onClick={() => router.push(`/${params.instance}/funnel/${f.id}`)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/${params.instance}/funnel/${f.id}`);
                  }
                }}
              >
                <div
                  className={`h-1 w-full ${f.type === "MANUAL" ? "bg-violet-500" : "bg-blue-500"}`}
                />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${f.type === "MANUAL" ? "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300" : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"}`}
                      >
                        {f.type === "MANUAL" ? (
                          <PanToolAltIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <AutorenewIcon sx={{ fontSize: 19 }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                          {f.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Criado em {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      <Tooltip title="Configurar">
                        <IconButton
                          size="small"
                          aria-label={`Configurar ${f.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/${params.instance}/funnel/${f.id}/config`);
                          }}
                        >
                          <SettingsIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          aria-label={`Excluir ${f.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFunnelToDelete(f);
                          }}
                          sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {f.type === "MANUAL"
                      ? "Mova clientes livremente entre as etapas do processo."
                      : "Classifique clientes automaticamente usando regras e condições."}
                  </p>

                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <Chip
                      label={f.type === "MANUAL" ? "Manual" : "Automático"}
                      size="small"
                      icon={f.type === "MANUAL" ? <PanToolAltIcon /> : <FilterAltIcon />}
                      sx={{ height: 24, fontSize: 11, fontWeight: 600 }}
                    />
                    <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-transform group-hover:translate-x-0.5 dark:text-blue-400">
                      Abrir quadro
                      <ArrowForwardIcon sx={{ fontSize: 15 }} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Novo pipeline</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}
        >
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
              onChange={(_event, value: FunnelType | null) => {
                if (value) setNewType(value);
              }}
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
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? <CircularProgress size={18} color="inherit" /> : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(funnelToDelete)}
        onClose={() => {
          if (deletingId === null) setFunnelToDelete(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Excluir pipeline?</DialogTitle>
        <DialogContent>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            O pipeline <strong>“{funnelToDelete?.name}”</strong> e sua configuração serão excluídos.
            Essa ação não pode ser desfeita.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFunnelToDelete(null)} disabled={deletingId !== null}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => funnelToDelete && handleDelete(funnelToDelete)}
            disabled={deletingId !== null}
          >
            {deletingId !== null ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              "Excluir pipeline"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
