'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { GeneratedReportRenderer } from '@/components/reports/GeneratedReportRenderer';
import { copyGeneratedReport, executeGeneratedReport, exportGeneratedReport, getGeneratedReport, saveGeneratedReport, updateGeneratedReportLayout } from '@/lib/reports/api';
import type { GeneratedReportArtifact, GeneratedReportBlock, GeneratedReportExecution, GeneratedReportFilter } from '@/types/generated-reports';

function initialFilters(report: GeneratedReportArtifact): Record<string, unknown> {
  return Object.fromEntries(report.filters.filter((filter) => filter.defaultValue !== undefined).map((filter) => [filter.id, filter.defaultValue]));
}

function FilterField({ filter, value, onChange }: { filter: GeneratedReportFilter; value: unknown; onChange: (value: unknown) => void }) {
  if (filter.type === 'date_range') {
    const range = typeof value === 'object' && value ? value as { start?: string; end?: string } : {};
    return <div className="grid grid-cols-2 gap-2"><TextField label={`${filter.label} · início`} type="date" value={range.start ?? ''} onChange={(event) => onChange({ ...range, start: event.target.value })} InputLabelProps={{ shrink: true }} required={filter.required} /><TextField label={`${filter.label} · fim`} type="date" value={range.end ?? ''} onChange={(event) => onChange({ ...range, end: event.target.value })} InputLabelProps={{ shrink: true }} required={filter.required} /></div>;
  }
  if (filter.type === 'boolean') return <FormControlLabel control={<Checkbox checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />} label={filter.label} />;
  if (filter.options?.length) {
    const multiple = filter.type === 'multiselect' || filter.type === 'operator' || filter.type === 'sector';
    const selected = multiple ? filter.options.filter((option) => Array.isArray(value) && value.includes(option.value)) : filter.options.find((option) => option.value === value) ?? null;
    return <Autocomplete multiple={multiple} options={filter.options} value={selected as never} onChange={(_event, option) => onChange(multiple ? (option as typeof filter.options).map((item) => item.value) : (option as typeof filter.options[number] | null)?.value)} getOptionLabel={(option) => String((option as typeof filter.options[number]).label)} renderInput={(params) => <TextField {...params} label={filter.label} required={filter.required} />} />;
  }
  const inputType = filter.type === 'number' || ['operator', 'sector', 'customer', 'chat'].includes(filter.type) ? 'number' : 'text';
  const helper = filter.type === 'customer' ? 'Busque pelo código do cliente' : filter.type === 'chat' ? 'Informe a conversa' : filter.type === 'operator' ? 'Informe o operador' : filter.type === 'sector' ? 'Informe o setor' : undefined;
  return <TextField label={filter.label} type={inputType} value={value ?? ''} onChange={(event) => onChange(inputType === 'number' && event.target.value ? Number(event.target.value) : event.target.value)} required={filter.required} helperText={helper} fullWidth />;
}

export default function GeneratedReportPage() {
  const { instance, reportId } = useParams<{ instance: string; reportId: string }>();
  const router = useRouter();
  const [artifact, setArtifact] = useState<GeneratedReportArtifact | null>(null);
  const [execution, setExecution] = useState<GeneratedReportExecution | null>(null);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [blocks, setBlocks] = useState<GeneratedReportBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const layoutChanged = useMemo(() => artifact ? JSON.stringify(blocks) !== JSON.stringify(artifact.blocks) : false, [artifact, blocks]);

  useEffect(() => {
    void getGeneratedReport(reportId).then(async (report) => {
      setArtifact(report); setBlocks(report.blocks); const values = initialFilters(report); setFilters(values);
      const result = await executeGeneratedReport(reportId, values); setExecution(result);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Falha ao carregar relatório.')).finally(() => setLoading(false));
  }, [reportId]);

  const applyFilters = async () => {
    setRunning(true); setError(null);
    try { const result = await executeGeneratedReport(reportId, filters); setExecution(result); setArtifact(result.artifact); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao executar relatório.'); }
    finally { setRunning(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      let report = artifact;
      if (artifact?.status === 'DRAFT') report = await saveGeneratedReport(reportId);
      if (report?.status === 'SAVED' && layoutChanged) report = await updateGeneratedReportLayout(reportId, blocks);
      if (report) { setArtifact(report); setBlocks(report.blocks); }
      toast.success('Relatório salvo para os supervisores do tenant.');
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Falha ao salvar relatório.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><CircularProgress /></div>;
  if (!artifact || !execution) return <div className="p-6"><Alert severity="error">{error ?? 'Relatório não encontrado.'}</Alert></div>;

  return <div className="mx-auto flex max-w-[1600px] flex-col gap-5 p-4 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><Button startIcon={<ArrowBackIcon />} onClick={() => router.back()}>Voltar</Button><div className="mt-2 flex items-center gap-2"><Typography variant="h4" fontWeight={800}>{artifact.title}</Typography><Chip size="small" color={artifact.status === 'SAVED' ? 'success' : 'default'} label={artifact.status === 'SAVED' ? 'Salvo' : 'Rascunho privado'} /></div>{artifact.description && <Typography color="text.secondary">{artifact.description}</Typography>}<Typography variant="caption" color="text.secondary">Atualizado em {new Date(execution.executedAt).toLocaleString('pt-BR')} · {execution.durationMs} ms</Typography></div>
      <div className="flex flex-wrap gap-2"><Button startIcon={<DownloadIcon />} onClick={() => void exportGeneratedReport(reportId, { format: 'pdf', filters })}>PDF</Button><Button startIcon={<ContentCopyIcon />} onClick={() => void copyGeneratedReport(reportId).then((copy) => router.push(`/${instance}/reports/generated/${copy.id}`))}>Salvar cópia</Button><Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} disabled={saving} onClick={save}>{artifact.status === 'DRAFT' ? 'Salvar relatório' : layoutChanged ? 'Salvar alterações' : 'Salvo'}</Button></div>
    </div>
    {artifact.summary && <Card variant="outlined"><CardContent><Typography variant="overline" color="primary">Resumo executivo</Typography><Typography>{artifact.summary}</Typography></CardContent></Card>}
    <Card variant="outlined"><CardContent><div className="mb-4 flex items-center justify-between"><Typography fontWeight={700}>Filtros</Typography><Button variant="contained" startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />} disabled={running} onClick={applyFilters}>Aplicar filtros</Button></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{artifact.filters.map((filter) => <FilterField key={filter.id} filter={filter} value={filters[filter.id]} onChange={(value) => setFilters((current) => ({ ...current, [filter.id]: value }))} />)}</div></CardContent></Card>
    {error && <Alert severity="error">{error}</Alert>}
    <GeneratedReportRenderer execution={execution} blocks={blocks} editable onBlocksChange={setBlocks} onExportPng={(block) => exportGeneratedReport(reportId, { format: 'png', filters, blockId: block.id })} />
    <div className="grid gap-4 md:grid-cols-3">{artifact.findings.length > 0 && <Card variant="outlined"><CardContent><Typography fontWeight={700}>Achados</Typography><ul className="list-disc pl-5">{artifact.findings.map((item) => <li key={item}>{item}</li>)}</ul></CardContent></Card>}{artifact.limitations.length > 0 && <Card variant="outlined"><CardContent><Typography fontWeight={700}>Limitações</Typography><ul className="list-disc pl-5">{artifact.limitations.map((item) => <li key={item}>{item}</li>)}</ul></CardContent></Card>}{artifact.sources.length > 0 && <Card variant="outlined"><CardContent><Typography fontWeight={700}>Fontes</Typography><ul className="list-disc pl-5">{artifact.sources.map((item) => <li key={item}>{item}</li>)}</ul></CardContent></Card>}</div>
    <Card variant="outlined"><CardContent><Typography fontWeight={700} className="mb-2">Exportar dataset</Typography><div className="flex flex-wrap gap-2">{artifact.datasets.map((dataset) => <Button key={dataset.id} size="small" variant="outlined" onClick={() => void exportGeneratedReport(reportId, { format: 'csv', filters, datasetId: dataset.id })}>{dataset.label} · CSV</Button>)}</div></CardContent></Card>
  </div>;
}
