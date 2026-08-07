'use client';

import { useEffect, useState } from 'react';
import { getDashboards, createDashboard } from '@/lib/reports/api';
import { Dashboard } from '@/types/reports';
import { useParams, useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';

export default function DashboardsPage() {
  const { instance } = useParams<{ instance: string }>();
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getDashboards().catch(() => [] as Dashboard[]);
    setDashboards(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const created = await createDashboard({ name: name.trim(), description: description.trim() || undefined });
    setCreating(false);
    setDialogOpen(false);
    setName('');
    setDescription('');
    router.push(`/${instance}/reports/dashboards/${created.id}`);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Typography variant="h5" fontWeight={700}>Dashboards</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Novo Dashboard
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center mt-16"><CircularProgress /></div>
      ) : dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 gap-3 text-gray-400">
          <DashboardIcon sx={{ fontSize: 64 }} />
          <Typography variant="body1">Nenhum dashboard criado ainda.</Typography>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((d) => (
            <Card key={d.id} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600}>{d.name}</Typography>
                {d.description && (
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {d.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.disabled" mt={1} display="block">
                  {d.items?.length ?? 0} métrica(s)
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => router.push(`/${instance}/reports/dashboards/${d.id}`)}
                >
                  Abrir
                </Button>
              </CardActions>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo Dashboard</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
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
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!name.trim() || creating}
          >
            {creating ? <CircularProgress size={18} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
