'use client';

import { useEffect, useState } from 'react';
import { getMetrics, deleteMetric } from '@/lib/reports/api';
import { Metric } from '@/types/reports';
import { useParams, useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const VIZ_LABELS: Record<string, string> = {
  bar: 'Barra',
  line: 'Linha',
  pie: 'Pizza',
  table: 'Tabela',
  card: 'Card',
};

export default function MetricsPage() {
  const { instance } = useParams<{ instance: string }>();
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await getMetrics().catch(() => [] as Metric[]);
    setMetrics(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta métrica?')) return;
    await deleteMetric(id).catch(() => null);
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Typography variant="h5" fontWeight={700}>Métricas</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push(`/${instance}/reports/metrics/new`)}
        >
          Nova Métrica
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center mt-16"><CircularProgress /></div>
      ) : metrics.length === 0 ? (
        <div className="flex justify-center mt-16 text-gray-400">
          <Typography>Nenhuma métrica criada ainda.</Typography>
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Tabela</TableCell>
              <TableCell>Agregação</TableCell>
              <TableCell>Coluna</TableCell>
              <TableCell>Visualização</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {metrics.map((m) => (
              <TableRow key={m.id} hover>
                <TableCell>{m.name}</TableCell>
                <TableCell><code>{m.tableName}</code></TableCell>
                <TableCell>{m.aggregation.toUpperCase()}</TableCell>
                <TableCell>{m.column}</TableCell>
                <TableCell>
                  <Chip
                    label={VIZ_LABELS[m.visualizationType] ?? m.visualizationType}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(m.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
