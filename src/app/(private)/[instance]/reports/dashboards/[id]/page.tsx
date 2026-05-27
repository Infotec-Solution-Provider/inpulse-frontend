'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getDashboard,
  getMetrics,
  addDashboardItem,
  removeDashboardItem,
} from '@/lib/reports/api';
import { useDashboardExecution } from '@/lib/hooks/useDashboardExecution';
import { MetricVisualizer } from '@/components/reports/MetricVisualizer';
import { Dashboard, Metric } from '@/types/reports';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

export default function DashboardViewPage() {
  const { instance, id } = useParams<{ instance: string; id: string }>();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [availableMetrics, setAvailableMetrics] = useState<Metric[]>([]);
  const [selectedMetricId, setSelectedMetricId] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { results, running, execute } = useDashboardExecution(id);

  const reload = () =>
    getDashboard(id)
      .then(setDashboard)
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
    setSelectedMetricId('');
    if (availableMetrics.length === 0) {
      const data = await getMetrics().catch(() => [] as Metric[]);
      setAvailableMetrics(data);
    }
  };

  const handleAdd = async () => {
    if (!selectedMetricId || !dashboard) return;
    setSaving(true);
    try {
      const nextPosition = (dashboard.items?.length ?? 0);
      await addDashboardItem(dashboard.id, selectedMetricId, nextPosition);
      setAddOpen(false);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!dashboard) return;
    if (!confirm('Remover esta métrica do dashboard?')) return;
    setRemovingId(itemId);
    try {
      await removeDashboardItem(dashboard.id, itemId);
      await reload();
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center mt-24">
        <CircularProgress />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-6">
        <Typography color="error">Dashboard não encontrado.</Typography>
      </div>
    );
  }

  const sortedItems = [...(dashboard.items ?? [])].sort((a, b) => a.position - b.position);
  const metricsMap = new Map<string, Metric>(
    (dashboard.items ?? []).map((item) => [item.metricId, item.metric as Metric])
  );

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h5" fontWeight={700}>{dashboard.name}</Typography>
          {dashboard.description && (
            <Typography variant="body2" color="text.secondary">{dashboard.description}</Typography>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
          >
            Adicionar métrica
          </Button>
          <Button
            variant="contained"
            startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
            onClick={() => execute()}
            disabled={running}
          >
            {running ? 'Executando...' : 'Executar'}
          </Button>
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-16 gap-3 text-gray-400">
          <Typography>Nenhuma métrica adicionada a este dashboard.</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
            Adicionar métrica
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedItems.map((item) => {
            const metric = metricsMap.get(item.metricId);
            if (!metric) return null;
            const result = results[item.metricId];
            return (
              <div key={item.id} className="relative group">
                <Tooltip title="Remover do dashboard">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemove(item.id)}
                    disabled={removingId === item.id}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      zIndex: 1,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      opacity: 0,
                      transition: 'opacity 0.15s',
                      '.group:hover &': { opacity: 1 },
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
                  status={result?.status ?? 'pending'}
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
                ? 'Nenhuma métrica criada ainda. Cadastre uma em Métricas → Nova Métrica.'
                : 'Todas as métricas disponíveis já estão neste dashboard.'}
            </Typography>
          ) : (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="metric-select-label">Métrica</InputLabel>
              <Select
                labelId="metric-select-label"
                label="Métrica"
                value={selectedMetricId}
                onChange={(e) => setSelectedMetricId(e.target.value)}
              >
                {selectableMetrics.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      ({m.tableName} · {m.aggregation})
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!selectedMetricId || saving}
          >
            {saving ? <CircularProgress size={18} /> : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
