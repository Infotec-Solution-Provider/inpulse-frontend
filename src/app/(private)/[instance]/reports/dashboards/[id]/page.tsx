"use client";
import { Alert, Autocomplete, TextField } from "@mui/material";
import Link from "next/link";
import { ReportPageShell } from "@/components/reports/ReportWorkflow";
import { ReportFormControls, ReportQueryStatus } from "@/components/reports/ReportFormControls";
import { reportPeriodLabel } from "@/lib/reports/filters";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getDashboard, getMetrics, addDashboardItem, removeDashboardItem } from "@/lib/reports/api";
import { useDashboardExecution } from "@/lib/hooks/useDashboardExecution";
import { MetricVisualizer } from "@/components/reports/MetricVisualizer";
import { Dashboard, Metric } from "@/types/reports";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Tooltip from "@mui/material/Tooltip";
import { Add as AddIcon } from "@/lib/ui-system/crm-icons";
import { Delete as DeleteIcon } from "@/lib/ui-system/crm-icons";

export default function DashboardViewPage() {
  const { instance, id } = useParams<{ instance: string; id: string }>();
  return <DashboardViewContent key={instance + ":" + id} instance={instance} id={id} />;
}

function DashboardViewContent({ instance, id }: { instance: string; id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [availableMetrics, setAvailableMetrics] = useState<Metric[]>([]);
  const [selectedMetricId, setSelectedMetricId] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const metricsIds = (dashboard?.items ?? []).map((item) => item.metricId);
  const form = useDashboardExecution(
    instance + ":" + id + ":" + metricsIds.join(","),
    id,
    metricsIds,
  );

  const reload = () =>
    getDashboard(id)
      .then(setDashboard)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Falha ao carregar o painel."),
      )
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const existingMetricIds = useMemo(
    () => new Set((dashboard?.items ?? []).map((it) => it.metricId)),
    [dashboard],
  );

  const selectableMetrics = useMemo(
    () => availableMetrics.filter((m) => !existingMetricIds.has(m.id)),
    [availableMetrics, existingMetricIds],
  );

  const openAddDialog = async () => {
    setAddOpen(true);
    setSelectedMetricId("");
    if (availableMetrics.length === 0) {
      const data = await getMetrics().catch(() => [] as Metric[]);
      setAvailableMetrics(data);
    }
  };

  const handleAdd = async () => {
    if (!selectedMetricId || !dashboard) return;
    setSaving(true);
    try {
      const nextPosition = dashboard.items?.length ?? 0;
      await addDashboardItem(dashboard.id, selectedMetricId, nextPosition);
      setAddOpen(false);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!dashboard) return;
    if (!confirm("Remover esta métrica do dashboard?")) return;
    setRemovingId(itemId);
    try {
      await removeDashboardItem(dashboard.id, itemId);
      await reload();
    } finally {
      setRemovingId(null);
    }
  };

  if (loading || !dashboard) {
    return (
      <ReportPageShell
        instance={instance}
        category="Painéis e métricas"
        title="Painel personalizado"
      >
        <Alert severity={loading ? "info" : "error"}>
          {loading ? "Carregando painel…" : (error ?? "Painel não encontrado.")}
        </Alert>
      </ReportPageShell>
    );
  }

  const sortedItems = [...(dashboard.items ?? [])].sort((a, b) => a.position - b.position);
  const metricsMap = new Map<string, Metric>(
    (dashboard.items ?? []).map((item) => [item.metricId, item.metric as Metric]),
  );

  return (
    <ReportPageShell
      instance={instance}
      category="Painéis e métricas"
      title={dashboard.name}
      description={dashboard.description ?? undefined}
      actions={
        <>
          <Button component={Link} href={"/" + instance + "/reports/dashboards"}>
            Ver painéis
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
            disabled={form.loading}
          >
            Adicionar métrica
          </Button>
        </>
      }
    >
      {error && <Alert severity="error">{error}</Alert>}
      {sortedItems.length > 0 && (
        <>
          <ReportFormControls form={form} period={form.draft} setPeriod={form.setDraft} />
          <ReportQueryStatus
            query={form}
            labels={form.applied ? [reportPeriodLabel(form.applied)] : []}
          />
        </>
      )}
      {sortedItems.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Typography>Nenhuma métrica adicionada a este dashboard.</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
            Adicionar métrica
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedItems.map((item) => {
            const metric = metricsMap.get(item.metricId);
            if (!metric) return null;
            const result = form.result?.[item.metricId];
            return (
              <div key={item.id} className="group relative">
                <Tooltip title="Remover do dashboard">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemove(item.id)}
                    disabled={removingId === item.id || form.loading}
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      zIndex: 1,
                      bgcolor: "background.paper",
                      boxShadow: 1,
                      opacity: 0,
                      transition: "opacity 0.15s",
                      ".group:hover &, .group:focus-within &": { opacity: 1 },
                    }}
                  >
                    {removingId === item.id ? (
                      <CircularProgress size={14} />
                    ) : (
                      <DeleteIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
                <MetricVisualizer
                  metric={metric}
                  status={
                    result
                      ? result.status === "completed"
                        ? "done"
                        : "failed"
                      : form.loading
                        ? "pending"
                        : "idle"
                  }
                  data={result?.data}
                  error={result?.error}
                />
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Adicionar métrica ao dashboard</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectableMetrics.length === 0 ? (
            <Typography color="text.secondary">
              {availableMetrics.length === 0
                ? "Nenhuma métrica criada ainda. Cadastre uma em Métricas → Nova Métrica."
                : "Todas as métricas disponíveis já estão neste dashboard."}
            </Typography>
          ) : (
            <Autocomplete
              size="small"
              sx={{ mt: 1 }}
              options={selectableMetrics}
              value={selectableMetrics.find((metric) => metric.id === selectedMetricId) ?? null}
              getOptionLabel={(metric) => metric.name + " · " + metric.tableName}
              getOptionKey={(metric) => metric.id}
              onChange={(_, metric) => setSelectedMetricId(metric?.id ?? "")}
              renderInput={(params) => <TextField {...params} label="Pesquisar métrica" />}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!selectedMetricId || saving}>
            {saving ? <CircularProgress size={18} /> : "Adicionar"}
          </Button>
        </DialogActions>
      </Dialog>
    </ReportPageShell>
  );
}
