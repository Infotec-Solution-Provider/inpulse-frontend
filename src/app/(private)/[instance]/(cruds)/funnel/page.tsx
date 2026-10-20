"use client";

import { CrmPage, CrmFilters, useCrmQueryState } from "@/lib/ui-system";
import { useCallback, useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Add as AddIcon } from "@/lib/ui-system/crm-icons";
import { Autorenew as AutorenewIcon } from "@/lib/ui-system/crm-icons";
import { DeleteOutline as DeleteOutlineIcon } from "@/lib/ui-system/crm-icons";
import { FilterAlt as FilterAltIcon } from "@/lib/ui-system/crm-icons";
import { PanToolAlt as PanToolAltIcon } from "@/lib/ui-system/crm-icons";
import { ArrowForward as ArrowForwardIcon } from "@/lib/ui-system/crm-icons";
import { ViewKanbanOutlined as ViewKanbanOutlinedIcon } from "@/lib/ui-system/crm-icons";
import { Settings as SettingsIcon } from "@/lib/ui-system/crm-icons";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
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

  const [filters, setFilters] = useCrmQueryState<Record<string, string>>("pipelines-list", {});
  const filtered = funnels.filter(
    (f) =>
      (!filters.name || f.name.toLocaleLowerCase().includes(filters.name.toLocaleLowerCase())) &&
      (!filters.type || f.type === filters.type),
  );
  return (
    <CrmPage
      title="Pipelines"
      description="Organize oportunidades e acompanhe as etapas da jornada comercial."
      count={loading ? undefined : filtered.length}
      breadcrumbs={[{ label: "Pipelines" }]}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Novo pipeline
        </Button>
      }
    >
      <CrmFilters
        values={filters}
        onApply={setFilters}
        onRefresh={load}
        loading={loading}
        fields={[
          { key: "name", label: "Nome" },
          {
            key: "type",
            label: "Tipo",
            options: [
              { value: "MANUAL", label: "Manual" },
              { value: "AUTOMATIC", label: "Automático" },
            ],
          },
        ]}
      />
      <div className="ip-crud-record-list">
        {loading ? (
          <div className="flex min-h-64 flex-1 items-center justify-center">
            <CircularProgress />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-80 flex-1 items-center justify-center">
            <div className="flex max-w-sm flex-col items-center rounded-2xl border border-dashed border-[var(--ip-border)] bg-[var(--ip-surface)] px-8 py-10 text-center shadow-none">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-950/50 dark:text-blue-300">
                <ViewKanbanOutlinedIcon sx={{ fontSize: 30 }} />
              </div>
              <p className="font-semibold text-[var(--ip-text)]">Crie seu primeiro pipeline</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ip-muted)]">
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
          <div className="ip-crud-record-list">
            {filtered.map((f) => (
              <div
                key={f.id}
                role="link"
                tabIndex={0}
                className="ip-crud-record group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--ip-accent)]"
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
                <div className="grid min-w-0 gap-3 lg:grid-cols-[2fr_2fr_1fr] lg:items-center">
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
                        <p className="truncate font-semibold text-[var(--ip-text)]">{f.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--ip-muted)]">
                          Criado em {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
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

                  <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-[var(--ip-muted)]">
                    {f.type === "MANUAL"
                      ? "Mova clientes livremente entre as etapas do processo."
                      : "Classifique clientes automaticamente usando regras e condições."}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3">
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
            <p className="mb-1.5 text-xs font-medium text-[var(--ip-muted)]">Tipo</p>
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
            <p className="mt-1 text-[11px] text-[var(--ip-muted)]">
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
          <p className="text-sm leading-relaxed text-[var(--ip-text)]">
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
    </CrmPage>
  );
}
