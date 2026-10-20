"use client";
import { CrmPage, CrmFilters, useCrmQueryState } from "@/lib/ui-system";

import { useEffect, useState } from "react";
import { getDashboards, createDashboard } from "@/lib/reports/api";
import { Dashboard } from "@/types/reports";
import { useParams, useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CircularProgress from "@mui/material/CircularProgress";
import { Add as AddIcon } from "@/lib/ui-system/crm-icons";
import { Dashboard as DashboardIcon } from "@/lib/ui-system/crm-icons";

export default function DashboardsPage() {
  const { instance } = useParams<{ instance: string }>();
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getDashboards().catch(() => [] as Dashboard[]);
    setDashboards(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const created = await createDashboard({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setCreating(false);
    setDialogOpen(false);
    setName("");
    setDescription("");
    router.push(`/${instance}/reports/dashboards/${created.id}`);
  };

  const [filters, setFilters] = useCrmQueryState<Record<string, string>>(
    "report-dashboards-list",
    {},
  );
  const filtered = dashboards.filter(
    (d) => !filters.name || d.name.toLocaleLowerCase().includes(filters.name.toLocaleLowerCase()),
  );
  return (
    <CrmPage
      title="Dashboards"
      description="Organize os painéis e suas métricas."
      count={loading ? undefined : filtered.length}
      breadcrumbs={[{ label: "Relatórios" }, { label: "Dashboards" }]}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Novo dashboard
        </Button>
      }
    >
      <CrmFilters
        fields={[{ key: "name", label: "Nome" }]}
        values={filters}
        onApply={setFilters}
        onRefresh={() => void load()}
        loading={loading}
      />
      {loading ? (
        <div className="ip-crud-state">
          <CircularProgress size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="ip-crud-record ip-crud-state">Nenhum dashboard encontrado.</div>
      ) : (
        <div className="ip-crud-record-list">
          {filtered.map((d) => (
            <article
              key={d.id}
              className="ip-crud-record flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <h2>{d.name}</h2>
                {d.description && <p className="text-sm text-[var(--ip-muted)]">{d.description}</p>}
                {d.items && (
                  <p className="text-xs text-[var(--ip-muted)]">{d.items.length} métrica(s)</p>
                )}
              </div>
              <Button
                variant="outlined"
                onClick={() => router.push(`/${instance}/reports/dashboards/${d.id}`)}
              >
                Abrir
              </Button>
            </article>
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo Dashboard</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <TextField
            required
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!name.trim() || creating}>
            {creating ? <CircularProgress size={18} /> : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>
    </CrmPage>
  );
}
