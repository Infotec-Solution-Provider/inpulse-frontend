'use client';

import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { listGeneratedReports } from '@/lib/reports/api';
import type { GeneratedReportArtifact } from '@/types/generated-reports';

export default function GeneratedReportsPage() {
  const { instance } = useParams<{ instance: string }>();
  const router = useRouter();
  const [reports, setReports] = useState<GeneratedReportArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void listGeneratedReports().then(setReports).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Falha ao listar relatórios.')).finally(() => setLoading(false)); }, []);
  return <div className="mx-auto max-w-7xl p-4 md:p-6"><div className="mb-6"><Typography variant="h4" fontWeight={800}>Relatórios gerados</Typography><Typography color="text.secondary">Relatórios salvos do tenant e seus rascunhos privados.</Typography></div>{loading ? <div className="flex justify-center p-16"><CircularProgress /></div> : error ? <Alert severity="error">{error}</Alert> : reports.length === 0 ? <Alert severity="info">Nenhum relatório visual foi gerado ainda.</Alert> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reports.map((report) => <Card key={report.id} variant="outlined"><CardActionArea onClick={() => router.push(`/${instance}/reports/generated/${report.id}`)}><CardContent><div className="mb-3 flex items-center justify-between"><AssessmentOutlinedIcon color="primary" /><Chip size="small" color={report.status === 'SAVED' ? 'success' : 'default'} label={report.status === 'SAVED' ? 'Salvo' : 'Rascunho'} /></div><Typography fontWeight={700}>{report.title}</Typography><Typography variant="body2" color="text.secondary" className="line-clamp-2">{report.description || report.summary || 'Sem descrição.'}</Typography><Typography variant="caption" color="text.secondary">Atualizado em {new Date(report.updatedAt).toLocaleString('pt-BR')}</Typography></CardContent></CardActionArea></Card>)}</div>}</div>;
}
