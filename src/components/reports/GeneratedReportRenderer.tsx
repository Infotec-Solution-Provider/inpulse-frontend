'use client';

import { DndContext, type DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DownloadIcon from '@mui/icons-material/Download';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import type { GeneratedReportBlock, GeneratedReportBlockType, GeneratedReportExecution } from '@/types/generated-reports';

const COLORS = ['#6750A4', '#2E7D32', '#0288D1', '#ED6C02', '#D32F2F', '#7B1FA2', '#00897B', '#5D4037', '#455A64', '#C2185B', '#689F38', '#F9A825'];

function formatValue(value: unknown, format?: GeneratedReportBlock['format']): string {
  if (value === null || value === undefined) return '—';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (format === 'currency' && Number.isFinite(numeric)) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
  if (format === 'percent' && Number.isFinite(numeric)) return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 }).format(numeric / 100);
  if (format === 'number' && Number.isFinite(numeric)) return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(numeric);
  if (format === 'duration' && Number.isFinite(numeric)) return `${Math.floor(numeric / 60)} min ${Math.round(numeric % 60)} s`;
  if (format === 'date') return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(String(value)));
  return String(value);
}

function DraggableBlock({ block, children, editable }: { block: GeneratedReportBlock; children: React.ReactNode; editable: boolean }) {
  const draggable = useDraggable({ id: block.id, disabled: !editable });
  const droppable = useDroppable({ id: block.id, disabled: !editable });
  const style = { transform: DndCSS.Translate.toString(draggable.transform), opacity: draggable.isDragging ? 0.55 : 1 };
  return (
    <div ref={(node) => { draggable.setNodeRef(node); droppable.setNodeRef(node); }} style={style} className="relative min-w-0" data-report-block={block.id}>
      {editable && <IconButton size="small" {...draggable.attributes} {...draggable.listeners} sx={{ position: 'absolute', right: 8, top: 8, zIndex: 3, cursor: 'grab' }} aria-label="Reorganizar bloco"><DragIndicatorIcon fontSize="small" /></IconButton>}
      {children}
    </div>
  );
}

async function exportBlockPng(block: GeneratedReportBlock): Promise<void> {
  const root = document.querySelector(`[data-report-block="${window.CSS.escape(block.id)}"]`);
  const svg = root?.querySelector('svg');
  if (!svg) throw new Error('Este bloco não possui um gráfico exportável.');
  const serialized = new XMLSerializer().serializeToString(svg);
  const source = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }));
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Falha ao preparar o PNG.')); image.src = source; });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1000, image.width || 1000);
  canvas.height = Math.max(560, (image.height || 480) + 80);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas indisponível.');
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#172033'; context.font = 'bold 24px Arial'; context.fillText(block.title, 24, 40);
  context.drawImage(image, 0, 70, canvas.width, canvas.height - 80);
  URL.revokeObjectURL(source);
  const anchor = document.createElement('a');
  anchor.download = `${block.title.replace(/[^a-z0-9_-]+/gi, '-')}.png`;
  anchor.href = canvas.toDataURL('image/png');
  anchor.click();
}

export function GeneratedReportRenderer({ execution, blocks, editable = false, onBlocksChange, onExportPng }: { execution: GeneratedReportExecution; blocks: GeneratedReportBlock[]; editable?: boolean; onBlocksChange?: (blocks: GeneratedReportBlock[]) => void; onExportPng?: (block: GeneratedReportBlock) => Promise<void> }) {
  const datasets = useMemo(() => new Map(execution.datasets.map((dataset) => [dataset.id, dataset])), [execution.datasets]);
  const sorted = useMemo(() => [...blocks].sort((a, b) => a.position - b.position), [blocks]);

  const updateBlock = (id: string, type: GeneratedReportBlockType) => onBlocksChange?.(sorted.map((block) => block.id === id ? { ...block, type } : block));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = sorted.findIndex((block) => block.id === active.id);
    const to = sorted.findIndex((block) => block.id === over.id);
    if (from < 0 || to < 0) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(from, 1);
    if (!moved) return;
    reordered.splice(to, 0, moved);
    onBlocksChange?.(reordered.map((block, position) => ({ ...block, position })));
  };

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sorted.map((block) => {
          const dataset = datasets.get(block.datasetId);
          const rows = dataset?.rows ?? [];
          const columns = block.columns?.length ? block.columns : dataset?.columns ?? [];
          const hasChartMapping = Boolean(block.xKey && (block.yKeys?.length || block.valueKey));
          const effectiveType: GeneratedReportBlockType = ['bar', 'line', 'pie'].includes(block.type) && !hasChartMapping ? 'table' : block.type;
          const tableRows = rows.map((row, index) => ({ id: `${block.id}-${index}`, ...row }));
          const tableColumns: GridColDef[] = columns.map((column) => ({ field: column, headerName: column, minWidth: 130, flex: 1, valueFormatter: (value) => formatValue(value, block.format) }));
          return (
            <DraggableBlock block={block} editable={editable} key={block.id}>
              <Card variant="outlined" className={effectiveType === 'table' ? 'lg:col-span-2' : ''} sx={{ height: '100%' }}>
                <CardContent>
                  <div className="mb-3 flex items-center justify-between gap-3 pr-8">
                    <Typography fontWeight={700}>{block.title}</Typography>
                    <div className="flex items-center gap-1">
                      {editable && <FormControl size="small"><Select value={block.type} onChange={(event) => updateBlock(block.id, event.target.value as GeneratedReportBlockType)}><MenuItem value="table">Tabela</MenuItem><MenuItem value="bar">Barras</MenuItem><MenuItem value="line">Linhas</MenuItem><MenuItem value="pie">Pizza</MenuItem>{block.type === 'kpi' && <MenuItem value="kpi">KPI</MenuItem>}</Select></FormControl>}
                      {['bar', 'line', 'pie'].includes(effectiveType) && <Tooltip title="Exportar gráfico em PNG"><IconButton size="small" onClick={() => void (onExportPng ? onExportPng(block) : exportBlockPng(block))}><DownloadIcon fontSize="small" /></IconButton></Tooltip>}
                    </div>
                  </div>
                  {dataset?.error ? <Alert severity="error">{dataset.error}</Alert> : rows.length === 0 ? <Alert severity="info">Nenhum dado encontrado para os filtros aplicados.</Alert> : effectiveType === 'kpi' ? (
                    <Typography variant="h3" color="primary" fontWeight={800}>{formatValue(rows[0]?.[block.valueKey ?? columns[0] ?? ''], block.format)}</Typography>
                  ) : effectiveType === 'table' ? (
                    <div style={{ width: '100%', minHeight: 340 }}><DataGrid rows={tableRows} columns={tableColumns} initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }} pageSizeOptions={[10, 25, 50, 100]} disableRowSelectionOnClick density="compact" /></div>
                  ) : (
                    <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%">
                      {effectiveType === 'bar' ? <BarChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={block.xKey} /><YAxis /><ChartTooltip formatter={(value) => formatValue(value, block.format)} /><Legend />{(block.yKeys ?? [block.valueKey ?? 'value']).map((key, index) => <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />)}</BarChart>
                        : effectiveType === 'line' ? <LineChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={block.xKey} /><YAxis /><ChartTooltip formatter={(value) => formatValue(value, block.format)} /><Legend />{(block.yKeys ?? [block.valueKey ?? 'value']).map((key, index) => <Line key={key} dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={2} />)}</LineChart>
                          : <PieChart><Pie data={rows.slice(0, 12)} dataKey={block.valueKey ?? block.yKeys?.[0] ?? 'value'} nameKey={block.nameKey ?? block.xKey} label>{rows.slice(0, 12).map((_row, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><ChartTooltip formatter={(value) => formatValue(value, block.format)} /><Legend /></PieChart>}
                    </ResponsiveContainer></div>
                  )}
                  {dataset?.truncated && <Typography variant="caption" color="text.secondary">Resultado limitado pelos limites seguros do relatório.</Typography>}
                </CardContent>
              </Card>
            </DraggableBlock>
          );
        })}
      </div>
    </DndContext>
  );
}
